/* ==== AI Controller ==== */
const { Selector, Sequence, Action } = require('./ai/behavior.js');

const DIFFICULTY_CONFIG = {
  easy: {
    comp: { soldier: 0.5, archer: 0.5, mage: 0.0 },
    open: ['well', 'barracks'],
    pushAt: 8,
    aggression: 0.5,
    buildInterval: 20,
  },
  normal: {
    comp: { soldier: 0.4, archer: 0.4, mage: 0.2 },
    open: ['well', 'barracks', 'range'],
    pushAt: 10,
    aggression: 0.7,
    buildInterval: 15,
  },
  hard: {
    comp: { soldier: 0.3, archer: 0.4, mage: 0.3 },
    open: ['well', 'barracks', 'range', 'mBarracks'],
    pushAt: 8,
    aggression: 1.0,
    buildInterval: 10,
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
    buildInterval: cfg.buildInterval,
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
      new Action(() => { this.ensureHQ(); return true; }),
      new Action(() => { this.buildOpenings(); return true; }),
      new Action(() => { this.maintainWorkers(); return true; }),
      new Action(() => { this.trainUnits(); return true; }),
      new Action(() => { this.heroActions(); return true; }),
      new Action(() => { this.earlyArmyFarm(); return true; }),
      new Action(() => { this.engage(); return true; }),
      new Action(() => { this.rallyAttack(); return true; }),
      new Action(() => { this.completeGhosts(); return true; }),
    ]);
  }
  think(dt) {
    if (!this.player.ai) return;
    if (!this.behavior || !this.player.aiPlan) this.init();
    this.behavior.tick({ dt, controller: this });
  }

  // Actions derived from original aiThink
  ensureHQ() {
    const P = this.player;
    const { COSTS, placeGhost, isBlocked } = this.deps;
    let HQ = P.structures.find(s => s.kind === 'hq' || s.kind === 'square');
    if (!HQ) {
      const cost = COSTS.square;
      const px = P.startX || 0, py = P.startY || 0;
      if (P.res.rice >= cost.rice && P.res.water >= cost.water && !isBlocked(px, py) && placeGhost(this.id, px, py, 'square')) {
        const g = P.structures.find(s => s.isGhost && s.kind === 'square');
        const w = P.units.find(u => u.type === 'worker');
        if (g && w) { w.state = 'build'; w.buildTargetId = g.id; }
      }
    }
  }

  buildOpenings() {
    const P = this.player;
    const { COSTS, placeGhost, isBlocked } = this.deps;
    const HQ = P.structures.find(s => s.kind === 'hq' || s.kind === 'square');
    if (P.aiPlan.nextBuild < P.aiPlan.open.length && HQ) {
      const kind = P.aiPlan.open[P.aiPlan.nextBuild];
      const cost = COSTS[kind];
      if (P.res.rice >= cost.rice && P.res.water >= cost.water) {
        const dx = (kind === 'well') ? -160 : (Math.random() < 0.5 ? 180 : -180);
        const dy = (kind === 'well') ? 120 : (Math.random() < 0.5 ? 160 : -160);
        const px = HQ.x + dx, py = HQ.y + dy;
        if (!isBlocked(px, py) && placeGhost(this.id, px, py, kind)) {
          P.aiPlan.nextBuild++;
          const g = P.structures.find(s => s.isGhost && s.kind === kind && Math.hypot(s.x - px, s.y - py) < 10);
          const w = P.units.find(u => u.type === 'worker');
          if (g && w) { w.state = 'build'; w.buildTargetId = g.id; }
        }
      }
    }
  }

  maintainWorkers() {
    const P = this.player;
    const { POP_CAP } = this.deps;
    const HQ = P.structures.find(s => s.kind === 'hq' || s.kind === 'square');
    const wcount = P.units.filter(u => u.type === 'worker').length;
    if (wcount < 6 && HQ) {
      if (P.res.rice >= 50 && P.res.water >= 12 && P.units.filter(u => !u.dead && !u.isHero).length < POP_CAP) {
        HQ.queue.push('worker');
      }
    }
  }

  trainUnits() {
    const P = this.player;
    const { POP_CAP } = this.deps;
    const barr = P.structures.find(s => s.kind === 'barracks' && !s.isGhost),
      rng = P.structures.find(s => s.kind === 'range' && !s.isGhost),
      mb = P.structures.find(s => s.kind === 'mBarracks' && !s.isGhost);
    if (P.units.filter(u => !u.dead && !u.isHero).length < POP_CAP - 1) {
      const r = Math.random();
      if (barr && r < P.aiPlan.comp.soldier) barr.queue.push('soldier');
      else if (rng && r < P.aiPlan.comp.soldier + P.aiPlan.comp.archer) rng.queue.push('archer');
      else if (mb) mb.queue.push('mage');
    }
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
    }
  }

  earlyArmyFarm() {
    const P = this.player;
    const { neutral, dist2 } = this.deps;
    const army = P.units.filter(u => u.type !== 'worker' && !u.isHero);
    if (army.length >= 3 && army.length < P.aiPlan.pushAt) {
      const nt = nearestNeutralCamp(P, neutral, dist2);
      if (nt) { army.forEach(u => { if (!u.retreat) u.setTarget(nt); }); }
    }
  }

  engage() {
    const P = this.player;
    const { players } = this.deps;
    const army = P.units.filter(u => u.type !== 'worker' && !u.isHero);
    const enemyUnits = players[0].units.filter(u => !u.dead);
    for (const u of army) {
      const seen = enemyUnits.filter(e => Math.hypot(e.x - u.x, e.y - u.y) < u.vision);
      if (seen.length) {
        const enemyCount = seen.length;
        const myCount = army.filter(a => Math.hypot(a.x - u.x, a.y - u.y) < u.vision).length;
        if (myCount > enemyCount) {
          army.forEach(a => { if (!a.retreat) a.setTarget(seen[0]); });
        }
        break;
      }
    }
  }

  rallyAttack() {
    const P = this.player;
    const { players } = this.deps;
    const army = P.units.filter(u => u.type !== 'worker' && !u.isHero);
    if (army.length >= P.aiPlan.pushAt) {
      const enemyHero = players[0].hero && !players[0].hero.dead ? players[0].hero : null;
      const tgt = enemyHero || players[0].structures.find(s => !s.isGhost) || players[0].units.find(u => !u.isHero);
      if (tgt) { army.forEach(u => { if (!u.retreat) u.setTarget(tgt); }); }
    }
  }

  completeGhosts() {
    const P = this.player;
    const ghost = P.structures.find(s => s.isGhost);
    if (ghost) {
      const w = P.units.find(u => u.type === 'worker' && u.state !== 'build');
      if (w) { w.state = 'build'; w.buildTargetId = ghost.id; }
    }
  }
}

function nearestNeutralCamp(P, neutral, dist2) {
  if (!P.structures.length) return null;
  if (!neutral || !Array.isArray(neutral.units) || neutral.units.length === 0) return null;
  const origin = P.structures[0];
  let best = null;
  let bestDist = Infinity;
  for (const n of neutral.units) {
    if (n.dead) continue;
    const d = dist2(origin.x, origin.y, n.x, n.y);
    if (d < bestDist) { bestDist = d; best = n; }
  }
  return best;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIController, aiInitPlan, nearestNeutralCamp, DIFFICULTY_CONFIG };
} else {
  Object.assign(globalThis, { AIController, aiInitPlan, nearestNeutralCamp, DIFFICULTY_CONFIG });
}
