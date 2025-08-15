import { WC } from './themeWarcraft.js';

// Basic 9-slice style frame drawing used by Warcraft UI elements.
// The implementation here is lightweight and does not attempt to fully
// replicate the original artwork but provides a beveled dark panel with a
// golden border.
export function drawFrame(ctx, x, y, w, h, theme = WC) {
  ctx.save();
  // panel background
  ctx.fillStyle = theme.colors.panel;
  ctx.fillRect(x, y, w, h);

  // outer border
  ctx.strokeStyle = theme.colors.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  // inner bevel
  ctx.strokeStyle = theme.bevel.inner;
  ctx.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);

  // highlight on top edge
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 3);
  ctx.lineTo(x + w - 3, y + 3);
  ctx.strokeStyle = theme.bevel.highlight;
  ctx.stroke();
  ctx.restore();
}

// Generic bar helper (hp/mp/xp).
export function drawBar(ctx, x, y, w, h, color, pct) {
  ctx.save();
  ctx.fillStyle = 'black';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, (w - 2) * pct, h - 2);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
