const assert = require('assert');
const { Unit } = require('../src/entities.js');

global.isBlocked = () => false;
global.getById = () => null;
global.enemiesFor = () => [];
global.dist2 = () => 0;
global.players = [];
global.neutral = { units: [] };
global.riceNodes = [{ id: 1, x: 10, y: 0 }];
global.waterNodes = [];

// mp regenerates up to max
(() => {
  const u = new Unit(0, 0, 0, 'soldier');
  u.maxMp = 100;
  u.mp = 50;
  u.mpRegen = 5; // per frame based on regen formula
  u.update(1 / 60);
  assert.ok(Math.abs(u.mp - 55) < 0.0001);
})();

// mp does not exceed maxMp
(() => {
  const u = new Unit(0, 0, 0, 'soldier');
  u.maxMp = 100;
  u.mp = 98;
  u.mpRegen = 5;
  u.update(1 / 60);
  assert.strictEqual(u.mp, 100);
})();

console.log('MP regen tests passed.');

// Unit.updateWorker uses injected deps
(() => {
  global.rand = () => { throw new Error('global rand used'); };
  const fakeRand = () => 0;
  let blocked = 0;
  const isBlocked = () => { blocked++; return false; };
  const players = [
    null,
    { structures: [{ kind: 'square', x: 0, y: 0 }], res: { rice: 0, water: 0 } },
  ];
  const u = new Unit(0, 0, 1, 'worker', { rand: fakeRand, isBlocked, players });
  u.role = 'rice';
  u.state = 'idle';
  u.updateWorker(0.1); // sets destination
  u.updateWorker(1);   // moves and calls isBlocked
  assert.strictEqual(u.destX, 10);
  assert.strictEqual(u.destY, 0);
  assert.ok(blocked > 0);
})();
