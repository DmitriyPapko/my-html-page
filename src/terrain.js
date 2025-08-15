import { drawSprite, SPRITES } from './sprites.js';
import { WATER, RICE } from './config/visual.js';

/* ==== Terrain generation and blockers ==== */
const blockers = []; // {x,y,r,kind}

const TILE = 64;
const grassTile = document.createElement('canvas');
grassTile.width = TILE; grassTile.height = TILE;
const gctx = grassTile.getContext('2d');
gctx.imageSmoothingEnabled = false;
if (globalThis.FRAMES?.grass_A) {
  drawSprite(gctx, 'grass_A', TILE / 2, TILE / 2, { scale: 2 });
} else {
  drawSprite(gctx, 'grass', TILE / 2, TILE / 2, { scale: 4 });
}

const waterTile = document.createElement('canvas');
waterTile.width = TILE; waterTile.height = TILE;
const wctx = waterTile.getContext('2d');
wctx.imageSmoothingEnabled = false;
const grad = wctx.createLinearGradient(0, 0, 0, TILE);
grad.addColorStop(0, '#1e5799');
grad.addColorStop(1, '#08304b');
wctx.fillStyle = grad;
wctx.fillRect(0, 0, TILE, TILE);

const treeBase = document.createElement('canvas');
if (globalThis.FRAMES?.tree_oak) {
  treeBase.width = 32; treeBase.height = 32;
} else {
  treeBase.width = 16; treeBase.height = 16;
}
const tctx = treeBase.getContext('2d');
tctx.imageSmoothingEnabled = false;
if (globalThis.FRAMES?.tree_oak) {
  drawSprite(tctx, 'tree_oak', 16, 24);
} else {
  drawSprite(tctx, 'tree', 8, 8);
}

const waterBase = [];
const waterFrames = (globalThis.ANIMS?.water_loop?.length) || SPRITES.water.length;
for (let f = 0; f < waterFrames; f++) {
  const c = document.createElement('canvas');
  if (globalThis.FRAMES?.[`water_${f}`]) {
    c.width = 32; c.height = 32;
    const wbctx = c.getContext('2d');
    wbctx.imageSmoothingEnabled = false;
    drawSprite(wbctx, `water_${f}`, 16, 16);
  } else {
    c.width = 16; c.height = 16;
    const wbctx = c.getContext('2d');
    wbctx.imageSmoothingEnabled = false;
    drawSprite(wbctx, 'water', 8, 8, { frame: f });
  }
  waterBase.push(c);
}

function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) >>> 0;
  return h;
}

function drawTileSprite(ctx, tile, sx, sy, zoom) {
  if (!globalThis.drawSprite || !globalThis.FRAMES) return false;
  let name = null;

  if (tile.kind === 'water') {
    name = globalThis.nextFrame ? globalThis.nextFrame('water_loop', globalThis.simTime || 0, 8) : 'water_0';
  } else if (tile.kind === 'grass') {
    const h = (tile.x * 73856093 ^ tile.y * 19349663) & 3;
    name = h === 0 ? 'grass_flowers' : (h & 1 ? 'grass_A' : 'grass_B');
  } else if (tile.kind === 'dirt') {
    name = 'dirt';
  }

  if (!name || !globalThis.FRAMES[name]) return false;
  globalThis.drawSprite(name, sx, sy, zoom);
  return true;
}

export function genBlockers() {
  const { rand, clamp, world } = globalThis;
  blockers.length = 0;
  for (let i = 0; i < 2; i++) {
    const x = 2400 + i * 3500 + rand(-400, 400);
    for (let y = 600; y < world.height - 600; y += 180) {
      blockers.push({ x: x + rand(-60, 60), y: y, r: 38, kind: 'water' });
    }
  }
  for (let i = 0; i < 70; i++) {
    blockers.push({ x: rand(600, world.width - 600), y: rand(600, world.height - 600), r: clamp(rand(24, 60), 24, 60), kind: 'tree' });
  }
}

export function drawTerrain() {
  const { world, cvs, worldToScreen, ctx, toPixel } = globalThis;
  const step = TILE;
  const startX = Math.floor(world.camX / step) * step;
  const startY = Math.floor(world.camY / step) * step;
  const endX = world.camX + cvs.width / world.zoom;
  const endY = world.camY + cvs.height / world.zoom;
  for (let y = startY; y <= endY; y += step) {
    for (let x = startX; x <= endX; x += step) {
      const s = worldToScreen(x, y);
      const tx = Math.floor(x / step), ty = Math.floor(y / step);
      const kind = ((hash(tx, ty) & 255) < 10) ? 'water' : 'grass';
      if (!drawTileSprite(ctx, { kind, x: tx, y: ty }, s.x, s.y, world.zoom)) {
        const dx = toPixel ? toPixel(s.x) : s.x;
        const dy = toPixel ? toPixel(s.y) : s.y;
        const size = step * world.zoom;
        if (kind === 'water') {
          ctx.drawImage(waterTile, dx, dy, size, size);
          const t = (globalThis.simTime || 0) * WATER.waveSpeed;
          ctx.save();
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = '#fff';
          for (let i = 0; i < size; i += 8) {
            const ry = Math.sin((i / size + t) * Math.PI * 2) * WATER.waveAmp;
            ctx.fillRect(dx + i, dy + size / 2 + ry, 8, WATER.rippleScale * size);
          }
          ctx.restore();
        } else {
          ctx.drawImage(grassTile, dx, dy, size, size);
        }
      }
    }
  }
}

export function drawBlockers() {
  const { worldToScreen, world, ctx, drawShadow, toPixel } = globalThis;
  for (const b of blockers) {
    const size = b.r * 2 * world.zoom;
    const topLeft = worldToScreen(b.x - b.r, b.y - b.r);
    const dx = toPixel ? toPixel(topLeft.x) : topLeft.x;
    const dy = toPixel ? toPixel(topLeft.y) : topLeft.y;
    if (b.kind === 'tree') {
      const center = worldToScreen(b.x, b.y);
      drawShadow(center.x, center.y + size * 0.25, size * 0.5);
      if (!globalThis.drawSprite || !globalThis.FRAMES || !globalThis.FRAMES['tree_oak']) {
        ctx.drawImage(treeBase, dx, dy, size, size);
      } else {
        globalThis.drawSprite('tree_oak', center.x, center.y, world.zoom);
      }
    } else {
      const frame = Math.floor((globalThis.simTime || 0) * WATER.animSpeed) % waterBase.length;
      ctx.drawImage(waterBase[frame], dx, dy, size, size);
    }
  }
}

export function isBlocked(wx, wy) {
  const { dist2 } = globalThis;
  for (const b of blockers) {
    if (dist2(wx, wy, b.x, b.y) <= (b.r + 10) * (b.r + 10)) return true;
  }
  return false;
}

Object.assign(globalThis, { blockers, genBlockers, drawTerrain, drawBlockers, isBlocked });
