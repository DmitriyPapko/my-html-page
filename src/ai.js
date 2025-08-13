/* ==== AI ==== */
function aiInitPlan(P) {
  const cls = P.hero && P.hero.heroClass;
  const plans = {
    paladin: {
      comp: { soldier: 0.6, archer: 0.4, mage: 0.0 },
      open: ['well', 'barracks', 'range'],
      state: 'farm',
      pushAt: 10,
      nextBuild: 0,
    },
    rogue: {
      comp: { soldier: 0.4, archer: 0.6, mage: 0.0 },
      open: ['well', 'range', 'barracks'],
      state: 'farm',
      pushAt: 8,
      nextBuild: 0,
    },
  };
  P.aiPlan = plans[cls] || {
    comp: { soldier: 0.2, archer: 0.4, mage: 0.4 },
    open: ['well', 'mBarracks', 'range'],
    state: 'farm',
    pushAt: 12,
    nextBuild: 0,
  };
}
function aiThink(dt, id) {
  const players = globalThis.players;
  const COSTS = globalThis.COSTS;
  const POP_CAP = globalThis.POP_CAP;
  const placeGhost = globalThis.placeGhost;
  const isBlocked = globalThis.isBlocked;
  const neutral = globalThis.neutral;
  const dist2 = globalThis.dist2;
  if (!players[id].ai) return;
  if (!players[id].aiPlan) aiInitPlan(players[id]);
  const P = players[id];
  const HQ = P.structures.find(s => s.kind === 'hq');
  // buildings
  if (P.aiPlan.nextBuild < P.aiPlan.open.length && HQ) {
    const kind = P.aiPlan.open[P.aiPlan.nextBuild]; const cost = COSTS[kind];
    if (P.res.rice >= cost.rice && P.res.water >= cost.water) {
      const dx = (kind === 'well') ? -160 : (Math.random() < 0.5 ? 180 : -180), dy = (kind === 'well') ? 120 : (Math.random() < 0.5 ? 160 : -160);
      const px = HQ.x + dx, py = HQ.y + dy; if (!isBlocked(px, py) && placeGhost(id, px, py, kind)) { P.aiPlan.nextBuild++; const g = P.structures.find(s => s.isGhost && s.kind === kind && Math.hypot(s.x - px, s.y - py) < 10); const w = P.units.find(u => u.type === 'worker'); if (g && w) { w.state = 'build'; w.buildTargetId = g.id; } }
    }
  }
  // maintain 6 workers
  const wcount = P.units.filter(u => u.type === 'worker').length;
  if (wcount < 6 && HQ) {
    if (P.res.rice >= 50 && P.res.water >= 12 && P.units.filter(u => !u.dead && !u.isHero).length < POP_CAP) { HQ.queue.push('worker'); }
  }
  // training
  const barr = P.structures.find(s => s.kind === 'barracks' && !s.isGhost),
        rng = P.structures.find(s => s.kind === 'range' && !s.isGhost),
        mb = P.structures.find(s => s.kind === 'mBarracks' && !s.isGhost);
  if (P.units.filter(u => !u.dead && !u.isHero).length < POP_CAP - 1) {
    const r = Math.random();
    if (barr && r < P.aiPlan.comp.soldier) barr.queue.push('soldier');
    else if (rng && r < P.aiPlan.comp.soldier + P.aiPlan.comp.archer) rng.queue.push('archer');
    else if (mb) mb.queue.push('mage');
  }
  // hero farms nearest neutral
  const hero = P.hero;
  if (hero && !hero.dead) {
    const tgt = nearestNeutralCamp(P, neutral, dist2);
    if (tgt) {
      hero.setTarget(tgt);
    }
  }
  // early army neutral farming
  const army = P.units.filter(u => u.type !== 'worker' && !u.isHero);
  if (army.length >= 3 && army.length < P.aiPlan.pushAt) {
    const nt = nearestNeutralCamp(P, neutral, dist2);
    if (nt) { army.forEach(u => { if (!u.retreat) u.setTarget(nt); }); }
  }
  // army rally / attack
  if (army.length >= P.aiPlan.pushAt) {
    const enemyHero = players[0].hero && !players[0].hero.dead ? players[0].hero : null;
    const tgt = enemyHero || players[0].structures.find(s => !s.isGhost) || players[0].units.find(u => !u.isHero);
    if (tgt) { army.forEach(u => { if (!u.retreat) u.setTarget(tgt); }); }
  }
  const ghost = P.structures.find(s => s.isGhost);
  if (ghost) {
    const w = P.units.find(u => u.type === 'worker' && u.state !== 'build');
    if (w) { w.state = 'build'; w.buildTargetId = ghost.id; }
  }
}
function nearestNeutralCamp(P, neutral, dist2) {
  if (!P.structures.length) {
    console.warn('nearestNeutralCamp: no structures available');
    return null;
  }
  if (!neutral || !Array.isArray(neutral.units) || neutral.units.length === 0) {
    console.warn('nearestNeutralCamp: no neutral units');
    return null;
  }
  const origin = P.structures[0];
  let best = null;
  let bestDist = Infinity;
  for (const n of neutral.units) {
    if (n.dead) continue;
    const d = dist2(origin.x, origin.y, n.x, n.y);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  return best;
}
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js/TEST environment
    module.exports = { aiInitPlan, aiThink, nearestNeutralCamp };
  } else {
    // Browser environment - expose to global scope
    Object.assign(globalThis, { aiInitPlan, aiThink, nearestNeutralCamp });
  }
