require('../src/ai.js');

globalThis.neutral = { units: [] };
globalThis.dist2 = (x1, y1, x2, y2) => (x1 - x2) ** 2 + (y1 - y2) ** 2;

// no structures
const P = { structures: [] };
let result = globalThis.nearestNeutralCamp(P);
if (result === null) {
  console.log('nearestNeutralCamp returned null when no structures: OK');
} else {
  console.error('nearestNeutralCamp did not return null');
  process.exit(1);
}

// no neutral units
globalThis.neutral.units = [];
const P2 = { structures: [{ x: 0, y: 0 }] };
result = globalThis.nearestNeutralCamp(P2);
if (result === null) {
  console.log('nearestNeutralCamp returned null when no neutral units: OK');
} else {
  console.error('nearestNeutralCamp did not handle empty neutral units');
  process.exit(1);
}

// chooses nearest
globalThis.neutral.units = [
  { x: 10, y: 0, dead: false },
  { x: 3, y: 4, dead: false },
];
const P3 = { structures: [{ x: 0, y: 0 }] };
result = globalThis.nearestNeutralCamp(P3);
if (result === globalThis.neutral.units[1]) {
  console.log('nearestNeutralCamp returned nearest camp: OK');
} else {
  console.error('nearestNeutralCamp did not return nearest camp');
  process.exit(1);
}
