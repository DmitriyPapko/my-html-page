import { drawSprite } from '../../sprites.js';
import { WC } from '../themeWarcraft.js';
import { drawFrame, drawBar } from '../warcraftRenderer.js';

let ctx, world, players, container, slots = [];

export function initHeroPanel(deps = {}) {
  ({ ctx, world, players } = deps);
  container = document.getElementById('heropanel');
  if (!container) {
    container = document.createElement('div');
    container.id = 'heropanel';
    document.body.appendChild(container);
  }
  // build inventory DOM slots
  container.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div');
    s.className = 'slot';
    s.dataset.slot = i;
    s.style.pointerEvents = 'auto';
    container.appendChild(s);
    slots.push(s);
  }
}

export function drawHeroPanel() {
  if (!ctx || !players) return;
  const hero = players[0]?.hero;
  if (!hero) return;
  const zoom = world?.zoom || 1;
  const w = 380 * zoom;
  const h = WC.sizes.panelH * zoom;
  const x = 10 * zoom;
  const y = ctx.canvas.height - h - 10 * zoom;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawFrame(ctx, x, y, w, h, WC);

  // portrait
  drawSprite(ctx, hero.portrait || 'soldier', x + WC.sizes.portrait / 2, y + WC.sizes.portrait / 2, {
    scale: 3 * zoom / 2,
    anchor: 'center'
  });

  ctx.fillStyle = WC.colors.text;
  ctx.font = `${14 * zoom}px sans-serif`;
  ctx.fillText(`${hero.heroName || 'Герой'} L${hero.level}`, x + WC.sizes.portrait + 10 * zoom, y + 18 * zoom);

  // HP/MP bars
  const barW = w - WC.sizes.portrait - 20 * zoom;
  drawBar(ctx, x + WC.sizes.portrait + 10 * zoom, y + 30 * zoom, barW, 12 * zoom, WC.colors.hp, hero.hp / hero.maxHp);
  drawBar(ctx, x + WC.sizes.portrait + 10 * zoom, y + 50 * zoom, barW, 12 * zoom, WC.colors.mp, hero.mp / hero.maxMp);
  drawBar(ctx, x + WC.sizes.portrait + 10 * zoom, y + 70 * zoom, barW, 6 * zoom, WC.colors.xp, hero.exp / hero.expToNext);

  // stats icons
  const statY = y + 86 * zoom;
  drawSprite(ctx, 'icon_attack', x + WC.sizes.portrait + 10 * zoom, statY, { scale: zoom, anchor: 'center', override: { r: WC.colors.gold } });
  ctx.fillText(String(hero.dps | 0), x + WC.sizes.portrait + 24 * zoom, statY + 4 * zoom);
  drawSprite(ctx, 'icon_armor', x + WC.sizes.portrait + 60 * zoom, statY, { scale: zoom, anchor: 'center', override: { w: WC.colors.text } });
  ctx.fillText(String(hero.armor || 0), x + WC.sizes.portrait + 74 * zoom, statY + 4 * zoom);

  // inventory
  const invX = x + WC.sizes.portrait + 10 * zoom;
  const invY = y + 100 * zoom;
  const slotSize = 40 * zoom;
  for (let i = 0; i < 6; i++) {
    const ix = invX + (i % 3) * (slotSize + WC.gap);
    const iy = invY + Math.floor(i / 3) * (slotSize + WC.gap);
    drawFrame(ctx, ix, iy, slotSize, slotSize, WC);
    const item = hero.inventory?.[i];
    if (item) drawSprite(ctx, item.icon || 'icon_scroll', ix + slotSize / 2, iy + slotSize / 2, { scale: zoom, anchor: 'center' });
  }

  ctx.restore();
}
