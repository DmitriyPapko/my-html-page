import { drawSprite } from '../../sprites.js';
import { WC } from '../themeWarcraft.js';
import { drawFrame } from '../warcraftRenderer.js';

let ctx, world, players, container;

export function initResourceBar(deps = {}) {
  ({ ctx, world, players } = deps);
  container = document.getElementById('resbar');
  if (!container) {
    container = document.createElement('div');
    container.id = 'resbar';
    document.body.appendChild(container);
  }
}

export function drawResourceBar() {
  if (!ctx || !players) return;
  const hero = players[0]?.hero;
  const zoom = world?.zoom || 1;
  const h = WC.sizes.resBarH * zoom;
  const w = ctx.canvas.width;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // screen space
  drawFrame(ctx, 0, 0, w, h, WC);

  // hero portrait left
  if (hero) {
    drawSprite(ctx, hero.portrait || 'soldier', WC.sizes.resBarH / 2, h / 2, {
      scale: 2 * zoom,
      anchor: 'center'
    });
  }

  ctx.fillStyle = WC.colors.text;
  ctx.font = `${14 * zoom}px monospace`;
  let x = 60 * zoom;
  const y = 30 * zoom;
  drawSprite(ctx, 'icon_rice', x, y, { scale: zoom, anchor: 'center', override: { r: WC.colors.gold } });
  x += 20 * zoom;
  ctx.fillText(String(players[0].res.rice | 0), x, y + 4 * zoom);
  x += 70 * zoom;
  drawSprite(ctx, 'icon_water', x, y, { scale: zoom, anchor: 'center', override: { w: WC.colors.mp } });
  x += 20 * zoom;
  ctx.fillText(String(players[0].res.water | 0), x, y + 4 * zoom);
  ctx.restore();
}
