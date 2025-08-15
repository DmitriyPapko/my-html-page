import assert from 'assert';
import FireAuraEffect from '../src/effects/FireAuraEffect.js';

// FireAuraEffect damages enemies each tick and stops after duration
(() => {
  const enemy = { x: 50, y: 0, dead: false, hp: 100, damage(d) { this.hp -= d; } };
  const enemiesFor = () => [enemy];
  const effect = new FireAuraEffect({ radius: 100, dpsPerTick: 10, tickMs: 100, durationMs: 200, enemiesFor });
  const host = { x: 0, y: 0, owner: 0, dead: false };
  effect.update(0.1, host); // tick 1
  assert.strictEqual(enemy.hp, 90);
  effect.update(0.1, host); // tick 2 and end
  assert.strictEqual(enemy.hp, 80);
  effect.update(0.1, host); // no more damage after done
  assert.strictEqual(enemy.hp, 80);
})();

console.log('Effect tests passed.');
