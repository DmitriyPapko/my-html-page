import { drawSprite } from '../../sprites.js';
import { WC } from '../themeWarcraft.js';
import { drawFrame } from '../warcraftRenderer.js';

let ctx, world, players, container, buttons = [];

export function initCommandCard(deps = {}) {
  ({ ctx, world, players } = deps);
  container = document.getElementById('commandcard');
  if (!container) {
    container = document.createElement('div');
    container.id = 'commandcard';
    document.body.appendChild(container);
  }
  container.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('button');
    b.textContent = '';
    b.dataset.idx = i + 1;
    b.style.pointerEvents = 'auto';
    b.onclick = () => {
      if (i < 3 && globalThis.tryCast) globalThis.tryCast(i + 1);
    };
    container.appendChild(b);
    buttons.push(b);
  }
}

export function drawCommandCard() {
  if (!ctx || !players) return;
  const zoom = world?.zoom || 1;
  const size = WC.sizes.cmdBtn;
  const w = size * 3 + WC.gap * 4;
  const h = size * 3 + WC.gap * 4;
  const x = ctx.canvas.width - w - 10 * zoom;
  const y = ctx.canvas.height - h - 10 * zoom;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawFrame(ctx, x, y, w, h, WC);

  const hero = players[0]?.hero;
  if (hero) {
    const icons = ['icon_attack', 'icon_armor', 'icon_scroll'];
    for (let i = 0; i < 3; i++) {
      const bx = x + WC.gap + (i % 3) * (size + WC.gap);
      const by = y + WC.gap;
      drawFrame(ctx, bx, by, size, size, WC);
      drawSprite(ctx, icons[i], bx + size / 2, by + size / 2, { scale: zoom, anchor: 'center' });
    }
  }
  ctx.restore();
}
