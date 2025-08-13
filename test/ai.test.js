const assert = require('assert');
const { nearestNeutralCamp } = require('../src/ai.js');

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

console.log('All tests passed.');
