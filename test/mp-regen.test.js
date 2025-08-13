const assert = require('assert');
const { Unit } = require('../src/entities.js');

global.isBlocked = () => false;
global.getById = () => null;
global.enemiesFor = () => [];
global.dist2 = () => 0;
global.players = [];
global.neutral = { units: [] };

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
