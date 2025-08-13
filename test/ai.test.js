require('../src/ai.js');

globalThis.neutral = { units: [] };
globalThis.dist2 = (x1, y1, x2, y2) => (x1 - x2) ** 2 + (y1 - y2) ** 2;

const P = { structures: [] };

const result = globalThis.nearestNeutralCamp(P);
if (result === null) {
  console.log('nearestNeutralCamp returned null when no structures: OK');
} else {
  console.error('nearestNeutralCamp did not return null');
  process.exit(1);
}
