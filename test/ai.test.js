const assert = require('assert');
const { nearestNeutralCamp, aiThink } = require('../src/ai.js');

const dist2 = (x1, y1, x2, y2) => (x1 - x2) ** 2 + (y1 - y2) ** 2;

// no structures
(() => {
  const neutral = { units: [] };
  const P = { structures: [] };
  const result = nearestNeutralCamp(P, neutral, dist2);
  assert.strictEqual(result, null);
})();

// no neutral units
(() => {
  const neutral = { units: [] };
  const P = { structures: [{ x: 0, y: 0 }] };
  const result = nearestNeutralCamp(P, neutral, dist2);
  assert.strictEqual(result, null);
})();

// chooses nearest
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

// all neutral camps dead
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

// aiThink works with injected dependencies
(() => {
  const players = [
    { units: [], structures: [], hero: null, ai: false },
    {
      units: [],
      structures: [{ kind: 'square', queue: [] }],
      hero: null,
      ai: true,
      aiPlan: { open: [], nextBuild: 0, comp: { soldier: 0, archer: 0, mage: 0 }, pushAt: 10 },
      res: { rice: 100, water: 100 },
    },
  ];
  const deps = {
    players,
    COSTS: {},
    POP_CAP: 10,
    placeGhost: () => false,
    isBlocked: () => false,
    neutral: { units: [] },
    dist2,
  };
  aiThink(0, 1, deps);
  assert.ok(players[1].structures[0].queue.includes('worker'));
})();

console.log('All tests passed.');
