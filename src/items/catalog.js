import FireAuraEffect from '../effects/FireAuraEffect.js';
import BALANCE from '../config/balance.js';
import { enemiesFor } from '../entities.js';

export const ITEMS = {
  scroll_fire_aura: {
    kind: 'scroll',
    spriteFrame: 'scroll_fire',
    use(hero) {
      const cfg = BALANCE.FIRE_AURA;
      hero.effects.push(new FireAuraEffect({
        radius: cfg.RADIUS,
        dpsPerTick: cfg.DPS_PER_TICK,
        tickMs: cfg.TICK_MS,
        durationMs: cfg.DURATION_MS,
        enemiesFor
      }));
    }
  }
};

export default ITEMS;
