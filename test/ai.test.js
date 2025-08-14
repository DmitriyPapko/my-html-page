import assert from 'assert';
import { AIController, nearestNeutralCamp } from '../src/ai.js';
import { packPower, campPower } from '../src/config/ai.js';

const dist2 = (x1, y1, x2, y2) => (x1 - x2) ** 2 + (y1 - y2) ** 2;

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
  ai.buildOpenings(0); // build well
  players[1].units[0].state = 'idle';
  ai.buildOpenings(6); // attempt barracks but blocked after timer
  ai.buildOpenings(1); // cooldown and retry
  ai.buildOpenings(0); // fallback placement
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
  ai.trainUnits(1); // soldier to reach minimum
  players[1].units.push({ type: 'soldier' });
  ai.trainUnits(1); // archer next
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
  ai.earlyArmyFarm();
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
  ai.engage();
  assert.ok(our1.retreat);
  assert.ok(our2.retreat);
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
  ai.rallyAttack();
  assert.strictEqual(unit.target, weak);
})();

console.log('All tests passed.');
