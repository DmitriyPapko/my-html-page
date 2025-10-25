import { WC } from './themeWarcraft.js';

// Cache of prerendered frames keyed by "widthxheight".
const frameCache = new Map();

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// Draw a Warcraft style frame using a simple 9-slice approach.  To avoid
// repeated path/gradient calculations, each frame size is cached in an
// offscreen canvas and blitted when needed.
export function drawFrame(ctx, x, y, w, h, theme = WC) {
  const key = `${w}x${h}`;
  let off = frameCache.get(key);

  if (!off) {
    // Prefer OffscreenCanvas when available for performance.
    if (typeof OffscreenCanvas !== 'undefined') {
      off = new OffscreenCanvas(w, h);
    } else if (typeof document !== 'undefined') {
      off = document.createElement('canvas');
      off.width = w;
      off.height = h;
    }

    if (off) {
      const c = off.getContext('2d');
      const r = theme.radius || 0;

      // background gradient
      const grad = c.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, theme.colors.panel);
      grad.addColorStop(1, theme.colors.obsidian || theme.colors.panel);
      c.fillStyle = grad;
      roundRectPath(c, 0, 0, w, h, r);
      c.fill();

      // outer border
      c.strokeStyle = theme.colors.gold;
      c.lineWidth = 2;
      roundRectPath(c, 1, 1, w - 2, h - 2, Math.max(0, r - 1));
      c.stroke();

      // inner bevel
      c.strokeStyle = theme.bevel.inner;
      roundRectPath(c, 3.5, 3.5, w - 7, h - 7, Math.max(0, r - 3.5));
      c.stroke();

      // highlight on top edge
      c.beginPath();
      c.moveTo(r, 3);
      c.lineTo(w - r, 3);
      c.strokeStyle = theme.bevel.highlight;
      c.stroke();

      frameCache.set(key, off);
    }
  }

  if (off) {
    ctx.drawImage(off, x, y);
  } else {
    // Fallback to immediate drawing if offscreen canvas couldn't be created
    ctx.save();
    ctx.fillStyle = theme.colors.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = theme.colors.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.strokeStyle = theme.bevel.inner;
    ctx.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 3);
    ctx.lineTo(x + w - 3, y + 3);
    ctx.strokeStyle = theme.bevel.highlight;
    ctx.stroke();
    ctx.restore();
  }
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
