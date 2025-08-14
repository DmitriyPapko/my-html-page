import assert from 'assert';
import { AIController, nearestNeutralCamp } from '../src/ai.js';
import { packPower, campPower } from '../src/config/ai.js';

const dist2 = (x1, y1, x2, y2) => (x1 - x2) ** 2 + (y1 - y2) ** 2;

// ensureHQ returns false without resources then succeeds
(() => {
  const COSTS = { square: { rice: 50, water: 50 } };
  const players = [
    { units: [], structures: [], hero: null, ai: false },
    {
      units: [{ type: 'worker', state: 'idle' }],
      structures: [],
      hero: null,
      ai: true,
      aiPlan: null,
      res: { rice: 0, water: 0 },
      startX: 0,
      startY: 0,
    },
  ];
  let placed = false;
  const deps = {
    players,
    COSTS,
    POP_CAP: 10,
    placeGhost: () => { placed = true; players[1].structures.push({ kind: 'square', isGhost: true, id: 1, x: 0, y: 0, queue: [] }); return true; },
    isBlocked: () => false,
    neutral: { camps: [] },
    dist2,
    packPower,
    campPower,
  };
  const ai = new AIController(1, deps);
  ai.init();
  assert.strictEqual(ai.ensureHQ(), false);
  players[1].res.rice = 50; players[1].res.water = 50;
  assert.strictEqual(ai.ensureHQ(), true);
  assert.ok(placed);
})();

// buildOpenings waits for resources and retries next tick
(() => {
  const COSTS = { square: { rice: 0, water: 0 }, barracks: { rice: 60, water: 40 } };
  const events = [];
  const players = [
    { units: [], structures: [], hero: null, ai: false },
    {
      units: [{ type: 'worker', state: 'idle' }],
      structures: [{ kind: 'square', x: 0, y: 0, queue: [], id: 1 }],
      hero: null,
      ai: true,
      aiPlan: null,
      res: { rice: 0, water: 0 },
    },
  ];
  const deps = {
    players,
    COSTS,
    POP_CAP: 10,
    placeGhost: (id, x, y, kind) => { events.push({ x, y, kind }); players[1].structures.push({ kind, x, y, id: events.length + 1, isGhost: true, queue: [] }); return true; },
    isBlocked: () => false,
    neutral: { camps: [] },
    dist2,
    packPower,
    campPower,
  };
  const ai = new AIController(1, deps);
  ai.init();
  ai.player.aiPlan.open = ['barracks'];
  assert.strictEqual(ai.buildOpenings({ dt: 0 }), false);
  players[1].res.rice = 60; players[1].res.water = 40;
  assert.strictEqual(ai.buildOpenings({ dt: 0 }), true);
  assert.strictEqual(events[0].kind, 'barracks');
})();

// buildOpenings places well and barracks with fallback when blocked
(() => {
  const COSTS = { square: { rice: 0, water: 0 }, well: { rice: 0, water: 0 }, barracks: { rice: 0, water: 0 } };
  const events = [];
  const players = [
    { units: [], structures: [], hero: null, ai: false },
    {
      units: [{ type: 'worker', state: 'idle' }],
      structures: [{ kind: 'square', x: 0, y: 0, queue: [], id: 1 }],
      hero: null,
      ai: true,
      aiPlan: null,
      res: { rice: 100, water: 100 },
    },
  ];
  const deps = {
    players,
    COSTS,
    POP_CAP: 10,
    placeGhost: (id, x, y, kind) => {
      events.push({ x, y, kind });
      players[1].structures.push({ kind, x, y, id: events.length + 1, isGhost: true, queue: [] });
      return true;
    },
    isBlocked: (x, y) => events.length > 0 && Math.abs(x) <= 220 && Math.abs(y) <= 220,
    neutral: { camps: [] },
    dist2,
    packPower,
    campPower,
  };
  const ai = new AIController(1, deps);
  ai.init();
  assert.strictEqual(ai.buildOpenings({ dt: 0 }), true); // build well
  players[1].units[0].state = 'idle';
  assert.strictEqual(ai.buildOpenings({ dt: 6 }), false); // attempt barracks but blocked after timer
  assert.strictEqual(ai.buildOpenings({ dt: 1 }), true); // cooldown tick, no attempt
  assert.strictEqual(ai.buildOpenings({ dt: 0 }), true); // fallback placement
  assert.strictEqual(events[0].kind, 'well');
  assert.strictEqual(events[1].kind, 'barracks');
  assert.ok(Math.abs(events[1].x) > 220);
})();

// trainUnits queues soldier then archer when resources allow
(() => {
  const COSTS = { square: { rice: 0, water: 0 }, barracks: { rice: 0, water: 0 }, range: { rice: 0, water: 0 } };
  const barr = { kind: 'barracks', queue: [], isGhost: false };
  const rng = { kind: 'range', queue: [], isGhost: false };
  const players = [
    { units: [], structures: [], hero: null, ai: false },
    {
      units: [{ type: 'soldier' }, { type: 'soldier' }],
      structures: [{ kind: 'square', queue: [] }, barr, rng],
      hero: null,
      ai: true,
      aiPlan: null,
      res: { rice: 200, water: 200 },
    },
  ];
  const deps = { players, COSTS, POP_CAP: 10, placeGhost: () => false, isBlocked: () => false, neutral: { camps: [] }, dist2, packPower, campPower };
  const ai = new AIController(1, deps);
  ai.init();
  players[1].res.rice = 0; players[1].res.water = 0;
  assert.strictEqual(ai.trainUnits({ dt: 1 }), false);
  players[1].res.rice = 200; players[1].res.water = 200;
  assert.strictEqual(ai.trainUnits({ dt: 1 }), true); // soldier to reach minimum
  players[1].units.push({ type: 'soldier' });
  assert.strictEqual(ai.trainUnits({ dt: 1 }), true); // archer next
  assert.strictEqual(barr.queue[0], 'soldier');
  assert.strictEqual(rng.queue[0], 'archer');
})();

// earlyArmyFarm sends army only when strong enough and not hero alone
(() => {
  const camp = { x: 10, y: 0, units: [{ hp: 30, dps: 3 }, { hp: 30, dps: 3 }] };
  const neutral = { camps: [camp] };
  const soldier = { type: 'soldier', hp: 100, dps: 5, setTarget(t) { this.target = t; } };
  const archer = { type: 'archer', hp: 80, dps: 5, setTarget(t) { this.target = t; } };
  const hero = { isHero: true, hp: 100, dps: 10, setTarget(t) { this.target = t; } };
  const players = [
    { units: [], structures: [], hero: null, ai: false },
    {
      units: [soldier, archer, hero],
      structures: [{ kind: 'square', x: 0, y: 0 }],
      hero,
      ai: true,
      aiPlan: null,
      res: { rice: 100, water: 100 },
    },
  ];
  const deps = { players, COSTS: {}, POP_CAP: 10, placeGhost: () => false, isBlocked: () => false, neutral, dist2, packPower, campPower };
  const ai = new AIController(1, deps);
  ai.init();
  assert.strictEqual(ai.earlyArmyFarm(), true);
  assert.strictEqual(hero.target, undefined);
  assert.strictEqual(soldier.target, camp);
  assert.strictEqual(archer.target, camp);
})();

// engage retreats when enemy power overwhelming
(() => {
  const our1 = { type: 'soldier', hp: 40, dps: 4, vision: 100, setTarget(t) { this.target = t; } };
  const our2 = { type: 'archer', hp: 30, dps: 4, vision: 100, setTarget(t) { this.target = t; } };
  const enemy = { hp: 200, dps: 10, x: 0, y: 0, dead: false };
  const players = [
    { units: [enemy], structures: [], hero: null, ai: false },
    {
      units: [our1, our2],
      structures: [{ kind: 'square', x: 0, y: 0 }],
      hero: null,
      ai: true,
      aiPlan: null,
      res: { rice: 0, water: 0 },
    },
  ];
  const deps = { players, COSTS: {}, POP_CAP: 10, placeGhost: () => false, isBlocked: () => false, neutral: { camps: [] }, dist2, packPower, campPower };
  const ai = new AIController(1, deps);
  ai.init();
  assert.strictEqual(ai.engage(), true);
  assert.ok(our1.retreat);
  assert.ok(our2.retreat);
})();

// engage returns false when no enemies are around
(() => {
  const unit = { type: 'soldier', hp: 40, dps: 4, vision: 100 };
  const players = [
    { units: [], structures: [], hero: null, ai: false },
    {
      units: [unit],
      structures: [{ kind: 'square', x: 0, y: 0 }],
      hero: null,
      ai: true,
      aiPlan: null,
      res: { rice: 0, water: 0 },
    },
  ];
  const deps = { players, COSTS: {}, POP_CAP: 10, placeGhost: () => false, isBlocked: () => false, neutral: { camps: [] }, dist2, packPower, campPower };
  const ai = new AIController(1, deps);
  ai.init();
  assert.strictEqual(ai.engage(), false);
})();

// rallyAttack selects target among all enemies
(() => {
  const weak = { kind: 'square', hp: 50, isGhost: false };
  const strong = { kind: 'square', hp: 500, isGhost: false };
  const unit = { type: 'soldier', setTarget(t) { this.target = t; } };
  const players = [
    { units: [], structures: [strong], hero: null, ai: false },
    {
      units: [unit],
      structures: [{ kind: 'square', x: 0, y: 0 }],
      hero: null,
      ai: true,
      aiPlan: null,
      res: { rice: 0, water: 0 },
    },
    { units: [], structures: [weak], hero: null, ai: false },
  ];
  const deps = { players, COSTS: {}, POP_CAP: 10, placeGhost: () => false, isBlocked: () => false, neutral: { camps: [] }, dist2, packPower, campPower };
  const ai = new AIController(1, deps);
  ai.init();
  ai.player.aiPlan.pushAt = 1;
  assert.strictEqual(ai.rallyAttack(), true);
  assert.strictEqual(unit.target, weak);
})();

console.log('All tests passed.');
