import "./sprites.js";
import { Unit, Structure, ResourceNode, ItemDrop, NeutralCreep, Projectile, getById, enemiesFor, allUnits, allStructures, nearestNode, lootFromTier } from "./entities.js";

/* ==== Helpers ==== */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const dist2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };

/* ==== Canvas & camera ==== */
const cvs = document.getElementById('game'), ctx = cvs.getContext('2d'); ctx.imageSmoothingEnabled = false;
const mini = document.getElementById('minimap'), mctx = mini.getContext('2d'); mctx.imageSmoothingEnabled = false;
const DPR = Math.max(1, window.devicePixelRatio || 1);
const world = { width: 12000, height: 8000, camX: 0, camY: 0, zoom: 1.25 };
function resize() { const w = cvs.clientWidth, h = cvs.clientHeight; cvs.width = Math.floor(w * DPR); cvs.height = Math.floor(h * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
new ResizeObserver(resize).observe(cvs); resize();
function screenToWorld(sx, sy) { return { x: sx / world.zoom + world.camX, y: sy / world.zoom + world.camY }; }
function worldToScreen(wx, wy) { return { x: (wx - world.camX) * world.zoom, y: (wy - world.camY) * world.zoom }; }

Object.assign(globalThis, { clamp, rand, dist2, cvs, ctx, mini, mctx, DPR, world, screenToWorld, worldToScreen });

/* ==== Audio (простые огибающие без внешних файлов) ==== */
const AC = window.AudioContext ? new AudioContext() : null;
function beep(freq = 440, dur = 0.08, type = 'triangle', gain = 0.06) {
  if (globalThis.muted || !AC) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(AC.destination); g.gain.value = gain;
  o.start(); g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur); o.stop(AC.currentTime + dur);
}
globalThis.beep = beep;
let simTime = 0;
      const neutral = { units: [] }, drops = [], projectiles = [];

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
      const abilityBar = document.getElementById('abilityBar'); const abilityDesc = document.getElementById('abilityDesc');
      const heroName = document.getElementById('heroName'), heroHP = document.getElementById('heroHP'), heroMP = document.getElementById('heroMP'), heroLVL = document.getElementById('heroLVL'); const ab1 = document.getElementById('ab1'), ab2 = document.getElementById('ab2'), ab3 = document.getElementById('ab3'); const invPanel = document.getElementById('invPanel'), invGrid = document.getElementById('invGrid');
      const abilityInfo = {
        paladin: {
          1: 'Исцеление (40 маны): лечит союзников на 90 HP в радиусе 180.',
          2: 'Щит (35 маны): даёт 120 щита.',
          3: 'Святая вспышка (45 маны): лечит союзников на 70 HP и наносит 60 урона врагам в радиусе 200.'
        },
        rogue: {
          1: 'Спринт (25 маны): ускоряет героя на 2.5 с.',
          2: 'Вихрь (40 маны): наносит 70 урона врагам в радиусе 180.',
          3: 'Теневой удар (55 маны): наносит 50 урона и замедляет на 3.5 с врагов в радиусе 220.'
        },
        archmage: {
          1: 'Огненный взрыв (35 маны): наносит 80 урона по области 120 в точке указателя.',
          2: 'Призыв элементаля (60 маны): существо 200 HP, 18 DPS на 20 с.',
          3: 'Призыв демона (90 маны): существо 500 HP, 36 DPS на 25 с.'
        }
      };
      function setHeroUI(h) {
        if (!h) { abilityBar.style.display = 'none'; abilityDesc.style.display = 'none'; invPanel.style.display = 'none'; return; }
        abilityBar.style.display = 'block'; abilityDesc.style.display = 'block'; invPanel.style.display = 'block';
        heroName.textContent = h.heroName + ' (' + h.heroClass + ')';
        heroHP.textContent = `HP ${h.hp | 0}/${h.maxHp | 0}`;
        heroMP.textContent = `MP ${h.mp | 0}/${h.maxMp | 0}`;
        heroLVL.textContent = 'Lvl ' + h.levelStacks;
        const info = abilityInfo[h.heroClass] || {};
        ab1.title = info[1] || '';
        ab2.title = info[2] || '';
        ab3.title = info[3] || '';
        abilityDesc.innerHTML = `${info[1] || ''}<br>${info[2] || ''}<br>${info[3] || ''}`;
      }
      ab1.onclick = () => tryCast(1); ab2.onclick = () => tryCast(2); ab3.onclick = () => tryCast(3);
      function spawnHero(owner, x, y, cls = null) {
        const h = new Unit(x, y, owner, 'soldier'); h.isHero = true; h.maxHp = 420; h.hp = 420; h.maxMp = 160; h.mp = 120; h.dps = 50; h.attackRange = 40; h.vision = 560; h.inventory = []; h.levelStacks = 0; h.regen = 0.83; h.mpRegen = 0.8;
        if (!cls) { const r = Math.random(); cls = r < 0.34 ? 'paladin' : (r < 0.67 ? 'rogue' : 'archmage'); }
        h.heroClass = cls; players[owner].chosenClass = cls;
        if (cls === 'paladin') { h.heroName = 'Паладин'; h.cdM1 = 8; h.cdM2 = 12; h.cdM3 = 16; }
        if (cls === 'rogue') { h.heroName = 'Разбойник'; h.cdM1 = 10; h.cdM2 = 9; h.cdM3 = 16; }
        if (cls === 'archmage') { h.heroName = 'Аркан‑маг'; h.cdM1 = 7; h.cdM2 = 18; h.cdM3 = 28; }
        h.onDeath = () => { if (owner === 0) { abilityBar.style.display = 'none'; invPanel.style.display = 'none'; } players[owner].hero = null; };
        players[owner].units.push(h); players[owner].hero = h; return h;
      }
      function chooseHeroClass() {
        return new Promise(res => {
          const panel = document.getElementById('heroSelect');
          panel.style.display = 'flex';
          panel.querySelectorAll('button').forEach(b => {
            b.onclick = () => {
              panel.style.display = 'none';
              res(b.dataset.cls);
            };
          });
        });
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
            const it = arr[i]; const names = { scroll_hp: 'Свиток HP', scroll_dps: 'Свиток DPS', ring_atk: 'Кольцо маны', boots: 'Сапоги', amulet: 'Амулет', orb: 'Орб маны' };
            slot.textContent = names[it] || it;
            slot.title = 'ЛКМ/ПКМ — использовать';
            slot.onclick = (e) => { applyItem(hero, it); hero.inventory.splice(i, 1); renderInventory(hero); };
            slot.oncontextmenu = (e) => { e.preventDefault(); applyItem(hero, it); hero.inventory.splice(i, 1); renderInventory(hero); };
          }
          invGrid.appendChild(slot);
        }
      }
      function applyItem(hero, itemKind) {
        if (itemKind === 'scroll_hp') {
          hero.maxHp += 80; hero.hp = Math.min(hero.maxHp, hero.hp + 120); if (typeof beep === 'function' && !muted) beep(620, 0.08, 'triangle', 0.05);
        } else if (itemKind === 'scroll_dps') {
          hero.dps += 10; hero.auraTimer = 20; if (typeof beep === 'function' && !muted) beep(720, 0.08, 'square', 0.06);
          setTimeout(() => { hero.dps -= 10; }, 20000);
        } else if (itemKind === 'ring_atk') {
          hero.maxMp += 40; hero.mp += 40; if (typeof beep === 'function' && !muted) beep(540, 0.08, 'sawtooth', 0.05);
        } else if (itemKind === 'boots') {
          hero.baseSpeed += 20; hero.speed += 20; if (typeof beep === 'function' && !muted) beep(480, 0.08, 'square', 0.05);
        } else if (itemKind === 'amulet') {
          hero.maxHp += 120; hero.hp += 120; if (typeof beep === 'function' && !muted) beep(660, 0.08, 'triangle', 0.05);
        } else if (itemKind === 'orb') {
          hero.maxMp += 60; hero.mp += 60; if (typeof beep === 'function' && !muted) beep(580, 0.08, 'sawtooth', 0.05);
        }
        if (hero.owner === 0) setHeroUI(hero);
      }
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
      window.addEventListener('keydown', e => { const k = e.key.toLowerCase(); input.keys[k] = true; if (k === 'f') globalThis.fogEnabled = !globalThis.fogEnabled; if (k === '1') tryCast(1); if (k === '2') tryCast(2); if (k === '3') tryCast(3); if (k === 'u') { const h = players[0].hero; if (h && h.inventory.length) { const it = h.inventory.shift(); applyItem(h, it); renderInventory(h); } } if (k === 'r') { resumeWorkers(players[0]); } });
      window.addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });

      function entityAt(wx, wy) {
        function hit(arr, r) { let best = null, bD = 1e9; for (const e of arr) { if (e.dead) continue; const d = dist2(wx, wy, e.x, e.y); const rr = r(e); if (d <= rr * rr && d < bD) { bD = d; best = e; } } return best; }
        const a = [...players[0].units, ...players[1].units, ...players[2].units, ...neutral.units];
        const b = [...players[0].structures, ...players[1].structures, ...players[2].structures];
        const c = [...riceNodes, ...waterNodes];
        return hit(a, e => e.radius + 10) || hit(b, e => e.radius + 14) || hit(c, e => e.radius) || null;
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
          const tgt = entityAt(input.wx, input.wy);
          if (sel.length === 0 && tgt && tgt.owner === 0) {
            unselectAll(); tgt.selected = true; updatePanels(); return;
          }
          if (sel.length) {
            if (tgt instanceof Structure && tgt.isGhost && sel.some(u => u.type === 'worker')) {
              sel.filter(u => u.type === 'worker').forEach(w => { w.state = 'build'; w.buildTargetId = tgt.id; });
            } else if (tgt instanceof ResourceNode && sel.some(u => u.type === 'worker')) {
              sel.filter(u => u.type === 'worker').forEach(w => { w.role = tgt.type; w.state = 'idle'; });
            } else if (tgt && tgt.owner !== 0) { sel.forEach(u => u.setTarget(tgt)); }
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
        if (b.kind === 'altar') { add('Возродить героя', () => { const P = players[0]; if (!P.hero || P.hero.dead) { setTimeout(() => spawnHero(0, b.x + 40, b.y - 20, P.chosenClass), 20000); } }); }
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
      function updateStatsPanel() {
        const targets = [...players[0].units, ...players[0].structures, ...players[1].units, ...players[1].structures, ...players[2].units, ...players[2].structures, ...neutral.units];
        const selected = targets.filter(e => e.selected);
        if (selected.length === 1) {
          const e = selected[0];
          const owner = e.owner >= 0 ? players[e.owner].name : 'Neutral';
          let t, extra = '';
          if (e instanceof Unit) {
            t = e.isHero ? ('Герой: ' + (e.heroName || '')) : 'Юнит: ' + e.type;
            extra = `DPS: ${e.dps | 0}\nRange: ${e.attackRange | 0}\nVision: ${e.vision | 0}\nOwner: ${owner}`;
            if (e.type === 'mage' && !e.isHero) {
              abilityDesc.style.display = 'block';
              abilityDesc.textContent = 'Маг: наносит урон с расстояния и поддерживает союзников.';
            }
          } else if (e instanceof Structure) {
            t = 'Здание: ' + e.kind;
            extra = `HP: ${(e.hp | 0)}/${(e.maxHp | 0)}\nOwner: ${owner}`;
          } else {
            t = 'Нейтрал';
            extra = `HP: ${(e.hp | 0)}/${(e.maxHp | 0)}\nTier: ${e.tier}`;
          }
          statsPanel.textContent = t + '\n' + extra;
        } else {
          statsPanel.textContent = '—';
          setHeroUI(players[0].hero);
        }
      }

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
Object.assign(globalThis, { players, neutral, drops, projectiles, riceNodes, waterNodes, COSTS, POP_CAP, resUI, updateRes, placeGhost, trainUnit, renderWorkerBuildPanel, updateBuildingPanel, resumeWorkers, statsPanel, updateStatsPanel, drawMinimap, allUnits, allStructures, nearestNode, lootFromTier, getById, enemiesFor, Unit, Structure, ResourceNode, ItemDrop, NeutralCreep, Projectile, input });

      await import("./ui.js");
await import("./terrain.js");
await import("./fog.js");
await import("./ai.js");

/* ==== Setup/Reset ==== */
      async function resetGame() {
        genBlockers();
        for (const p of players) { p.units.length = 0; p.structures.length = 0; p.hero = null; p.res.rice = 220; p.res.water = 100; p.aiPlan = null; }
        neutral.units.length = 0; drops.length = 0; riceNodes.length = 0; waterNodes.length = 0; explored.fill(0); visible.fill(0); updateRes();
        const pos = [{ x: 900, y: 900 }, { x: world.width - 1200, y: 1200 }, { x: world.width - 1800, y: world.height - 1400 }];
        const playerClass = await chooseHeroClass();
        for (let i = 0; i < 3; i++) {
          const HQ = new Structure(pos[i].x, pos[i].y, i, 'hq', false); players[i].structures.push(HQ);
          for (let k = 0; k < 6; k++) { const w = new Unit(HQ.x + (k % 3) * 24, HQ.y + 60 + Math.floor(k / 3) * 24, i, 'worker'); players[i].units.push(w); w.role = (k % 2 === 0) ? 'rice' : 'water'; } // 3/3
          const cls = (i === 0 ? playerClass : (Math.random() < 0.34 ? 'paladin' : (Math.random() < 0.67 ? 'rogue' : 'archmage')));
          spawnHero(i, HQ.x + 80, HQ.y - 20, cls);
          riceNodes.push(new ResourceNode(HQ.x + 220, HQ.y + 160, 'rice')); waterNodes.push(new ResourceNode(HQ.x - 220, HQ.y + 160, 'water'));
        }
        // neutrals far from starts
        function farFromAll(x, y, dist) { for (const p of players) { const s = p.structures[0]; if (Math.hypot(x - s.x, y - s.y) < dist) return false; } return true; }
        let placed = 0; while (placed < 28) { const x = 200 + Math.random() * (world.width - 400), y = 200 + Math.random() * (world.height - 400); if (!farFromAll(x, y, 1200)) continue; const tier = Math.random() < 0.6 ? 1 : (Math.random() < 0.7 ? 2 : 3); neutral.units.push(new NeutralCreep(x, y, tier)); placed++; }
        // reveal around player
        revealCircle(players[0].structures[0].x, players[0].structures[0].y, 900);
        world.camX = players[0].structures[0].x - 400; world.camY = players[0].structures[0].y - 300;
      }
globalThis.resetGame = resetGame;

      /* ==== Loot & pickup ==== */
      function tryPickup() { for (const p of players) { const h = p.hero; if (h && !h.dead) { for (const d of drops) { if (!d.dead && Math.sqrt(dist2(d.x, d.y, h.x, h.y)) < 28) { if (h.inventory.length < 6) { h.inventory.push(d.kind); d.dead = true; if (p === players[0]) renderInventory(h); } } } } } }

      /* ==== Loop ==== */
      let last = performance.now();
      function drawHp(x, y, k) { k = clamp(k, 0, 1); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - 18, y - 4, 36, 6); ctx.fillStyle = k > .5 ? '#6be36b' : (k > .25 ? '#ffd36b' : '#ff6b6b'); ctx.fillRect(x - 18, y - 4, 36 * k, 6); ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.strokeRect(x - 18, y - 4, 36, 6); }
globalThis.drawHp = drawHp;
      function loop(t) {
        const dt = Math.min(0.033, (t - last) / 1000); last = t; simTime += dt;
        clearVisible(); for (const s of players[0].structures) revealCircle(s.x, s.y, 520); for (const u of players[0].units) revealCircle(u.x, u.y, 480);
        if (!globalThis.paused) {
          const sp = 900 / world.zoom; if (input.keys['w'] || input.keys['ц']) world.camY -= sp * dt; if (input.keys['s'] || input.keys['ы']) world.camY += sp * dt; if (input.keys['a'] || input.keys['ф']) world.camX -= sp * dt; if (input.keys['d'] || input.keys['в']) world.camX += sp * dt;
          for (const p of players) { for (const s of p.structures) s.update(dt); for (const u of p.units) u.update(dt); if (p.ai) aiThink(dt, players.indexOf(p)); }
          // нейтралы больше не роняют предметы
          for (const n of neutral.units) { n.update(dt); if (n.dead && !n.awarded) { if (n.lastHitBy != null && n.lastHitBy >= 0) { heroGainFromNeutral(n.lastHitBy, n.tier); } n.awarded = true; } }
          // cleanup neutrals (remove processed corpses)
          for (let i = neutral.units.length - 1; i >= 0; i--) { if (neutral.units[i].dead && neutral.units[i].awarded) { neutral.units.splice(i, 1); } }
          for (const pr of projectiles) pr.update(dt);
          for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].dead) projectiles.splice(i, 1);
          tryPickup();
          // cleanup players lists
          for (const p of [players[0], players[1], players[2]]) { p.units = p.units.filter(u => !u.dead); p.structures = p.structures.filter(s => !s.dead); }
        }
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        drawTerrain();
        const drawables = allStructures().concat(allUnits(), neutral.units, projectiles, riceNodes, waterNodes, drops); drawables.sort((a, b) => a.y - b.y);
        for (const e of drawables) { if (e.draw) e.draw(); }
        drawFog();
        // cursor
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); const c = 8; ctx.moveTo(input.x - c, input.y); ctx.lineTo(input.x + c, input.y); ctx.moveTo(input.x, input.y - c); ctx.lineTo(input.x, input.y + c); ctx.stroke();
        drawMinimap();
        setHeroUI(players[0].hero);
        updateRes();
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);

      /* ==== Building hotkeys ==== */
      window.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        if (k === 'b') startBuild('barracks');
        if (k === 'm') startBuild('mBarracks');
        if (k === 't') startBuild('well');
        if (k === 'l') startBuild('range');
        if (k === 'h') startBuild('altar');
        if (k === 'q') { const b = players[0].structures.find(s => s.kind === 'barracks' && !s.isGhost && s.owner === 0 && s.selected); if (b) b.queue.push('soldier'); }
        if (k === 'w') { const b = players[0].structures.find(s => s.kind === 'range' && !s.isGhost && s.owner === 0 && s.selected); if (b) b.queue.push('archer'); }
        if (k === 'e') { const b = players[0].structures.find(s => s.kind === 'mBarracks' && !s.isGhost && s.owner === 0 && s.selected); if (b) b.queue.push('mage'); }
      });

      function startBuild(kind) { input.buildMode = kind; document.getElementById('buildTip').style.display = 'block'; }
globalThis.startBuild = startBuild;
