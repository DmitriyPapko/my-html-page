      /* ==== Entities ==== */
      let nextId = 1, simTime = 0;
      class Entity { constructor(x, y, owner = -1) { this.id = nextId++; this.x = x; this.y = y; this.owner = owner; this.hp = 100; this.maxHp = 100; this.dead = false; this.selected = false; this.radius = 16; this.lastHitBy = null; this.regen = 0; this.shield = 0; } damage(n, killerOwner = null) { if (n <= 0) return; const take = Math.min(this.shield, n); this.shield -= take; n -= take; if (n > 0) { this.hp -= n; if (killerOwner != null) this.lastHitBy = killerOwner; if (this.hp <= 0) { this.hp = 0; this.dead = true; this.onDeath && this.onDeath(this.lastHitBy); } } } }
      class Unit extends Entity {
        constructor(x, y, owner, type = 'worker') { super(x, y, owner); this.type = type; this.radius = 12; this.speed = 190; this.baseSpeed = 190; this.destX = x; this.destY = y; this.attackRange = 28; this.attackCd = 0; this.dps = 22; this.vision = 480; this.isHero = false; this.mp = 0; this.maxMp = 0; this.cd1 = 0; this.cd2 = 0; this.cd3 = 0; this.cdM1 = 8; this.cdM2 = 12; this.cdM3 = 20; this.heroClass = null; this.levelStacks = 0; this.inventory = []; this.targetId = null; this.role = null; this.state = 'idle'; this.workTimer = 0; this.carry = 0; this.speedBuff = 0; this.slow = 0; this.summonTimer = 0; this.retreat = false; this.regen = 0.25; }
        setDest(x, y) { this.destX = x; this.destY = y; this.state = 'move'; this.targetId = null; }
        setTarget(e) { this.targetId = e ? e.id : null; this.state = e ? 'fight' : 'move'; }
        thinkWorker(dt) {
          if (this.role !== 'rice' && this.role !== 'water') return;
          const P = players[this.owner]; const HQ = P.structures.find(s => s.kind === 'hq');
          const node = (this.role === 'rice' ? nearestNode('rice', P) : nearestNode('water', P));
          if (!HQ || !node) return;
          if (this.state === 'idle') { this.state = 'to_node'; this.destX = node.x + rand(-24, 24); this.destY = node.y + rand(-24, 24); }
          if (this.state === 'to_node') { const dx = this.destX - this.x, dy = this.destY - this.y, d = Math.hypot(dx, dy); if (d > 2) { const v = this.speed * (this.speedBuff ? 1.5 : 1.0) * (this.slow ? 0.6 : 1.0); const nx = this.x + dx / d * v * dt, ny = this.y + dy / d * v * dt; if (!isBlocked(nx, ny)) { this.x = nx; this.y = ny; } } else { this.state = 'harvest'; this.workTimer = (this.role === 'rice' ? 2.2 : 2.6); } }
          if (this.state === 'harvest') { this.workTimer -= dt; if (this.workTimer <= 0) { this.carry = (this.role === 'rice' ? 12 : 9); this.state = 'to_hq'; this.destX = HQ.x + rand(-32, 32); this.destY = HQ.y + rand(-32, 32); } }
          if (this.state === 'to_hq') { const dx = this.destX - this.x, dy = this.destY - this.y, d = Math.hypot(dx, dy); if (d > 2) { const v = this.speed * (this.speedBuff ? 1.5 : 1.0) * (this.slow ? 0.6 : 1.0); const nx = this.x + dx / d * v * dt, ny = this.y + dy / d * v * dt; if (!isBlocked(nx, ny)) { this.x = nx; this.y = ny; } } else { if (this.carry > 0) { if (this.role === 'rice') P.res.rice += this.carry; else P.res.water += this.carry; if (this.owner === 0) updateRes(); this.carry = 0; } this.state = 'to_node'; this.destX = node.x + rand(-24, 24); this.destY = node.y + rand(-24, 24); } }
        }
        update(dt) {
          if (this.dead) return;
          if (this.hp < this.maxHp) { this.hp = Math.min(this.maxHp, this.hp + this.regen * dt * 60); }
          this.cd1 = Math.max(0, this.cd1 - dt); this.cd2 = Math.max(0, this.cd2 - dt); this.cd3 = Math.max(0, this.cd3 - dt);
          if (this.speedBuff > 0) { this.speedBuff = Math.max(0, this.speedBuff - dt); }
          if (this.slow > 0) { this.slow = Math.max(0, this.slow - dt); }
          if (this.summonTimer > 0) { this.summonTimer -= dt; if (this.summonTimer <= 0) { this.dead = true; } }
          if (this.type === 'worker' && !this.isHero) { this.thinkWorker(dt); return; }
          // retreat logic for AI units
          if (this.owner !== 0 && !this.isHero) {
            const HQ = players[this.owner].structures.find(s => s.kind === 'hq');
            if (this.hp / this.maxHp < 0.35) { this.retreat = true; if (HQ) this.setDest(HQ.x, HQ.y + 40); }
            else if (this.hp / this.maxHp > 0.8) { this.retreat = false; }
          }
          const target = getById(this.targetId);
          if (target && !target.dead && !this.retreat) {
            const dx = target.x - this.x, dy = target.y - this.y; const d = Math.hypot(dx, dy);
            if (d > this.attackRange) { const v = this.speed * (this.speedBuff ? 1.5 : 1.0) * (this.slow ? 0.6 : 1.0); const nx = this.x + dx / d * v * dt, ny = this.y + dy / d * v * dt; if (!isBlocked(nx, ny)) { this.x = nx; this.y = ny; } }
            else { this.attackCd -= dt; if (this.attackCd <= 0) { this.attackCd = .55; target.damage(this.dps, this.owner); if (!muted) beep(220 + this.dps, 0.05, 'square', 0.03); } }
          } else {
            const dx = this.destX - this.x, dy = this.destY - this.y; const d = Math.hypot(dx, dy);
            if (d > 2) { const v = this.speed * (this.speedBuff ? 1.5 : 1.0) * (this.slow ? 0.6 : 1.0); const nx = this.x + dx / d * v * dt, ny = this.y + dy / d * v * dt; if (!isBlocked(nx, ny)) { this.x = nx; this.y = ny; } }
          }
          // auto-acquire target (агр рядом)
          if (!this.isHero) { const enemies = enemiesFor(this.owner); let best = null, bd = 1e9; for (const e of enemies) { if (e.dead) continue; const d = dist2(this.x, this.y, e.x, e.y); if (d < bd && d <= this.vision * this.vision) { bd = d; best = e; } } if (best) { this.setTarget(best); } }
        }
        draw() {
          if (this.owner !== 0 && !isVisible(this.x, this.y)) return;
          const s = worldToScreen(this.x, this.y);
          let col = '#6bb0ff'; if (this.owner === 1) col = '#e05dff'; if (this.owner === 2) col = '#ffd27a'; if (this.owner === -1) col = '#9fb2a1';
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(s.x, s.y, 10 * world.zoom, 0, 6.283); ctx.fill();
          drawHp(s.x, s.y - 18 * world.zoom, this.hp / this.maxHp);
          if (this.isHero) { ctx.strokeStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(s.x, s.y, 14 * world.zoom, 0, 6.283); ctx.stroke(); }
          if (this.selected) { ctx.strokeStyle = '#7ac8ff'; ctx.beginPath(); ctx.arc(s.x, s.y, 16 * world.zoom, 0, 6.283); ctx.stroke(); }
        }
      }
      class Structure extends Entity {
        constructor(x, y, owner, kind = 'hq', ghost = false) { super(x, y, owner); this.kind = kind; this.isGhost = ghost; this.radius = 36; this.maxHp = ghost ? 200 : 520; this.hp = ghost ? 40 : 520; this.queue = []; this.qTime = 0; this.vision = 520; this.regen = 0.3; }
        update(dt) {
          if (this.isGhost) { this.hp = Math.min(this.maxHp, this.hp + 15 * dt); if (this.hp >= this.maxHp) this.isGhost = false; return; }
          if (this.queue.length > 0) { if (this.qTime <= 0) this.qTime = 2.0; this.qTime -= dt; if (this.qTime <= 0) { const u = this.queue[0]; if (trainUnit(this.owner, this, u)) { this.queue.shift(); this.qTime = 0; } else { this.qTime = 1.0; } } }
        }
        draw() { if (this.owner !== 0 && !isVisible(this.x, this.y)) return; const s = worldToScreen(this.x, this.y); ctx.fillStyle = this.kind === 'hq' ? '#6f8' : this.kind === 'barracks' ? '#f86' : this.kind === 'range' ? '#cfa' : this.kind === 'mBarracks' ? '#9bf' : '#acf'; const w = 84 * world.zoom; ctx.fillRect(s.x - w / 2, s.y - w / 2, w, w); drawHp(s.x, s.y - w / 2 - 10, this.hp / this.maxHp); if (this.selected) { ctx.strokeStyle = '#7ac8ff'; ctx.strokeRect(s.x - w / 2 - 4, s.y - w / 2 - 4, w + 8, w + 8); } }
      }
      class ResourceNode { constructor(x, y, type = 'rice') { this.id = nextId++; this.x = x; this.y = y; this.type = type; this.radius = 44; } draw() { if (!isExplored(this.x, this.y)) return; const s = worldToScreen(this.x, this.y); const r = this.radius * world.zoom; if (this.type === 'rice') { ctx.fillStyle = '#2a4e2a'; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 6.283); ctx.fill(); } else { ctx.fillStyle = '#1a4e6e'; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 6.283); ctx.fill(); } } }
      class ItemDrop extends Entity { constructor(x, y, kind = 'scroll_dps') { super(x, y, -1); this.kind = kind; this.radius = 14; } draw() { if (!isExplored(this.x, this.y)) return; const s = worldToScreen(this.x, this.y); const map = { scroll_hp: 'HP', scroll_dps: 'DPS', ring_atk: 'Ring', boots: 'Boots', amulet: 'Amul', orb: 'Orb' }; ctx.fillStyle = (this.kind === 'scroll_hp') ? '#7cff97' : (this.kind === 'scroll_dps' ? '#ffd27a' : '#8ad'); ctx.beginPath(); ctx.arc(s.x, s.y - 10, 10 * world.zoom, 0, 6.283); ctx.fill(); ctx.fillStyle = '#000'; ctx.font = `${12 * world.zoom}px system-ui`; ctx.fillText(map[this.kind] || this.kind, s.x - 16 * world.zoom, s.y + 14 * world.zoom); } }

      /* ==== Neutrals ==== */
      class NeutralCreep extends Entity {
        constructor(x, y, tier = 1) { super(x, y, -1); this.tier = tier; this.radius = 12 + 4 * (tier - 1); this.maxHp = 160 + 140 * (tier - 1); this.hp = this.maxHp; this.dps = 18 + 10 * (tier - 1); this.attackRange = 26 + 6 * (tier - 1); this.leash = 320 + 60 * (tier - 1); this.homeX = x; this.homeY = y; this.aggro = false; this.attackCd = 0; this.vision = 280 + 40 * (tier - 1); this.awarded = false; this.regen = 0.2; }
        update(dt) {
          if (this.dead) return;
          let tgt = null, bd = 1e9; const candidates = players[0].units.concat(players[1].units, players[2].units);
          for (const u of candidates) { if (u.dead) continue; const d = dist2(this.x, this.y, u.x, u.y); if (d < bd) { bd = d; tgt = u; } }
          const md = Math.sqrt(bd);
          if (!this.aggro && md < this.leash) this.aggro = true;
          if (this.aggro && tgt && md < this.leash * 1.2) { if (md > this.attackRange) { const ux = (tgt.x - this.x) / md, uy = (tgt.y - this.y) / md; const nx = this.x + ux * 80 * dt, ny = this.y + uy * 80 * dt; if (!isBlocked(nx, ny)) { this.x = nx; this.y = ny; } } else { this.attackCd -= dt; if (this.attackCd <= 0) { this.attackCd = .65; tgt.damage(this.dps, -1); } } }
          else { const dx = this.homeX - this.x, dy = this.homeY - this.y, d = Math.hypot(dx, dy); if (d > 2) { const nx = this.x + dx / d * 60 * dt, ny = this.y + dy / d * 60 * dt; if (!isBlocked(nx, ny)) { this.x = nx; this.y = ny; } } this.aggro = false; }
        }
        draw() { if (!isExplored(this.x, this.y)) return; const s = worldToScreen(this.x, this.y); ctx.fillStyle = this.tier >= 3 ? '#b86' : (this.tier == 2 ? '#a68' : '#9fb2a1'); ctx.beginPath(); ctx.arc(s.x, s.y, 12 * world.zoom, 0, 6.283); ctx.fill(); drawHp(s.x, s.y - 18 * world.zoom, this.hp / this.maxHp); }
      }
      const neutral = { units: [] }, drops = [];

      /* ==== Players & economy ==== */
      const players = [
        { name: 'Игрок', color: '#6bb0ff', res: { rice: 220, water: 100 }, units: [], structures: [], hero: null, ai: false, aiPlan: null },
        { name: 'AI‑1', color: '#e05dff', res: { rice: 220, water: 100 }, units: [], structures: [], hero: null, ai: true, aiPlan: null },
        { name: 'AI‑2', color: '#ffd27a', res: { rice: 220, water: 100 }, units: [], structures: [], hero: null, ai: true, aiPlan: null }
      ];
      const riceNodes = [], waterNodes = [];
      const resUI = { rice: document.getElementById('resRice'), water: document.getElementById('resWater'), pop: document.getElementById('pop') };
      const POP_CAP = 20;
      function updateRes() { resUI.rice.textContent = players[0].res.rice | 0; resUI.water.textContent = players[0].res.water | 0; resUI.pop.textContent = players[0].units.filter(u => !u.dead && !u.isHero).length; }

      /* ==== ID lookup ==== */
      function getById(id) { if (!id) return null; for (const p of players) { for (const u of p.units) { if (u.id === id) return u; } for (const s of p.structures) { if (s.id === id) return s; } } for (const n of neutral.units) { if (n.id === id) return n; } return null; }
      function enemiesFor(owner) { const arr = []; for (const p of players) { if (p === players[owner]) continue; arr.push(...p.units.filter(u => !u.dead), ...p.structures.filter(s => !s.isGhost)); } arr.push(...neutral.units); return arr; }

      /* ==== Training & buildings ==== */
      const COSTS = { barracks: { rice: 180, water: 70 }, mBarracks: { rice: 220, water: 110 }, well: { rice: 140, water: 0 }, range: { rice: 160, water: 80 }, altar: { rice: 200, water: 140 } };
      function placeGhost(owner, x, y, kind) { const cost = COSTS[kind] || { rice: 0, water: 0 }; const R = players[owner].res; if (R.rice < cost.rice || R.water < cost.water) return false; if (isBlocked(x, y)) return false; R.rice -= cost.rice; if (owner === 0) updateRes(); const g = new Structure(x, y, owner, kind, true); players[owner].structures.push(g); return true; }
      function trainUnit(owner, barr, unitType) {
        if (players[owner].units.filter(u => !u.dead && !u.isHero).length >= POP_CAP) return false;
        const cost = unitType === 'soldier' ? { rice: 60, water: 24 } : unitType === 'mage' ? { rice: 80, water: 46 } : unitType === 'archer' ? { rice: 70, water: 36 } : unitType === 'worker' ? { rice: 50, water: 12 } : { rice: 0, water: 0 };
        const R = players[owner].res; if (R.rice < cost.rice || R.water < cost.water) return false; R.rice -= cost.rice; if (owner === 0) updateRes();
        const u = new Unit(barr.x + 36, barr.y, owner, unitType);
        if (unitType === 'soldier') { u.dps = 30; u.maxHp = 160; u.hp = 160; u.attackRange = 30; u.regen = 0.35; }
        if (unitType === 'archer') { u.dps = 20; u.maxHp = 120; u.hp = 120; u.attackRange = 250; u.vision = 520; u.regen = 0.25; }
        if (unitType === 'mage') { u.dps = 22; u.maxHp = 110; u.hp = 110; u.attackRange = 210; u.regen = 0.25; }
        players[owner].units.push(u);
        if (!muted) beep(520, 0.06, 'sawtooth', 0.04);
        return true;
      }

      /* ==== Hero & abilities ==== */
      const abilityBar = document.getElementById('abilityBar'); const heroName = document.getElementById('heroName'), heroHP = document.getElementById('heroHP'), heroMP = document.getElementById('heroMP'), heroLVL = document.getElementById('heroLVL'); const ab1 = document.getElementById('ab1'), ab2 = document.getElementById('ab2'), ab3 = document.getElementById('ab3'); const invPanel = document.getElementById('invPanel'), invGrid = document.getElementById('invGrid');
      function setHeroUI(h) { if (!h) { abilityBar.style.display = 'none'; invPanel.style.display = 'none'; return; } abilityBar.style.display = 'block'; invPanel.style.display = 'block'; heroName.textContent = h.heroName + ' (' + h.heroClass + ')'; heroHP.textContent = `HP ${h.hp | 0}/${h.maxHp | 0}`; heroMP.textContent = `MP ${h.mp | 0}/${h.maxMp | 0}`; heroLVL.textContent = 'Lvl ' + h.levelStacks; }
      ab1.onclick = () => tryCast(1); ab2.onclick = () => tryCast(2); ab3.onclick = () => tryCast(3);
      function spawnHero(owner, x, y, cls = null) {
        const h = new Unit(x, y, owner, 'soldier'); h.isHero = true; h.maxHp = 420; h.hp = 420; h.maxMp = 160; h.mp = 120; h.dps = 50; h.attackRange = 40; h.vision = 560; h.inventory = []; h.levelStacks = 0; h.regen = 1.2;
        if (!cls) { const r = Math.random(); cls = r < 0.34 ? 'paladin' : (r < 0.67 ? 'rogue' : 'archmage'); }
        h.heroClass = cls;
        if (cls === 'paladin') { h.heroName = 'Паладин'; h.cdM1 = 8; h.cdM2 = 12; h.cdM3 = 16; }
        if (cls === 'rogue') { h.heroName = 'Разбойник'; h.cdM1 = 10; h.cdM2 = 9; h.cdM3 = 16; }
        if (cls === 'archmage') { h.heroName = 'Аркан‑маг'; h.cdM1 = 7; h.cdM2 = 18; h.cdM3 = 28; }
        h.onDeath = () => { if (owner === 0) { abilityBar.style.display = 'none'; invPanel.style.display = 'none'; } players[owner].hero = null; };
        players[owner].units.push(h); players[owner].hero = h; return h;
      }
      function heroGainFromNeutral(owner, tier) {
        const h = players[owner]?.hero; if (!h || h.dead) return;
        const hpGain = tier === 1 ? 20 : (tier === 2 ? 35 : 60);
        const dpsGain = tier === 1 ? 3 : (tier === 2 ? 5 : 8);
        h.maxHp += hpGain; h.hp = Math.min(h.maxHp, h.hp + hpGain);
        h.dps += dpsGain; h.levelStacks += 1;
        if (owner === 0) setHeroUI(h);
      }
      function renderInventory(hero) {
        if (!hero || hero.dead) { invPanel.style.display = 'none'; invGrid.innerHTML = ''; return; }
        invPanel.style.display = 'block'; invGrid.innerHTML = '';
        const cap = 6, arr = (hero.inventory || []).slice(0, cap);
        for (let i = 0; i < cap; i++) {
          const slot = document.createElement('div'); slot.className = 'invSlot';
          if (arr[i]) {
            const it = arr[i]; const names = { scroll_hp: 'Свиток HP', scroll_dps: 'Свиток DPS', ring_atk: 'Кольцо атаки', boots: 'Сапоги', amulet: 'Амулет', orb: 'Орб маны' };
            slot.textContent = names[it] || it;
            slot.title = 'ЛКМ/ПКМ — использовать';
            slot.onclick = (e) => { applyItem(hero, it); hero.inventory.splice(i, 1); renderInventory(hero); };
            slot.oncontextmenu = (e) => { e.preventDefault(); applyItem(hero, it); hero.inventory.splice(i, 1); renderInventory(hero); };
          }
          invGrid.appendChild(slot);
        }
      }
      function applyItem(hero, itemKind) { if (itemKind === 'scroll_hp') { hero.maxHp += 80; hero.hp = Math.min(hero.maxHp, hero.hp + 120); } if (itemKind === 'scroll_dps') { hero.dps = (hero.dps || 40) + 10; } if (itemKind === 'ring_atk') { hero.dps += 6; } if (itemKind === 'boots') { hero.baseSpeed += 20; hero.speed += 20; } if (itemKind === 'amulet') { hero.maxHp += 120; hero.hp += 120; } if (itemKind === 'orb') { hero.maxMp += 60; hero.mp += 60; } if (hero.owner === 0) setHeroUI(hero); }
      function tryCast(slot) {
        const h = players[0].hero; if (!h || h.dead) return;
        if (slot === 1 && h.cd1 <= 0) {
          if (h.heroClass === 'paladin') { if (h.mp < 40) return; h.mp -= 40; const R = 180; for (const u of players[0].units) { if (u.dead) continue; if (Math.hypot(u.x - h.x, u.y - h.y) <= R) { u.hp = Math.min(u.maxHp, u.hp + 90); } } beep(660, 0.08, 'triangle', 0.05); }
          else if (h.heroClass === 'rogue') { if (h.mp < 25) return; h.mp -= 25; h.speedBuff = 2.5; beep(880, 0.06, 'square', 0.05); }
          else { if (h.mp < 35) return; h.mp -= 35; const p = screenToWorld(input.x, input.y); const R = 120; for (const u of players[1].units.concat(players[2].units, neutral.units)) { if (u.dead) continue; if (Math.hypot(u.x - p.x, u.y - p.y) <= R) { u.damage(80, 0); } } beep(520, 0.08, 'sawtooth', 0.06); }
          h.cd1 = h.cdM1; if (h.owner === 0) setHeroUI(h);
        }
        if (slot === 2 && h.cd2 <= 0) {
          if (h.heroClass === 'paladin') { if (h.mp < 35) return; h.mp -= 35; h.shield = (h.shield || 0) + 120; beep(280, 0.08, 'triangle', 0.05); }
          else if (h.heroClass === 'rogue') { if (h.mp < 40) return; h.mp -= 40; const R = 180; for (const e of players[1].units.concat(players[2].units, neutral.units)) { if (e.dead) continue; if (Math.hypot(e.x - h.x, e.y - h.y) <= R) { e.damage(70, 0); } } beep(720, 0.08, 'square', 0.06); }
          else { if (h.mp < 60) return; h.mp -= 60; const e = new Unit(h.x + 24, h.y, h.owner, 'elemental'); e.dps = 18; e.maxHp = 200; e.hp = 200; e.attackRange = 210; e.summonTimer = 20; players[h.owner].units.push(e); beep(480, 0.09, 'sawtooth', 0.06); }
          h.cd2 = h.cdM2; if (h.owner === 0) setHeroUI(h);
        }
        if (slot === 3 && h.cd3 <= 0) {
          if (h.heroClass === 'paladin') { if (h.mp < 45) return; h.mp -= 45; const R = 200; for (const u of players[0].units) { if (Math.hypot(u.x - h.x, u.y - h.y) <= R) u.hp = Math.min(u.maxHp, u.hp + 70); } for (const e of players[1].units.concat(players[2].units, neutral.units)) { if (Math.hypot(e.x - h.x, e.y - h.y) <= R) e.damage(60, 0); } beep(560, 0.09, 'triangle', 0.06); }
          else if (h.heroClass === 'rogue') { if (h.mp < 55) return; h.mp -= 55; const R = 220; for (const e of players[1].units.concat(players[2].units, neutral.units)) { if (Math.hypot(e.x - h.x, e.y - h.y) <= R) { e.damage(50, 0); e.slow = 3.5; } } beep(900, 0.07, 'square', 0.06); }
          else { if (h.mp < 90) return; h.mp -= 90; const d = new Unit(h.x + 28, h.y + 12, h.owner, 'demon'); d.dps = 36; d.maxHp = 500; d.hp = 500; d.attackRange = 60; d.summonTimer = 25; players[h.owner].units.push(d); beep(360, 0.12, 'sawtooth', 0.07); }
          h.cd3 = h.cdM3; if (h.owner === 0) setHeroUI(h);
        }
      }

      /* ==== Input & selection ==== */
      const buildTip = document.getElementById('buildTip');
      const input = { x: 0, y: 0, wx: 0, wy: 0, keys: {}, buildMode: null, lastClickT: 0, lastClickType: null };
      cvs.addEventListener('mousemove', e => { input.x = e.offsetX; input.y = e.offsetY; const w = screenToWorld(input.x, input.y); input.wx = w.x; input.wy = w.y; });
      cvs.addEventListener('contextmenu', e => { e.preventDefault(); if (input.buildMode) { input.buildMode = null; buildTip.style.display = 'none'; } });
      window.addEventListener('keydown', e => { const k = e.key.toLowerCase(); input.keys[k] = true; if (k === 'f') fogEnabled = !fogEnabled; if (k === '1') tryCast(1); if (k === '2') tryCast(2); if (k === '3') tryCast(3); if (k === 'u') { const h = players[0].hero; if (h && h.inventory.length) { const it = h.inventory.shift(); applyItem(h, it); renderInventory(h); } } if (k === 'r') { resumeWorkers(players[0]); } });
      window.addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });

      function entityAt(wx, wy) {
        function hit(arr, r) { let best = null, bD = 1e9; for (const e of arr) { if (e.dead) continue; const d = dist2(wx, wy, e.x, e.y); const rr = r(e); if (d <= rr * rr && d < bD) { bD = d; best = e; } } return best; }
        const a = [...players[0].units, ...players[1].units, ...players[2].units, ...neutral.units]; const b = [...players[0].structures, ...players[1].structures, ...players[2].structures];
        return hit(a, e => e.radius + 10) || hit(b, e => e.radius + 14) || null;
      }
      function unselectAll() { for (const p of [players[0], players[1], players[2]]) { for (const u of p.units) u.selected = false; for (const s of p.structures) s.selected = false; } for (const n of neutral.units) n.selected = false; }
      function selectSameTypeOnScreen(type) { const x1 = world.camX, y1 = world.camY, x2 = world.camX + cvs.width / DPR / world.zoom, y2 = world.camY + cvs.height / DPR / world.zoom; for (const u of players[0].units) { if (u.dead) continue; if (u.type === type) { if (u.x >= x1 && u.x <= x2 && u.y >= y1 && u.y <= y2) u.selected = true; } } }
      function updatePanels() { renderWorkerBuildPanel(); updateBuildingPanel(); updateStatsPanel(); setHeroUI(players[0].hero); }

      cvs.addEventListener('mousedown', e => {
        if (e.button === 0) {
          const now = performance.now();
          if (input.buildMode) { const ok = placeGhost(0, input.wx, input.wy, input.buildMode); if (ok) { input.buildMode = null; buildTip.style.display = 'none'; } return; }
          const hit = entityAt(input.wx, input.wy);
          if (!e.shiftKey) unselectAll();
          if (hit) {
            hit.selected = true;
            if (now - input.lastClickT < 300 && input.lastClickType === hit.type) { selectSameTypeOnScreen(hit.type); }
            input.lastClickType = hit.type; input.lastClickT = now;
          }
          updatePanels();
        } else if (e.button === 2) {
          if (input.buildMode) { input.buildMode = null; buildTip.style.display = 'none'; return; }
          const sel = players[0].units.filter(u => u.selected && !u.dead);
          if (sel.length) {
            const tgt = entityAt(input.wx, input.wy);
            if (tgt && tgt.owner !== 0) { sel.forEach(u => u.setTarget(tgt)); }
            else { sel.forEach((u, i) => u.setDest(input.wx + i * 12, input.wy)); }
          }
        }
      });

      /* ==== Panels ==== */
      const unitPanel = document.getElementById('unitPanel'), buildingPanel = document.getElementById('buildingPanel'), workerBuild = document.getElementById('workerBuild');
      function updateBuildingPanel() {
        const selected = players[0].structures.filter(s => s.selected && !s.isGhost && s.owner === 0); if (selected.length !== 1) { buildingPanel.style.display = 'none'; buildingPanel.innerHTML = ''; return; } const b = selected[0]; buildingPanel.style.display = 'flex'; buildingPanel.innerHTML = '';
        function add(label, cb) { const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = label; btn.onclick = () => { cb(); }; buildingPanel.appendChild(btn); }
        if (b.kind === 'hq') { add('Рабочий (🍚50/💧12)', () => b.queue.push('worker')); }
        if (b.kind === 'barracks') { add('Мечник (🍚60/💧24)', () => b.queue.push('soldier')); }
        if (b.kind === 'mBarracks') { add('Маг (🍚80/💧46)', () => b.queue.push('mage')); }
        if (b.kind === 'range') { add('Лучник (🍚70/💧36)', () => b.queue.push('archer')); }
      }
      function renderWorkerBuildPanel() {
        const selected = players[0].units.filter(u => u.selected && u.type === 'worker'); if (selected.length === 0) { workerBuild.style.display = 'none'; workerBuild.innerHTML = ''; return; } workerBuild.style.display = 'flex'; workerBuild.innerHTML = '';
        function add(kind, label, emoji, cb) { const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = emoji + ' ' + label; btn.onclick = () => { cb ? cb() : startBuild(kind); }; workerBuild.appendChild(btn); }
        add('', '⟲ Вернуться к работе [R]', '', () => resumeWorkers(players[0]));
        add('well', 'Колодец', '⛲'); add('altar', 'Алтарь', '✝'); add('barracks', 'Казарма', '⚔'); add('range', 'Лучная', '🏹'); add('mBarracks', 'Маг. казарма', '🔮');
        // role toggles
        const btn1 = document.createElement('button'); btn1.className = 'btn'; btn1.textContent = '🍚 Рис'; btn1.onclick = () => { players[0].units.filter(u => u.selected && u.type === 'worker').forEach(w => { w.role = 'rice'; w.state = 'idle'; }); }; workerBuild.appendChild(btn1);
        const btn2 = document.createElement('button'); btn2.className = 'btn'; btn2.textContent = '💧 Вода'; btn2.onclick = () => { players[0].units.filter(u => u.selected && u.type === 'worker').forEach(w => { w.role = 'water'; w.state = 'idle'; }); }; workerBuild.appendChild(btn2);
      }
      function resumeWorkers(P) { P.units.filter(u => u.type === 'worker').forEach(w => { if (w.role) { w.state = 'idle'; } }); buildTip.style.display = 'none'; input.buildMode = null; }

      /* ==== Stats panel ==== */
      const statsPanel = document.getElementById('statsPanel');
      function updateStatsPanel() { const targets = [...players[0].units, ...players[0].structures, ...players[1].units, ...players[1].structures, ...players[2].units, ...players[2].structures, ...neutral.units]; const selected = targets.filter(e => e.selected); if (selected.length === 1) { const e = selected[0]; const owner = e.owner >= 0 ? players[e.owner].name : 'Neutral'; let t, extra = ''; if (e instanceof Unit) { t = e.isHero ? ('Герой: ' + (e.heroName || '')) : 'Юнит: ' + e.type; extra = `DPS: ${e.dps | 0}\nRange: ${e.attackRange | 0}\nVision: ${e.vision | 0}\nOwner: ${owner}`; } else if (e instanceof Structure) { t = 'Здание: ' + e.kind; extra = `HP: ${(e.hp | 0)}/${(e.maxHp | 0)}\nOwner: ${owner}`; } else { t = 'Нейтрал'; extra = `HP: ${(e.hp | 0)}/${(e.maxHp | 0)}\nTier: ${e.tier}`; } statsPanel.textContent = t + '\n' + extra; } else { statsPanel.textContent = '—'; } }

      /* ==== Minimap ==== */
      mini.addEventListener('click', e => { const r = mini.getBoundingClientRect(); const mx = (e.clientX - r.left) / r.width, my = (e.clientY - r.top) / r.height; world.camX = mx * world.width - (cvs.width / DPR) / world.zoom / 2; world.camY = my * world.height - (cvs.height / DPR) / world.zoom / 2; });
      function drawMinimap() {
        const img = mctx.createImageData(mini.width, mini.height); for (let y = 0; y < mini.height; y++) { for (let x = 0; x < mini.width; x++) { const idx = (y * mini.width + x) * 4; img.data[idx] = 0; img.data[idx + 1] = 60; img.data[idx + 2] = 10; img.data[idx + 3] = 255; } } mctx.putImageData(img, 0, 0);
        function dot(x, y, col) { mctx.fillStyle = col; mctx.fillRect(x - 1, y - 1, 2, 2); }
        for (const p of players) { for (const s of p.structures) { if (!isExplored(s.x, s.y)) continue; dot(s.x / world.width * mini.width, s.y / world.height * mini.height, p.color); } for (const u of p.units) { if (!isExplored(u.x, u.y)) continue; dot(u.x / world.width * mini.width, u.y / world.height * mini.height, p.color); } }
        for (const n of neutral.units) { if (!isExplored(n.x, n.y)) continue; dot(n.x / world.width * mini.width, n.y / world.height * mini.height, '#9fb2a1'); }
        mctx.strokeStyle = 'rgba(255,255,255,.8)'; mctx.lineWidth = 1; const rx = world.camX / world.width * mini.width, ry = world.camY / world.height * mini.height; const rw = (cvs.width / DPR) / world.zoom / world.width * mini.width, rh = (cvs.height / DPR) / world.zoom / world.height * mini.height; mctx.strokeRect(rx, ry, rw, rh);
      }

      /* ==== Utils ==== */
      function allUnits() { return players[0].units.concat(players[1].units, players[2].units); }
      function allStructures() { return players[0].structures.concat(players[1].structures, players[2].structures); }
      function nearestNode(type, P) { const arr = (type === 'rice' ? riceNodes : waterNodes); let best = null, bd = 1e9; for (const n of arr) { const d = dist2(P.structures[0].x, P.structures[0].y, n.x, n.y); if (d < bd) { bd = d; best = n; } } return best; }
      function lootFromTier(t) { const base = ['scroll_hp', 'scroll_dps']; const rare = ['ring_atk', 'boots', 'amulet', 'orb']; return (Math.random() < 0.6 ? base[Math.random() < 0.5 ? 0 : 1] : rare[(Math.random() * rare.length) | 0]); }

