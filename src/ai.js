/* ==== AI Controller ==== */
import { Selector, Sequence, Action } from './ai/behavior.js';
import { DEBUG_AI, packPower, campPower, AI_THRESHOLDS } from './config/ai.js';

const DIFFICULTY_CONFIG = {
  easy: {
    comp: { soldier: 0.5, archer: 0.5, mage: 0.0 },
    open: ['well', 'barracks'],
    pushAt: 8,
    aggression: 0.5,
    buildInterval: 4,
    resourcePriorities: { rice: 0.6, water: 0.4 },
    scoutFrequency: 400,
  },
  normal: {
    comp: { soldier: 0.4, archer: 0.4, mage: 0.2 },
    open: ['well', 'barracks', 'range'],
    pushAt: 10,
    aggression: 0.7,
    buildInterval: 6,
    resourcePriorities: { rice: 0.5, water: 0.5 },
    scoutFrequency: 300,
  },
  hard: {
    comp: { soldier: 0.3, archer: 0.4, mage: 0.3 },
    open: ['well', 'barracks', 'range', 'mBarracks'],
    pushAt: 8,
    aggression: 1.0,
    buildInterval: 10,
    resourcePriorities: { rice: 0.4, water: 0.6 },
    scoutFrequency: 200,
  },
};

function aiInitPlan(P, level = 'normal') {
  const cfg = DIFFICULTY_CONFIG[level] || DIFFICULTY_CONFIG.normal;
  P.aiPlan = {
    comp: { ...cfg.comp },
    open: [...cfg.open],
    state: 'farm',
    pushAt: cfg.pushAt,
    nextBuild: 0,
    aggression: cfg.aggression,
    baseAggression: cfg.aggression,
    buildInterval: cfg.buildInterval,
    buildTimer: 0,
    buildFailCount: 0,
    buildSearchRadius: 200,
    trainCooldown: 0,
    lastTrainCheck: 0,
    minReserve: { ...AI_THRESHOLDS.minReserve },
    // Additional fields for extended scenarios
    scoutTimer: 0,
    scoutFrequency: cfg.scoutFrequency,
    resourcePriorities: { ...cfg.resourcePriorities },
    finalPush: false,
    battleHistory: [],
  };
}

class AIController {
  constructor(id, deps) {
    this.id = id;
    this.deps = deps;
    this.player = deps.players[id];
    this.level = 'normal';
    this.behavior = null;
  }
  setDifficulty(level) {
    this.level = level;
  }
  init() {
    aiInitPlan(this.player, this.level);
    this.buildBehaviorTree();
  }
  buildBehaviorTree() {
    this.behavior = new Sequence([
      new Action(this.ensureHQ.bind(this)),
      new Action(this.buildOpenings.bind(this)),
      new Action(this.maintainWorkers.bind(this)),
      new Action(this.redistributeWorkers.bind(this)),
      new Action(this.manageIdleUnits.bind(this)),
      new Action(this.trainUnits.bind(this)),
      new Action(this.heroActions.bind(this)),
      new Action(this.earlyArmyFarm.bind(this)),
      new Action(this.adaptiveRecon.bind(this)),
      new Action(this.defendBase.bind(this)),
      new Action(this.coordinateWithAlly.bind(this)),
      new Action(this.prepareFinalPush.bind(this)),
      new Action(this.skirmish.bind(this)),
      new Action(this.engage.bind(this)),
      new Action(this.rallyAttack.bind(this)),
      new Action(this.completeGhosts.bind(this)),
      new Action(this.updateLearning.bind(this)),
    ]);
  }
  think(dt) {
    if (!this.player.ai) return;
    if (!this.behavior || !this.player.aiPlan) this.init();
    if (this.player.aiPlan.buildTimer > 0) {
      this.player.aiPlan.buildTimer -= dt;
      if (this.player.aiPlan.buildTimer < 0) this.player.aiPlan.buildTimer = 0;
    }
    this.evaluateAggression();
    this.behavior.tick({ dt, controller: this });
  }

  evaluateAggression() {
    const P = this.player;
    const { players } = this.deps;
    const enemies = players
      .filter((pl, idx) => idx !== this.id && !(pl.teamId !== undefined && P.teamId !== undefined && pl.teamId === P.teamId))
      .flatMap(pl => pl.units.filter(u => !u.dead));
    const enemyP = packPower(enemies);
    const ourP = packPower(P.units.filter(u => !u.dead));
    const totalStructs = players.reduce((sum, pl) => sum + pl.structures.length, 0);
    const mapControl = totalStructs ? P.structures.length / totalStructs : 0.5;
    const base = P.aiPlan.baseAggression || 1;
    let newAgg = base * (ourP / Math.max(enemyP, 1)) * (0.5 + mapControl);
    newAgg = Math.max(0.1, Math.min(newAgg, 2));
    if (Math.abs(newAgg - P.aiPlan.aggression) > 0.01) {
      P.aiPlan.aggression = newAgg;
      if (DEBUG_AI) console.log('aggression', newAgg.toFixed(2));
    }
  }

  // Actions derived from original aiThink
  ensureHQ() {
    const P = this.player;
    const { COSTS, placeGhost, isBlocked } = this.deps;
    const HQ = P.structures.find(s => s.kind === 'hq' || s.kind === 'square');
    if (HQ) return true;
    const cost = COSTS.square;
    const px = P.startX || 0, py = P.startY || 0;
    if (P.res.rice >= cost.rice && P.res.water >= cost.water && !isBlocked(px, py) && placeGhost(this.id, px, py, 'square')) {
      const g = P.structures.find(s => s.isGhost && s.kind === 'square');
      const w = P.units.find(u => u.type === 'worker');
      if (g && w) { w.state = 'build'; w.buildTargetId = g.id; }
      return true;
    }
    return false;
  }

  buildOpenings({ dt = 0 } = {}) {
    const P = this.player;
    const { COSTS, placeGhost, isBlocked } = this.deps;
    P.aiPlan.buildTimer -= dt;
    if (P.aiPlan.buildTimer > 0) return true;
    const HQ = P.structures.find(s => s.kind === 'hq' || s.kind === 'square');
    if (P.aiPlan.nextBuild < P.aiPlan.open.length && HQ) {
      const worker = P.units.find(u => u.type === 'worker' && u.state !== 'build');
      if (!worker) {
        this.maintainWorkers();
        P.aiPlan.buildTimer = 1 + Math.random();
        return false;
      }
      const kind = P.aiPlan.open[P.aiPlan.nextBuild];
      if (P.structures.some(s => s.kind === kind && !s.isGhost)) {
        P.aiPlan.nextBuild++;
        return true;
      }
      const cost = COSTS[kind];
      if (P.res.rice >= cost.rice && P.res.water >= cost.water) {
        const r = P.aiPlan.buildSearchRadius;
        const offsets = (kind === 'well')
          ? [[-r, r * 0.75], [r, r * 0.75], [-r, -r * 0.75], [r, -r * 0.75]]
          : [[r, r], [r, -r], [-r, r], [-r, -r]];
        let placed = false;
        let px = 0, py = 0;
        for (const [dx, dy] of offsets) {
          px = HQ.x + dx;
          py = HQ.y + dy;
          if (!isBlocked(px, py) && placeGhost(this.id, px, py, kind)) {
            placed = true;
            break;
          }
        }
        if (placed) {
          P.aiPlan.nextBuild++;
          P.aiPlan.buildTimer = P.aiPlan.buildInterval;
          P.aiPlan.buildFailCount = 0;
          const g = P.structures.find(s => s.isGhost && s.kind === kind && Math.hypot(s.x - px, s.y - py) < 10);
          if (g) {
            worker.state = 'build';
            worker.buildTargetId = g.id;
          }
          return true;
        }
        P.aiPlan.buildFailCount++;
        P.aiPlan.buildSearchRadius += 40;
        if (P.aiPlan.buildFailCount >= 5) {
          if (DEBUG_AI) console.log('build fail skip', kind);
          P.aiPlan.buildFailCount = 0;
          P.aiPlan.nextBuild++;
        }
        P.aiPlan.buildTimer = 1;
        return false;
      }
      return false;
    }
    return true;
  }

  maintainWorkers() {
    const P = this.player;
    const { POP_CAP } = this.deps;
    const HQ = P.structures.find(s => s.kind === 'hq' || s.kind === 'square');
    if (!HQ) return false;
    let success = true;
    const wcount = P.units.filter(u => u.type === 'worker').length;
    if (wcount < 6) {
      if (P.res.rice >= 50 && P.res.water >= 12 && P.units.filter(u => !u.dead && !u.isHero).length < POP_CAP) {
        HQ.queue.push('worker');
      } else {
        success = false;
      }
    }
    const workers = P.units.filter(u => u.type === 'worker');
    const riceWorkers = workers.filter(u => u.role === 'rice');
    const waterWorkers = workers.filter(u => u.role === 'water');
    const priorities = P.aiPlan.resourcePriorities || { rice: 0.5, water: 0.5 };
    const desiredRice = Math.round(workers.length * priorities.rice);
    const unassigned = workers.filter(u => u.role !== 'rice' && u.role !== 'water');
    for (const worker of unassigned) {
      if (riceWorkers.length < desiredRice) {
        worker.role = 'rice';
        riceWorkers.push(worker);
      } else {
        worker.role = 'water';
        waterWorkers.push(worker);
      }
      worker.state = 'idle';
    }
    return success;
  }

  // Scenario 3: flexible distribution of workers between resources
  redistributeWorkers() {
    const P = this.player;
    if (!P.units) return false;
    const riceWorkers = P.units.filter(u => u.type === 'worker' && u.role === 'rice');
    const waterWorkers = P.units.filter(u => u.type === 'worker' && u.role === 'water');
    if (P.res.rice < P.res.water && waterWorkers.length > 0) {
      const w = waterWorkers.pop();
      w.role = 'rice';
      w.state = 'idle';
    } else if (P.res.water < P.res.rice && riceWorkers.length > 0) {
      const w = riceWorkers.pop();
      w.role = 'water';
      w.state = 'idle';
    }
    return true;
  }

  manageIdleUnits() {
    const P = this.player;
    const { players } = this.deps;
    const idle = P.units.filter(
      u => u.type !== 'worker' && !u.isHero && (!u.state || u.state === 'idle') && !u.target
    );
    if (!idle.length) return false;
    const enemies = players.filter(
      (pl, idx) =>
        idx !== this.id && !(pl.teamId !== undefined && P.teamId !== undefined && pl.teamId === P.teamId)
    );
    const target = enemies.flatMap(pl => pl.units.concat(pl.structures)).find(t => t && !t.isGhost);
    if (target) {
      idle.forEach(u => {
        if (typeof u.setTarget === 'function') u.setTarget(target);
        u.state = 'attack';
      });
      return true;
    }
    return false;
  }

  trainUnits({ dt = 0 } = {}) {
    const P = this.player;
    const { POP_CAP } = this.deps;
    P.aiPlan.trainCooldown -= dt;
    if (P.aiPlan.trainCooldown > 0) return true;
    P.aiPlan.trainCooldown = 0.3 + Math.random() * 0.3;
    const barr = P.structures.find(s => s.kind === 'barracks' && !s.isGhost),
      rng = P.structures.find(s => s.kind === 'range' && !s.isGhost),
      mb = P.structures.find(s => s.kind === 'mBarracks' && !s.isGhost);
    const units = P.units.filter(u => !u.dead && !u.isHero);
    if (units.length >= POP_CAP) return false;
    if (P.res.rice < P.aiPlan.minReserve.rice || P.res.water < P.aiPlan.minReserve.water) return false;
    const count = type => units.filter(u => u.type === type).length +
      (barr && type === 'soldier' ? barr.queue.filter(q => q === 'soldier').length : 0) +
      (rng && type === 'archer' ? rng.queue.filter(q => q === 'archer').length : 0) +
      (mb && type === 'mage' ? mb.queue.filter(q => q === 'mage').length : 0);
    const minComp = { soldier: 3, archer: 2, mage: 1 };
    if (barr && count('soldier') < minComp.soldier && barr.queue.length < 5) { barr.queue.push('soldier'); return true; }
    if (rng && count('archer') < minComp.archer && rng.queue.length < 5) { rng.queue.push('archer'); return true; }
    if (mb && count('mage') < minComp.mage && mb.queue.length < 5) { mb.queue.push('mage'); return true; }
    const r = Math.random();
    if (barr && r < P.aiPlan.comp.soldier && barr.queue.length < 5) { barr.queue.push('soldier'); return true; }
    if (rng && r < P.aiPlan.comp.soldier + P.aiPlan.comp.archer && rng.queue.length < 5) { rng.queue.push('archer'); return true; }
    if (mb && mb.queue.length < 5) { mb.queue.push('mage'); return true; }
    return false;
  }

  // Scenario 2: adaptive reconnaissance using periodic scouting units
  adaptiveRecon({ dt = 0 } = {}) {
    const P = this.player;
    if (!P.aiPlan) return false;
    P.aiPlan.scoutTimer -= dt;
    if (P.aiPlan.scoutTimer > 0) return true;
    const scout = P.units.find(u => u.type !== 'worker' && !u.isHero);
    if (scout && typeof scout.setDest === 'function') {
      const px = (Math.random() - 0.5) * 800;
      const py = (Math.random() - 0.5) * 800;
      scout.setDest(px, py);
      P.aiPlan.scoutTimer = P.aiPlan.scoutFrequency;
      if (DEBUG_AI) console.log('scout to', px, py);
      return true;
    }
    P.aiPlan.scoutTimer = P.aiPlan.scoutFrequency; // reset timer
    return false;
  }

  // Scenario 1: base defense mode when resources low or under attack
  defendBase() {
    const P = this.player;
    const { players } = this.deps;
    const HQ = P.structures.find(s => s.kind === 'hq' || s.kind === 'square');
    if (!HQ) return false;
    const enemyUnits = players
      .filter((pl, idx) => idx !== this.id && !(pl.teamId !== undefined && P.teamId !== undefined && pl.teamId === P.teamId))
      .flatMap(pl => pl.units.filter(u => !u.dead));
    const threat = enemyUnits.find(e => Math.hypot(e.x - HQ.x, e.y - HQ.y) < 200);
    if (P.res.rice < 50 || P.res.water < 30 || threat) {
      const army = P.units.filter(u => u.type !== 'worker' && !u.isHero);
      if (threat) army.forEach(u => { if (typeof u.setTarget === 'function') u.setTarget(threat); });
      else if (army.length) army.forEach(u => { if (typeof u.setTarget === 'function') u.setTarget(HQ); });
      const damaged = P.structures.find(s => s.hp && s.maxHp && s.hp < s.maxHp);
      if (damaged) {
        const w = P.units.find(u => u.type === 'worker' && u.state !== 'build');
        if (w) { w.state = 'build'; w.buildTargetId = damaged.id; }
      }
      return true;
    }
    return false;
  }

  // Scenario 4: coordinate with allies for combined attacks
  coordinateWithAlly() {
    const { players } = this.deps;
    if (!players || players.length < 3) return false;
    const ally = players[2];
    if (!ally || !ally.attackTarget) return false;
    const army = this.player.units.filter(u => u.type !== 'worker' && !u.isHero);
    army.forEach(u => { if (typeof u.setTarget === 'function') u.setTarget(ally.attackTarget); });
    return true;
  }

  // Scenario 5: preparation for a final push when resources and army allow
  prepareFinalPush() {
    const P = this.player;
    if (P.aiPlan.finalPush) return true;
    const army = P.units.filter(u => u.type !== 'worker' && !u.isHero);
    if (army.length >= P.aiPlan.pushAt && P.res.rice > 200 && P.res.water > 200) {
      P.aiPlan.finalPush = true;
      P.aiPlan.pushAt = army.length + 5;
      const mb = P.structures.find(s => s.kind === 'mBarracks' && !s.isGhost);
      if (mb) mb.queue.push('mage');
      return true;
    }
    return false;
  }

  // Scenario 7: hybrid attack-retreat probing enemy defenses
  skirmish() {
    const P = this.player;
    const { players } = this.deps;
    const enemy = players.find(
      (pl, idx) => idx !== this.id && !(pl.teamId !== undefined && P.teamId !== undefined && pl.teamId === P.teamId)
    );
    if (!enemy) return false;
    const army = P.units.filter(u => u.type !== 'worker' && !u.isHero);
    if (army.length < 2) return false;
    const probe = army.slice(0, Math.min(2, army.length));
    const target = enemy.structures[0] || enemy.units[0];
    if (target) probe.forEach(u => { if (typeof u.setTarget === 'function') u.setTarget(target); });
    if (enemy.units.length > army.length) {
      probe.forEach(u => { if (typeof u.setTarget === 'function') u.setTarget(P.structures[0]); });
    }
    return true;
  }

  // Scenario 6: simple learning mechanism adjusting unit composition
  recordBattleOutcome(result) {
    const P = this.player;
    if (!P.aiPlan) return;
    P.aiPlan.battleHistory.push(result);
    if (P.aiPlan.battleHistory.length > 5) P.aiPlan.battleHistory.shift();
  }

  updateLearning() {
    const P = this.player;
    if (!P.aiPlan || !P.aiPlan.battleHistory.length) return false;
    const wins = P.aiPlan.battleHistory.filter(Boolean).length;
    const losses = P.aiPlan.battleHistory.length - wins;
    if (losses > wins) {
      P.aiPlan.comp.archer = Math.min(P.aiPlan.comp.archer + 0.1, 1);
      P.aiPlan.comp.soldier = Math.max(0, 1 - P.aiPlan.comp.archer - P.aiPlan.comp.mage);
    }
    P.aiPlan.battleHistory = [];
    return true;
  }

  heroActions() {
    const P = this.player;
    const { neutral, dist2 } = this.deps;
    const army = P.units.filter(u => u.type !== 'worker' && !u.isHero);
    const hero = P.hero;
    if (hero && !hero.dead) {
      if (army.length >= 2 && hero.hp > hero.maxHp * 0.6) {
        const tgt = nearestNeutralCamp(P, neutral, dist2);
        if (tgt) { hero.setTarget(tgt); }
      }
      if (hero.targetId) {
        const idx = hero.inventory.findIndex(it => it.startsWith('scroll_'));
        if (idx >= 0) {
          if (globalThis.applyItem) globalThis.applyItem(hero, hero.inventory[idx]);
          hero.inventory.splice(idx, 1);
        }
      }
      return true;
    }
    return false;
  }

  earlyArmyFarm() {
    const P = this.player;
    const { neutral, dist2 } = this.deps;
    const army = P.units.filter(u => u.type !== 'worker' && !u.isHero);
    if (army.length < 2 || army.length >= P.aiPlan.pushAt) return false;
    const camp = nearestNeutralCamp(P, neutral, dist2);
    if (!camp) return false;
    const ourP = packPower(army);
    const campP = campPower(camp);
    if (ourP >= campP * 1.2) {
      army.forEach(u => { if (!u.retreat) u.setTarget(camp); });
      return true;
    }
    return false;
  }

  engage() {
    const P = this.player;
    const { players } = this.deps;
    const army = P.units.filter(u => u.type !== 'worker' && !u.isHero);
    if (!army.length) return false;
    const enemies = players
      .filter((pl, i) =>
        i !== this.id && !(pl.teamId !== undefined && P.teamId !== undefined && pl.teamId === P.teamId)
      )
      .flatMap(pl => pl.units.filter(u => !u.dead));
    const ourP = packPower(army);
    const enemyP = packPower(enemies);
    if (enemyP > ourP * 1.2) {
      army.forEach(a => {
        a.retreat = true;
        if (P.structures[0] && typeof a.setTarget === 'function') a.setTarget(P.structures[0]);
      });
      return true;
    }
    for (const u of army) {
      const seen = enemies.filter(e => Math.hypot(e.x - u.x, e.y - u.y) < u.vision);
      if (seen.length) {
        const enemyCount = seen.length;
        const myCount = army.filter(a => Math.hypot(a.x - u.x, a.y - u.y) < u.vision).length;
        if (myCount > enemyCount) {
          army.forEach(a => { if (!a.retreat) a.setTarget(seen[0]); });
          return true;
        }
        break;
      }
    }
    return false;
  }

  rallyAttack() {
    const P = this.player;
    const { players } = this.deps;
    const army = P.units.filter(u => u.type !== 'worker' && !u.isHero);
    if (army.length >= P.aiPlan.pushAt) {
      let best = null;
      let bestDef = Infinity;
      players.forEach((pl, idx) => {
        if (idx === this.id) return;
        if (pl.teamId !== undefined && P.teamId !== undefined && pl.teamId === P.teamId) return;
        const check = target => {
          if (!target || target.isGhost || target.dead) return;
          const def = target.hp || target.defense || 0;
          if (def < bestDef) { bestDef = def; best = target; }
        };
        check(pl.hero && !pl.hero.dead ? pl.hero : null);
        pl.structures.forEach(s => { if (!s.dead && !s.isGhost) check(s); });
        pl.units.forEach(u => { if (!u.isHero && !u.dead && !u.isGhost) check(u); });
      });
      if (best) {
        army.forEach(u => { if (!u.retreat) u.setTarget(best); });
        if (DEBUG_AI) console.log('rally target', best.kind || 'unit');
        return true;
      }
      return false;
    }
    return false;
  }

  completeGhosts() {
    const P = this.player;
    const ghosts = P.structures.filter(s => s.isGhost);
    let acted = false;
    for (const g of ghosts) {
      if (g.progress >= 100) {
        g.isGhost = false;
        const w = P.units.find(u => u.id === g.buildWorkerId);
        if (w) {
          w.state = 'idle';
          delete w.buildTargetId;
        }
        delete g.buildWorkerId;
        acted = true;
        continue;
      }
      let w = P.units.find(u => u.type === 'worker' && u.state !== 'build');
      if (!w && g.buildWorkerId) w = P.units.find(u => u.id === g.buildWorkerId);
      if (w) {
        w.state = 'build';
        w.buildTargetId = g.id;
        g.buildWorkerId = w.id;
        acted = true;
      }
    }
    return acted;
  }
}

function nearestNeutralCamp(P, neutral, dist2) {
  if (!P.structures.length || !neutral) return null;
  const list = neutral.camps || neutral.units || [];
  if (!list.length) return null;
  const origin = P.structures[0];
  let best = null;
  let bestDist = Infinity;
  for (const n of list) {
    const x = n.x || 0;
    const y = n.y || 0;
    const d = dist2(origin.x, origin.y, x, y);
    if (d < bestDist) { bestDist = d; best = n; }
  }
  return best;
}

export { AIController, aiInitPlan, nearestNeutralCamp, DIFFICULTY_CONFIG };
Object.assign(globalThis, { AIController, aiInitPlan, nearestNeutralCamp, DIFFICULTY_CONFIG });
