import assert from 'assert';
import { paladinHeal } from '../src/hero.js';
import BALANCE from '../src/config/balance.js';

// paladinHeal consumes mana and heals nearby allies
(() => {
  const hero = { x: 0, y: 0, mp: BALANCE.PALADIN.HEAL_COST + 10, owner: 0 };
  const allyNear = { x: BALANCE.PALADIN.HEAL_RADIUS - 10, y: 0, hp: 10, maxHp: 100, dead: false };
  const allyFar = { x: BALANCE.PALADIN.HEAL_RADIUS + 50, y: 0, hp: 20, maxHp: 100, dead: false };
  const allies = [allyNear, allyFar];
  const casted = paladinHeal(hero, allies);
  assert.strictEqual(casted, true);
  assert.strictEqual(hero.mp, 10);
  assert.strictEqual(allyNear.hp, 100);
  assert.strictEqual(allyFar.hp, 20);
})();

// Not enough mana
(() => {
  const hero = { x: 0, y: 0, mp: BALANCE.PALADIN.HEAL_COST - 1 };
  const ally = { x: 0, y: 0, hp: 0, maxHp: 100, dead: false };
  const casted = paladinHeal(hero, [ally]);
  assert.strictEqual(casted, false);
  assert.strictEqual(hero.mp, BALANCE.PALADIN.HEAL_COST - 1);
  assert.strictEqual(ally.hp, 0);
})();

console.log('Hero ability tests passed.');
