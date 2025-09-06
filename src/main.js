import {
  drawSprite,
  initSprites,
  initWorkerAtlas,
  initMageUnitAtlas,
  initArchmageAtlas,
  initTerrainAtlas,
  initPaladinAtlas,
  initRogueAtlas,
  initSoldierAtlas,
  initArcherAtlas,
  initDemonAtlas,
  initElementalAtlas,
  initForestTrollAtlas,
  initGnomeSeekerAtlas,
  initHermitMageAtlas,
  initWildBeastAtlas
} from "./sprites.js";
import { Unit, Structure, ResourceNode, ItemDrop, NeutralCreep, Projectile, getById, enemiesFor, allUnits, allStructures, nearestNode, lootFromTier } from "./entities.js";
import state from './state.js';
import { AIController } from './ai.js';
import FireAuraEffect from "./effects/FireAuraEffect.js";
import { clamp, rand, dist2 } from './utils.js';
import BALANCE from './config/balance.js';
import { tryCast as heroTryCast } from './hero.js';
import { cvs, ctx, mini, mctx, DPR, world, screenToWorld, worldToScreen, clampCam, toPixel, drawShadow } from './camera.js';
import { beep, playSfx } from './audio.js';
import { setWeather, drawWeather } from './weather.js';
import { setupInput } from './input.js';
/* global isExplored, genBlockers, revealCircle, clearVisible, drawTerrain, drawFog, showResultMenu, explored, visible */

/* ==== Helpers ==== */
state.rand = rand;

/* ==== Canvas & camera ==== */
globalThis.drawSprite = (name, x, y, scale = 1, override = {}) => drawSprite(ctx, name, x, y, { scale, override });
globalThis.SPRITES_READY = false;
await initSprites();
await Promise.all([
  initTerrainAtlas(),
  initWorkerAtlas(),
  initSoldierAtlas(),
  initArcherAtlas(),
  initMageUnitAtlas(),
  initElementalAtlas(),
  initDemonAtlas(),
  initHermitMageAtlas(),
  initGnomeSeekerAtlas(),
  initForestTrollAtlas(),
  initWildBeastAtlas(),
  initPaladinAtlas(),
  initRogueAtlas(),
  initArchmageAtlas()
]);
globalThis.SPRITES_READY = true;
Object.assign(globalThis, { clamp, rand, dist2, cvs, ctx, mini, mctx, DPR, world, screenToWorld, worldToScreen, clampCam, toPixel, drawShadow });

// provide a default isBlocked implementation until terrain initializes
state.isBlocked = state.isBlocked || (() => false);

globalThis.beep = beep;
globalThis.playSfx = playSfx;
let simTime = 0;
let gameOver = false;
      const neutral = { units: [] }, drops = [], projectiles = [];
      state.neutral = neutral;

      /* ==== Players & economy ==== */
      const players = [
        { name: 'Игрок', color: '#6bb0ff', res: { rice: 220, water: 100 }, units: [], structures: [], hero: null, ai: false, aiPlan: null },
        { name: 'AI‑1', color: '#e05dff', res: { rice: 220, water: 100 }, units: [], structures: [], hero: null, ai: true, aiPlan: null, difficulty: 'easy', controller: null },
        { name: 'AI‑2', color: '#ffd27a', res: { rice: 220, water: 100 }, units: [], structures: [], hero: null, ai: true, aiPlan: null, difficulty: 'hard', controller: null }
      ];
      state.players = players;
      const riceNodes = [], waterNodes = [];
      const resUI = { rice: document.getElementById('resRice'), water: document.getElementById('resWater'), pop: document.getElementById('pop'), idle: document.getElementById('idleWorkers') };
      const POP_CAP = 20;
      function updateRes() {
        resUI.rice.textContent = players[0].res.rice | 0;
        resUI.water.textContent = players[0].res.water | 0;
        resUI.pop.textContent = players[0].units.filter(u => !u.dead && !u.isHero).length;
        resUI.idle.textContent = players[0].units.filter(u => u.type === 'worker' && u.state === 'idle').length;
      }

      /* ==== Training & buildings ==== */
      const COSTS = { barracks: { rice: 180, water: 70 }, mBarracks: { rice: 220, water: 110 }, well: { rice: 140, water: 0 }, range: { rice: 160, water: 80 }, altar: { rice: 200, water: 140 }, square: { rice: 220, water: 120 } };
      function canPlaceBuildingAt(x, y) {
        const R = 40;
        if (x < R || y < R || x > world.width - R || y > world.height - R) return false;
        if (state.isBlocked && state.isBlocked(x, y)) return false;
        for (const n of riceNodes) { if (dist2(x, y, n.x, n.y) <= (n.radius + R) * (n.radius + R)) return false; }
        for (const n of waterNodes) { if (dist2(x, y, n.x, n.y) <= (n.radius + R) * (n.radius + R)) return false; }
        for (const p of players) { for (const s of p.structures) { if (dist2(x, y, s.x, s.y) <= (s.radius + R) * (s.radius + R)) return false; } }
        return true;
      }
      function placeGhost(owner, x, y, kind) {
        const cost = COSTS[kind] || { rice: 0, water: 0 };
        const R = players[owner].res;
        if (R.rice < cost.rice || R.water < cost.water) { if (owner === 0) playSfx('denied'); return false; }
        if (!canPlaceBuildingAt(x, y)) { if (owner === 0) playSfx('denied'); return false; }
        R.rice -= cost.rice; if (owner === 0) updateRes();
        const g = new Structure(x, y, owner, kind, true); players[owner].structures.push(g); return true;
      }
      function enqueueUnit(barr, unitType) {
        const owner = barr.owner;
        const cost = unitType === 'soldier' ? { rice: 60, water: 24 } : unitType === 'mage' ? { rice: 80, water: 46 } : unitType === 'archer' ? { rice: 70, water: 36 } : unitType === 'worker' ? { rice: 50, water: 12 } : { rice: 0, water: 0 };
        const R = players[owner].res;
        if (R.rice < cost.rice || R.water < cost.water) { if (owner === 0) playSfx('denied'); return false; }
        barr.queue.push(unitType);
        return true;
      }
      function trainUnit(owner, barr, unitType) {
        if (players[owner].units.filter(u => !u.dead && !u.isHero).length >= POP_CAP) { if (owner === 0) playSfx('denied'); return false; }
        const cost = unitType === 'soldier' ? { rice: 60, water: 24 } : unitType === 'mage' ? { rice: 80, water: 46 } : unitType === 'archer' ? { rice: 70, water: 36 } : unitType === 'worker' ? { rice: 50, water: 12 } : { rice: 0, water: 0 };
        const R = players[owner].res; if (R.rice < cost.rice || R.water < cost.water) { if (owner === 0) playSfx('denied'); return false; } R.rice -= cost.rice; if (owner === 0) updateRes();
        const u = new Unit(barr.x + 36, barr.y, owner, unitType, getUnitDeps());
        if (unitType === 'soldier') { u.dps = 30; u.maxHp = 160; u.hp = 160; u.attackRange = 30; u.regen = 0.35; }
        if (unitType === 'archer') { u.dps = 20; u.maxHp = 120; u.hp = 120; u.attackRange = 250; u.vision = 520; u.regen = 0.25; }
        if (unitType === 'mage') { u.dps = 22; u.maxHp = 110; u.hp = 110; u.attackRange = 210; u.regen = 0.25; }
        players[owner].units.push(u);
        if (!state.muted) beep(520, 0.06, 'sawtooth', 0.04);
        return true;
      }

      function getDeps() {
        return {
          players,
          COSTS,
          POP_CAP,
          placeGhost,
          isBlocked: (...args) => state.isBlocked(...args),
          neutral,
          dist2,
        };
      }

      function getUnitDeps() {
        return {
          isBlocked: (...args) => state.isBlocked(...args),
          rand,
          players,
        };
      }

      const deps = getDeps();

      /* ==== Hero & abilities ==== */
      const heroPanel = document.getElementById('heroPanel'); const abilityDesc = document.getElementById('abilityDesc');
      const heroName = document.getElementById('heroName'), heroHP = document.getElementById('heroHP'), heroMP = document.getElementById('heroMP'), heroLVL = document.getElementById('heroLVL'), expFill = document.getElementById('expFill'); const ab1 = document.getElementById('ab1'), ab2 = document.getElementById('ab2'), ab3 = document.getElementById('ab3'); const invPanel = document.getElementById('invPanel'), invGrid = document.getElementById('invGrid');
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
        if (!h || h.dead || !h.selected) { heroPanel.style.display = 'none'; invPanel.style.display = 'none'; return; }
        heroPanel.style.display = 'block'; invPanel.style.display = 'block';
        heroName.textContent = h.heroName + ' (' + h.heroClass + ')';
        heroHP.textContent = `HP ${h.hp | 0}/${h.maxHp | 0}`;
        heroMP.textContent = `MP ${h.mp | 0}/${h.maxMp | 0}`;
        heroLVL.textContent = 'Lvl ' + h.level;
        expFill.style.width = (h.exp / h.expToNext * 100) + '%';
        const info = abilityInfo[h.heroClass] || {};
        ab1.title = info[1] || '';
        ab2.title = info[2] || '';
        ab3.title = info[3] || '';
        abilityDesc.innerHTML = `${info[1] || ''}<br>${info[2] || ''}<br>${info[3] || ''}`;
      }
      ab1.onclick = () => tryCast(1); ab2.onclick = () => tryCast(2); ab3.onclick = () => tryCast(3);
      function spawnHero(owner, x, y, cls = null) {
        const h = new Unit(x, y, owner, 'soldier', getUnitDeps()); h.isHero = true; h.maxHp = 420; h.hp = 420; h.maxMp = 160; h.mp = 120; h.dps = 50; h.attackRange = 40; h.vision = 560; h.inventory = []; h.level = 1; h.exp = 0; h.expToNext = 100; h.regen = 0.83; h.mpRegen = 0.8;
        if (!cls) { const r = Math.random(); cls = r < 0.34 ? 'paladin' : (r < 0.67 ? 'rogue' : 'archmage'); }
        h.heroClass = cls; players[owner].chosenClass = cls;
        if (cls === 'paladin') { h.heroName = 'Паладин'; h.cdM1 = 8; h.cdM2 = 12; h.cdM3 = 16; }
        if (cls === 'rogue') { h.heroName = 'Разбойник'; h.cdM1 = 10; h.cdM2 = 9; h.cdM3 = 16; }
        if (cls === 'archmage') { h.heroName = 'Аркан‑маг'; h.cdM1 = 7; h.cdM2 = 18; h.cdM3 = 28; }
        h.onDeath = () => { if (owner === 0) { heroPanel.style.display = 'none'; invPanel.style.display = 'none'; } players[owner].hero = null; };
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
      function heroGainExp(hero, amount) {
        if (!hero || hero.dead) return;
        hero.exp += amount;
        while (hero.exp >= hero.expToNext) {
          hero.exp -= hero.expToNext;
          hero.expToNext *= 1.25;
          hero.level += 1;
          hero.maxHp *= 1.2; hero.hp = hero.maxHp;
          hero.dps *= 1.2;
          hero.baseSpeed *= 1.2; hero.speed = hero.baseSpeed;
          hero.regen *= 1.2; hero.mpRegen *= 1.2; if (hero.heroClass !== 'paladin') hero.attackRange *= 1.2;
        }
        if (hero.owner === 0) setHeroUI(hero);
      }

      function heroGainFromNeutral(owner, tier) {
        const h = players[owner]?.hero; if (!h || h.dead) return;
        const gain = tier === 1 ? 30 : (tier === 2 ? 60 : 90);
        heroGainExp(h, gain);
      }
      const itemInfo = {
        scroll_hp: { name: 'Свиток HP', desc: '+120 HP и +80 макс HP', rarity: 'Обычный' },
        scroll_dps: { name: 'Свиток DPS', desc: '+10 DPS на 20с', rarity: 'Обычный' },
        scroll_fire_aura: { name: 'Свиток ауры огня', desc: 'Огненная аура 20с, 10 урона/с в радиусе 100', rarity: 'Обычный' },
        ring_atk: { name: 'Кольцо маны', desc: '+40 MP', rarity: 'Редкий' },
        boots: { name: 'Сапоги', desc: '+20 скорость', rarity: 'Редкий' },
        amulet: { name: 'Амулет', desc: '+120 HP', rarity: 'Редкий' },
        orb: { name: 'Орб маны', desc: '+60 MP', rarity: 'Редкий' }
      };
      const itemColors = {
        scroll_hp: '#7cff97',
        scroll_dps: '#ffd27a',
        scroll_fire_aura: '#ff7a4d',
        ring_atk: '#8ad',
        boots: '#8ad',
        amulet: '#8ad',
        orb: '#8ad'
      };
      const invHotkeys = ['Q', 'E', 'R', 'G', 'T', 'Y'];
      function renderInventory(hero) {
        if (!hero || hero.dead) { invPanel.style.display = 'none'; invGrid.innerHTML = ''; return; }
        invPanel.style.display = 'block'; invGrid.innerHTML = '';
        const cap = 6, arr = (hero.inventory || []).slice(0, cap);
        for (let i = 0; i < cap; i++) {
          const slot = document.createElement('div'); slot.className = 'invSlot btn-base';
          if (arr[i]) {
            const it = arr[i]; const inf = itemInfo[it]; const hk = invHotkeys[i];
            const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32; const cctx = canvas.getContext('2d'); cctx.imageSmoothingEnabled = false;
            const col = itemColors[it] || '#8ad';
            drawSprite(cctx, 'item', 16, 16, { scale: 2, override: { r: col, R: col } });
            slot.appendChild(canvas);
            slot.style.border = '2px solid ' + col;
            slot.title = `${inf?.name || it}\n${inf?.desc || ''}\nРедкость: ${inf?.rarity || ''}\n[${hk}]`;
            if (it.startsWith('scroll_')) {
              slot.onclick = () => { applyItem(hero, it); hero.inventory.splice(i, 1); renderInventory(hero); flashSlot(i); };
              slot.oncontextmenu = (e) => { e.preventDefault(); applyItem(hero, it); hero.inventory.splice(i, 1); renderInventory(hero); flashSlot(i); };
            }
            slot.draggable = true;
            slot.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', i.toString()); });
          }
          invGrid.appendChild(slot);
        }
      }
      function flashSlot(i) { const el = invGrid.children[i]; if (el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 150); } }
      function applyItem(hero, itemKind, remove = false) {
        const sign = remove ? -1 : 1;
        if (itemKind === 'scroll_hp') {
          if (remove) return;
          hero.maxHp += 80; hero.hp = Math.min(hero.maxHp, hero.hp + 120); if (typeof beep === 'function' && !state.muted) beep(620, 0.08, 'triangle', 0.05);
        } else if (itemKind === 'scroll_dps') {
          if (remove) return;
          hero.dps += 10; hero.auraTimer = 20; if (typeof beep === 'function' && !state.muted) beep(720, 0.08, 'square', 0.06);
          setTimeout(() => { hero.dps -= 10; }, 20000);
        } else if (itemKind === 'scroll_fire_aura') {
          if (remove) return;
          const cfg = BALANCE.FIRE_AURA;
          hero.effects.push(new FireAuraEffect({
            radius: cfg.RADIUS,
            dpsPerTick: cfg.DPS_PER_TICK,
            tickMs: cfg.TICK_MS,
            durationMs: cfg.DURATION_MS,
            enemiesFor
          }));
          if (typeof beep === 'function' && !state.muted) beep(640, 0.08, 'sawtooth', 0.06);
        } else if (itemKind === 'ring_atk') {
          hero.maxMp += 40 * sign; hero.mp += 40 * sign; if (!remove && typeof beep === 'function' && !state.muted) beep(540, 0.08, 'sawtooth', 0.05);
        } else if (itemKind === 'boots') {
          hero.baseSpeed += 20 * sign; hero.speed += 20 * sign; if (!remove && typeof beep === 'function' && !state.muted) beep(480, 0.08, 'square', 0.05);
        } else if (itemKind === 'amulet') {
          hero.maxHp += 120 * sign; hero.hp += 120 * sign; if (!remove && typeof beep === 'function' && !state.muted) beep(660, 0.08, 'triangle', 0.05);
        } else if (itemKind === 'orb') {
          hero.maxMp += 60 * sign; hero.mp += 60 * sign; if (!remove && typeof beep === 'function' && !state.muted) beep(580, 0.08, 'sawtooth', 0.05);
        }
        if (hero.owner === 0) setHeroUI(hero);
      }
      function tryCast(slot) {
        const h = players[0].hero; if (!h || h.dead) return;
        const deps = {
          players,
          input,
          screenToWorld,
          beep,
          enemies: () => players[1].units.concat(players[2].units, neutral.units),
          createUnit: (x, y, owner, type) => new Unit(x, y, owner, type, getUnitDeps())
        };
        const casted = heroTryCast(h, slot, deps);
        if (casted && h.owner === 0) setHeroUI(h);
      }

      /* ==== Input & selection ==== */
      const { input } = setupInput({
        players, neutral, riceNodes, waterNodes, placeGhost, applyItem, drops, renderInventory, tryCast, resumeWorkers, playSfx
      });

      /* ==== Panels ==== */
      const buildingPanel = document.getElementById('buildingPanel'), workerBuild = document.getElementById('workerBuild');
      function updateBuildingPanel() {
        const selected = players[0].structures.filter(s => s.selected && !s.isGhost && s.owner === 0); if (selected.length !== 1) { buildingPanel.style.display = 'none'; buildingPanel.innerHTML = ''; return; } const b = selected[0]; buildingPanel.style.display = 'flex'; buildingPanel.innerHTML = '';
        function add(label, cb) { const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = label; btn.onclick = () => { cb(); }; buildingPanel.appendChild(btn); }
        if (b.kind === 'hq') { add('Рабочий (🍚50/💧12)', () => enqueueUnit(b, 'worker')); }
        if (b.kind === 'barracks') { add('Мечник (🍚60/💧24)', () => enqueueUnit(b, 'soldier')); }
        if (b.kind === 'mBarracks') { add('Маг (🍚80/💧46)', () => enqueueUnit(b, 'mage')); }
        if (b.kind === 'range') { add('Лучник (🍚70/💧36)', () => enqueueUnit(b, 'archer')); }
        if (b.kind === 'altar') { add('Возродить героя', () => { const P = players[0]; if ((!P.hero || P.hero.dead) && !b.queue.includes('hero')) { b.queue.push('hero'); } }); }
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
      function resumeWorkers(P) { P.units.filter(u => u.type === 'worker').forEach(w => { if (w.role) { w.state = 'idle'; } }); document.getElementById('buildTip').style.display = 'none'; input.buildMode = null; }

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
            const names = { square: 'Площадь' };
            t = 'Здание: ' + (names[e.kind] || e.kind);
            extra = `HP: ${(e.hp | 0)}/${(e.maxHp | 0)}\nOwner: ${owner}`;
          } else {
            t = e.displayName || 'Нейтрал';
            const names = { scroll_hp: 'Свиток HP', scroll_dps: 'Свиток DPS', scroll_fire_aura: 'Свиток ауры огня', ring_atk: 'Кольцо маны', boots: 'Сапоги', amulet: 'Амулет', orb: 'Орб маны' };
            let loot = '';
            if (e.lootTable) {
              loot = e.lootTable.map(l => `${names[l.item] || l.item} (${Math.round(l.chance * 100)}%)`).join(', ');
            }
            extra = `HP: ${(e.hp | 0)}/${(e.maxHp | 0)}\nTier: ${e.tier}\nВозможный лут: ${loot}`;
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
        const img = mctx.createImageData(mini.width, mini.height);
        for (let y = 0; y < mini.height; y++) {
          for (let x = 0; x < mini.width; x++) {
            const idx = (y * mini.width + x) * 4;
            const h = (x * 73856093 ^ y * 19349663) & 255;
            img.data[idx] = 20 + (h & 31);
            img.data[idx + 1] = 100 + (h & 63);
            img.data[idx + 2] = 20 + (h & 31);
            img.data[idx + 3] = 255;
          }
        }
        mctx.putImageData(img, 0, 0);
        function dot(x, y, col) { mctx.fillStyle = col; mctx.fillRect(x | 0, y | 0, 2, 2); }
        for (const p of players) { for (const s of p.structures) { if (!isExplored(s.x, s.y)) continue; dot(s.x / world.width * mini.width, s.y / world.height * mini.height, p.color); } for (const u of p.units) { if (!isExplored(u.x, u.y)) continue; dot(u.x / world.width * mini.width, u.y / world.height * mini.height, p.color); } }
        for (const n of neutral.units) { if (!isExplored(n.x, n.y)) continue; dot(n.x / world.width * mini.width, n.y / world.height * mini.height, '#9fb2a1'); }
        mctx.strokeStyle = 'rgba(255,255,255,.8)'; mctx.lineWidth = 1; const rx = world.camX / world.width * mini.width, ry = world.camY / world.height * mini.height; const rw = (cvs.width / DPR) / world.zoom / world.width * mini.width, rh = (cvs.height / DPR) / world.zoom / world.height * mini.height; mctx.strokeRect(rx, ry, rw, rh);
      }

      /* ==== Utils ==== */
      Object.assign(globalThis, { players, neutral, drops, projectiles, riceNodes, waterNodes, COSTS, POP_CAP, resUI, updateRes, canPlaceBuildingAt, placeGhost, enqueueUnit, trainUnit, renderWorkerBuildPanel, updateBuildingPanel, resumeWorkers, statsPanel, updateStatsPanel, drawMinimap, allUnits, allStructures, nearestNode, lootFromTier, getById, enemiesFor, Unit, Structure, ResourceNode, ItemDrop, NeutralCreep, Projectile, input, setHeroUI, spawnHero, applyItem });

      await import("./ui.js");
await import("./terrain.js");
await import("./fog.js");
// `ai.js` depends on `behavior.js` attaching symbols to `globalThis` in the
// browser, so ensure it is loaded before the controller itself.
await import("./ai/behavior.js");
await import("./ai.js");

/* ==== Setup/Reset ==== */
      async function resetGame() {
        genBlockers();
        gameOver = false;
        const presets = ['sun', 'evening', 'rain'];
        setWeather(presets[(Math.random() * presets.length) | 0]);
        for (const p of players) { p.units.length = 0; p.structures.length = 0; p.hero = null; p.res.rice = 220; p.res.water = 100; p.aiPlan = null; }
        neutral.units.length = 0; drops.length = 0; riceNodes.length = 0; waterNodes.length = 0; explored.fill(0); visible.fill(0); updateRes();
        const pos = [{ x: 900, y: 900 }, { x: world.width - 1200, y: 1200 }, { x: world.width - 1800, y: world.height - 1400 }];
        const playerClass = await chooseHeroClass();
        for (let i = 0; i < 3; i++) {
          players[i].startX = pos[i].x; players[i].startY = pos[i].y;
          const HQ = new Structure(pos[i].x, pos[i].y, i, 'hq', false); players[i].structures.push(HQ);
          for (let k = 0; k < 6; k++) { const w = new Unit(HQ.x + (k % 3) * 24, HQ.y + 60 + Math.floor(k / 3) * 24, i, 'worker', getUnitDeps()); players[i].units.push(w); w.role = (k % 2 === 0) ? 'rice' : 'water'; }
          const cls = (i === 0 ? playerClass : (Math.random() < 0.34 ? 'paladin' : (Math.random() < 0.67 ? 'rogue' : 'archmage')));
          spawnHero(i, HQ.x + 80, HQ.y - 20, cls);
          riceNodes.push(new ResourceNode(HQ.x + 220, HQ.y + 160, 'rice')); waterNodes.push(new ResourceNode(HQ.x - 220, HQ.y + 160, 'water'));
        }
        // neutrals far from starts
        function farFromAll(x, y, dist) { for (const p of players) { const s = p.structures[0]; if (Math.hypot(x - s.x, y - s.y) < dist) return false; } return true; }
        let camps = 0; while (camps < 8) {
          const cx = 200 + Math.random() * (world.width - 400), cy = 200 + Math.random() * (world.height - 400);
          if (!farFromAll(cx, cy, 1200)) continue;
          const group = { dropsLeft: 1 + (Math.random() < 0.5 ? 0 : 1) };
          const size = 3 + ((Math.random() * 3) | 0);
          for (let i = 0; i < size; i++) {
            const kindArr = ['mage', 'beast', 'gnome', 'troll'];
            const kind = kindArr[(Math.random() * kindArr.length) | 0];
            const n = new NeutralCreep(cx + rand(-80, 80), cy + rand(-80, 80), kind);
            n.group = group;
            neutral.units.push(n);
          }
          camps++;
        }
        // reveal around player
        revealCircle(players[0].structures[0].x, players[0].structures[0].y, 900);
        world.camX = players[0].structures[0].x - 400; world.camY = players[0].structures[0].y - 300; clampCam();
      }
globalThis.resetGame = resetGame;

      /* ==== Loot & pickup ==== */
      function tryPickup() {
        for (const p of players) {
          const h = p.hero; if (!h || h.dead) continue;
          for (const d of drops) {
            if (!d.dead && Math.sqrt(dist2(d.x, d.y, h.x, h.y)) < 28) {
              if (h.inventory.length < 6) {
                h.inventory.push(d.kind); d.dead = true;
                if (!d.kind.startsWith('scroll_')) applyItem(h, d.kind);
                if (p === players[0]) renderInventory(h);
              }
            }
          }
        }
      }

      /* ==== Loop ==== */
      let last = performance.now();
      function drawHp(x, y, k) { k = clamp(k, 0, 1); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - 18, y - 4, 36, 6); ctx.fillStyle = k > .5 ? '#6be36b' : (k > .25 ? '#ffd36b' : '#ff6b6b'); ctx.fillRect(x - 18, y - 4, 36 * k, 6); ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.strokeRect(x - 18, y - 4, 36, 6); }
globalThis.drawHp = drawHp;
      function loop(t) {
        if (!globalThis.SPRITES_READY) { requestAnimationFrame(loop); return; }
        const dt = Math.min(0.033, (t - last) / 1000); last = t; simTime += dt; globalThis.simTime = simTime;
        clearVisible(); for (const s of players[0].structures) revealCircle(s.x, s.y, 520); for (const u of players[0].units) revealCircle(u.x, u.y, 480);
        if (!state.paused) {
          const sp = 900 / world.zoom; if (input.keys['w'] || input.keys['ц']) world.camY -= sp * dt; if (input.keys['s'] || input.keys['ы']) world.camY += sp * dt; if (input.keys['a'] || input.keys['ф']) world.camX -= sp * dt; if (input.keys['d'] || input.keys['в']) world.camX += sp * dt; clampCam();
          for (const p of players) {
            for (const s of p.structures) s.update(dt);
            for (const u of p.units) u.update(dt);
            if (p.ai) {
              if (!p.controller) {
                p.controller = new AIController(players.indexOf(p), deps);
                p.controller.setDifficulty(p.difficulty || 'normal');
                p.controller.init();
              }
              p.controller.think(dt);
            }
          }
          for (const n of neutral.units) { n.update(dt); if (n.dead && !n.awarded) { if (n.lastHitBy != null && n.lastHitBy >= 0) { heroGainFromNeutral(n.lastHitBy, n.tier); }
            if (n.group && n.group.dropsLeft > 0) { drops.push(new ItemDrop(n.x, n.y, lootFromTier(n.tier))); n.group.dropsLeft--; }
            n.awarded = true; } }
          for (let i = neutral.units.length - 1; i >= 0; i--) { if (neutral.units[i].dead && neutral.units[i].awarded) { neutral.units.splice(i, 1); } }
          for (const pr of projectiles) pr.update(dt);
          for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].dead) projectiles.splice(i, 1);
          tryPickup();
          for (let pi = 1; pi < players.length; pi++) {
            for (const u of players[pi].units) if (u.dead && !u.expGiven) { if (u.lastHitBy === 0) heroGainExp(players[0].hero, 40); u.expGiven = true; }
            for (const s of players[pi].structures) if (s.dead && !s.expGiven && !s.isGhost) { if (s.lastHitBy === 0) heroGainExp(players[0].hero, 80); s.expGiven = true; }
          }
          for (const p of [players[0], players[1], players[2]]) { p.units = p.units.filter(u => !u.dead); p.structures = p.structures.filter(s => !s.dead); }
          if (!gameOver) {
            const playerAlive = players[0].units.some(u => !u.dead) || players[0].structures.some(s => !s.dead && !s.isGhost);
            let enemiesAlive = false;
            for (let pi = 1; pi < players.length; pi++) {
              if (players[pi].units.some(u => !u.dead) || players[pi].structures.some(s => !s.dead && !s.isGhost)) { enemiesAlive = true; break; }
            }
            if (!playerAlive) { showResultMenu('Вы проиграли'); gameOver = true; }
            else if (!enemiesAlive) { showResultMenu('Победа'); gameOver = true; }
          }
        }
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        drawTerrain();
        for (const n of riceNodes) n.draw();
        for (const n of waterNodes) n.draw();
        if (globalThis.drawBlockers) globalThis.drawBlockers();
        const drawables = allStructures().concat(allUnits(), neutral.units, drops); drawables.sort((a, b) => a.y - b.y);
        for (const e of drawables) { if (e.draw) e.draw(); }
        for (const pr of projectiles) pr.draw();
        drawWeather(dt);
        drawFog();
        if (input.buildMode) {
          const can = canPlaceBuildingAt(input.wx, input.wy);
          const s = worldToScreen(input.wx, input.wy);
          const size = 72 * world.zoom;
          ctx.strokeStyle = can ? 'rgba(0,255,0,0.6)' : 'rgba(255,0,0,0.6)';
          ctx.lineWidth = 2 * world.zoom;
          ctx.strokeRect(s.x - size / 2, s.y - size / 2, size, size);
        }
        if (input.rectSelecting) {
          const rx = Math.min(input.rectStartX, input.x);
          const ry = Math.min(input.rectStartY, input.y);
          const rw = Math.abs(input.rectStartX - input.x);
          const rh = Math.abs(input.rectStartY - input.y);
          ctx.strokeStyle = '#7ac8ff';
          ctx.strokeRect(rx, ry, rw, rh);
        }
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
        if (k === 'q') { const b = players[0].structures.find(s => s.kind === 'barracks' && !s.isGhost && s.owner === 0 && s.selected); if (b) enqueueUnit(b, 'soldier'); }
        if (k === 'w') { const b = players[0].structures.find(s => s.kind === 'range' && !s.isGhost && s.owner === 0 && s.selected); if (b) enqueueUnit(b, 'archer'); }
        if (k === 'e') { const b = players[0].structures.find(s => s.kind === 'mBarracks' && !s.isGhost && s.owner === 0 && s.selected); if (b) enqueueUnit(b, 'mage'); }
      });

      function startBuild(kind) { input.buildMode = kind; document.getElementById('buildTip').style.display = 'block'; }
globalThis.startBuild = startBuild;
