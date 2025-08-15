import BALANCE from './config/balance.js';
import { dist2 } from './utils.js';

export function paladinHeal(hero, allies) {
  if (hero.mp < BALANCE.PALADIN.HEAL_COST) return false;
  hero.mp -= BALANCE.PALADIN.HEAL_COST;
  const r2 = BALANCE.PALADIN.HEAL_RADIUS ** 2;
  for (const u of allies) {
    if (u.dead) continue;
    if (dist2(hero.x, hero.y, u.x, u.y) <= r2) {
      u.hp = Math.min(u.maxHp, u.hp + BALANCE.PALADIN.HEAL_AMOUNT);
    }
  }
  return true;
}

export function paladinShield(hero) {
  if (hero.mp < BALANCE.PALADIN.SHIELD_COST) return false;
  hero.mp -= BALANCE.PALADIN.SHIELD_COST;
  hero.shield = (hero.shield || 0) + BALANCE.PALADIN.SHIELD_AMOUNT;
  return true;
}

export function paladinFlash(hero, allies, enemies) {
  if (hero.mp < BALANCE.PALADIN.FLASH_COST) return false;
  hero.mp -= BALANCE.PALADIN.FLASH_COST;
  const r2 = BALANCE.PALADIN.FLASH_RADIUS ** 2;
  for (const u of allies) {
    if (dist2(hero.x, hero.y, u.x, u.y) <= r2) {
      u.hp = Math.min(u.maxHp, u.hp + BALANCE.PALADIN.FLASH_HEAL);
    }
  }
  for (const e of enemies) {
    if (dist2(hero.x, hero.y, e.x, e.y) <= r2) {
      if (typeof e.damage === 'function') e.damage(BALANCE.PALADIN.FLASH_DAMAGE, hero.owner);
    }
  }
  return true;
}

export function tryCast(hero, slot, deps) {
  const { players, input, screenToWorld, beep, enemies } = deps;
  if (!hero || hero.dead) return;
  if (slot === 1 && hero.cd1 <= 0) {
    let ok = false;
    if (hero.heroClass === 'paladin') {
      ok = paladinHeal(hero, players[hero.owner].units);
      if (ok) beep(660, 0.08, 'triangle', 0.05);
    } else if (hero.heroClass === 'rogue') {
      if (hero.mp >= BALANCE.ROGUE.SPRINT_COST) {
        hero.mp -= BALANCE.ROGUE.SPRINT_COST;
        hero.speedBuff = BALANCE.ROGUE.SPRINT_SPEED;
        ok = true;
        beep(880, 0.06, 'square', 0.05);
      }
    } else {
      if (hero.mp >= BALANCE.ARCHMAGE.BLAST_COST) {
        hero.mp -= BALANCE.ARCHMAGE.BLAST_COST;
        const p = screenToWorld(input.x, input.y);
        const r2 = BALANCE.ARCHMAGE.BLAST_RADIUS ** 2;
        for (const u of enemies()) {
          if (u.dead) continue;
          if (dist2(p.x, p.y, u.x, u.y) <= r2) u.damage(BALANCE.ARCHMAGE.BLAST_DAMAGE, hero.owner);
        }
        ok = true;
        beep(520, 0.08, 'sawtooth', 0.06);
      }
    }
    if (ok) { hero.cd1 = hero.cdM1; }
    return ok;
  }
  if (slot === 2 && hero.cd2 <= 0) {
    let ok = false;
    if (hero.heroClass === 'paladin') {
      ok = paladinShield(hero);
      if (ok) beep(280, 0.08, 'triangle', 0.05);
    } else if (hero.heroClass === 'rogue') {
      if (hero.mp >= BALANCE.ROGUE.WHIRL_COST) {
        hero.mp -= BALANCE.ROGUE.WHIRL_COST;
        const r2 = BALANCE.ROGUE.WHIRL_RADIUS ** 2;
        for (const e of enemies()) {
          if (e.dead) continue;
          if (dist2(hero.x, hero.y, e.x, e.y) <= r2) e.damage(BALANCE.ROGUE.WHIRL_DAMAGE, hero.owner);
        }
        ok = true;
        beep(720, 0.08, 'square', 0.06);
      }
    } else {
      if (hero.mp >= BALANCE.ARCHMAGE.ELEMENTAL_COST) {
        hero.mp -= BALANCE.ARCHMAGE.ELEMENTAL_COST;
        const e = deps.createUnit(hero.x + 24, hero.y, hero.owner, 'elemental');
        e.dps = BALANCE.ARCHMAGE.ELEMENTAL_DPS;
        e.maxHp = BALANCE.ARCHMAGE.ELEMENTAL_HP;
        e.hp = BALANCE.ARCHMAGE.ELEMENTAL_HP;
        e.attackRange = BALANCE.ARCHMAGE.ELEMENTAL_RANGE;
        e.summonTimer = BALANCE.ARCHMAGE.ELEMENTAL_DURATION;
        players[hero.owner].units.push(e);
        ok = true;
        beep(480, 0.09, 'sawtooth', 0.06);
      }
    }
    if (ok) { hero.cd2 = hero.cdM2; }
    return ok;
  }
  if (slot === 3 && hero.cd3 <= 0) {
    let ok = false;
    if (hero.heroClass === 'paladin') {
      ok = paladinFlash(hero, players[hero.owner].units, enemies());
      if (ok) beep(560, 0.09, 'triangle', 0.06);
    } else if (hero.heroClass === 'rogue') {
      if (hero.mp >= BALANCE.ROGUE.SHADOW_COST) {
        hero.mp -= BALANCE.ROGUE.SHADOW_COST;
        const r2 = BALANCE.ROGUE.SHADOW_RADIUS ** 2;
        for (const e of enemies()) {
          if (e.dead) continue;
          if (dist2(hero.x, hero.y, e.x, e.y) <= r2) {
            e.damage(BALANCE.ROGUE.SHADOW_DAMAGE, hero.owner);
            e.slow = BALANCE.ROGUE.SHADOW_SLOW;
          }
        }
        ok = true;
        beep(900, 0.07, 'square', 0.06);
      }
    } else {
      if (hero.mp >= BALANCE.ARCHMAGE.DEMON_COST) {
        hero.mp -= BALANCE.ARCHMAGE.DEMON_COST;
        const d = deps.createUnit(hero.x + 28, hero.y + 12, hero.owner, 'demon');
        d.dps = BALANCE.ARCHMAGE.DEMON_DPS;
        d.maxHp = BALANCE.ARCHMAGE.DEMON_HP;
        d.hp = BALANCE.ARCHMAGE.DEMON_HP;
        d.attackRange = BALANCE.ARCHMAGE.DEMON_RANGE;
        d.summonTimer = BALANCE.ARCHMAGE.DEMON_DURATION;
        players[hero.owner].units.push(d);
        ok = true;
        beep(360, 0.12, 'sawtooth', 0.07);
      }
    }
    if (ok) { hero.cd3 = hero.cdM3; }
    return ok;
  }
}

export default { tryCast, paladinHeal, paladinShield, paladinFlash };
