import { drawSprite } from '../../sprites.js';
import { WC } from '../themeWarcraft.js';
import { drawFrame, drawBar } from '../warcraftRenderer.js';

let ctx, world, players;

export function initUnitCard(deps = {}) {
  ({ ctx, world, players } = deps);
}

export function drawUnitCard() {
  if (!ctx || !players) return;
  const unit = players[0]?.selectedUnit;
  if (!unit || unit.isHero) return;
  const zoom = world?.zoom || 1;
  const w = 200 * zoom;
  const h = 80 * zoom;
  const x = 10 * zoom;
  const y = ctx.canvas.height - h - WC.sizes.panelH * zoom - 20 * zoom;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawFrame(ctx, x, y, w, h, WC);
  drawSprite(ctx, unit.portrait || 'soldier', x + 32 * zoom, y + h / 2, { scale: zoom, anchor: 'center' });
  drawBar(ctx, x + 60 * zoom, y + 20 * zoom, w - 70 * zoom, 10 * zoom, WC.colors.hp, unit.hp / unit.maxHp);
  ctx.fillStyle = WC.colors.text;
  ctx.font = `${12 * zoom}px sans-serif`;
  ctx.fillText(`×${unit.count || 1}`, x + 60 * zoom, y + 50 * zoom);
  ctx.restore();
}
