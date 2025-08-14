import { FireAuraEffect } from '../effects/FireAuraEffect.js';

export const ITEMS = {
  scroll_fire_aura: {
    kind: 'scroll',
    spriteFrame: 'scroll_fire',
    use(hero) {
      hero.effects.push(new FireAuraEffect({ radius: 100, dpsPerTick: 10, tickMs: 1000, durationMs: 20000 }));
    }
  }
};
