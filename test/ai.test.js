const assert = require('assert');
const { AIController, nearestNeutralCamp, DIFFICULTY_CONFIG } = require('../src/ai.js');

const dist2 = (x1, y1, x2, y2) => (x1 - x2) ** 2 + (y1 - y2) ** 2;

// nearestNeutralCamp tests remain
(() => {
  const neutral = { units: [] };
  const P = { structures: [] };
  const result = nearestNeutralCamp(P, neutral, dist2);
  assert.strictEqual(result, null);
})();

(() => {
  const neutral = { units: [] };
  const P = { structures: [{ x: 0, y: 0 }] };
  const result = nearestNeutralCamp(P, neutral, dist2);
  assert.strictEqual(result, null);
})();

(() => {
  const neutral = {
    units: [
      { x: 10, y: 0, dead: false },
      { x: 3, y: 4, dead: false },
    ],
  };
  const P = { structures: [{ x: 0, y: 0 }] };
  const result = nearestNeutralCamp(P, neutral, dist2);
  assert.ok(result === neutral.units[1]);
})();

(() => {
  const neutral = {
    units: [
      { x: 10, y: 0, dead: true },
      { x: 3, y: 4, dead: true },
    ],
  };
  const P = { structures: [{ x: 0, y: 0 }] };
  const result = nearestNeutralCamp(P, neutral, dist2);
  assert.strictEqual(result, null);
})();

// AIController initialization and behavior for each difficulty
['easy', 'normal', 'hard'].forEach(level => {
  const players = [
    { units: [], structures: [], hero: null, ai: false },
    {
      units: [],
      structures: [{ kind: 'square', queue: [] }],
      hero: null,
      ai: true,
      aiPlan: null,
      res: { rice: 100, water: 100 },
    },
  ];
  const deps = {
    players,
    COSTS: { square: { rice: 0, water: 0 }, well: { rice: 0, water: 0 }, barracks: { rice: 0, water: 0 }, range: { rice: 0, water: 0 }, mBarracks: { rice: 0, water: 0 } },
    POP_CAP: 10,
    placeGhost: () => false,
    isBlocked: () => false,
    neutral: { units: [] },
    dist2,
  };
  const controller = new AIController(1, deps);
  controller.setDifficulty(level);
  controller.init();
  assert.strictEqual(players[1].aiPlan.pushAt, DIFFICULTY_CONFIG[level].pushAt);
  controller.think(0);
  assert.ok(players[1].structures[0].queue.includes('worker'));
});

// Scenario 1: defense mode engages nearby threats
(() => {
  const enemyUnit = { id: 99, x: 5, y: 5, dead: false };
  const soldier = { type: 'soldier', x: 0, y: 0, setTarget(t) { this.target = t; } };
  const players = [
    { units: [enemyUnit], structures: [], hero: null, ai: false },
    {
      units: [soldier],
      structures: [{ id: 1, kind: 'square', x: 0, y: 0, queue: [], hp: 100, maxHp: 100 }],
      hero: null,
      ai: true,
      aiPlan: null,
      res: { rice: 100, water: 100 },
    },
  ];
  const deps = {
    players,
    COSTS: { square: { rice: 0, water: 0 }, well: { rice: 0, water: 0 }, barracks: { rice: 0, water: 0 }, range: { rice: 0, water: 0 }, mBarracks: { rice: 0, water: 0 } },
    POP_CAP: 10,
    placeGhost: () => false,
    isBlocked: () => false,
    neutral: { units: [] },
    dist2,
  };
  const controller = new AIController(1, deps);
  controller.init();
  controller.defendBase();
  assert.strictEqual(soldier.target, enemyUnit);
})();

// Scenario 3: worker redistribution swaps roles based on resources
(() => {
  const workerRice = { type: 'worker', role: 'rice', state: 'gather' };
  const workerWater = { type: 'worker', role: 'water', state: 'gather' };
  const players = [
    { units: [], structures: [], hero: null, ai: false },
    {
      units: [workerRice, workerWater],
      structures: [{ kind: 'square', queue: [] }],
      hero: null,
      ai: true,
      aiPlan: null,
      res: { rice: 300, water: 50 },
    },
  ];
  const deps = {
    players,
    COSTS: { square: { rice: 0, water: 0 }, well: { rice: 0, water: 0 }, barracks: { rice: 0, water: 0 }, range: { rice: 0, water: 0 }, mBarracks: { rice: 0, water: 0 } },
    POP_CAP: 10,
    placeGhost: () => false,
    isBlocked: () => false,
    neutral: { units: [] },
    dist2,
  };
  const controller = new AIController(1, deps);
  controller.init();
  controller.redistributeWorkers();
  assert.strictEqual(workerRice.role, 'water');
})();

// Scenario 6: learning adjusts composition after losses
(() => {
  const players = [
    { units: [], structures: [], hero: null, ai: false },
    {
      units: [],
      structures: [{ kind: 'square', queue: [] }],
      hero: null,
      ai: true,
      aiPlan: null,
      res: { rice: 100, water: 100 },
    },
  ];
  const deps = {
    players,
    COSTS: { square: { rice: 0, water: 0 }, well: { rice: 0, water: 0 }, barracks: { rice: 0, water: 0 }, range: { rice: 0, water: 0 }, mBarracks: { rice: 0, water: 0 } },
    POP_CAP: 10,
    placeGhost: () => false,
    isBlocked: () => false,
    neutral: { units: [] },
    dist2,
  };
  const controller = new AIController(1, deps);
  controller.init();
  const before = players[1].aiPlan.comp.archer;
  controller.recordBattleOutcome(false); // simulate loss
  controller.updateLearning();
  assert.ok(players[1].aiPlan.comp.archer >= before);
})();

console.log('All tests passed.');
