import { drawSprite } from './sprites.js';

/* ==== Terrain generation and blockers ==== */
const blockers = []; // {x,y,r,kind}

const TILE = 64;
const grassTile = document.createElement('canvas');
grassTile.width = TILE; grassTile.height = TILE;
const gctx = grassTile.getContext('2d');
gctx.imageSmoothingEnabled = false;
drawSprite(gctx, 'grass', TILE / 2, TILE / 2, { scale: 4 });

const waterTile = document.createElement('canvas');
waterTile.width = TILE; waterTile.height = TILE;
const wctx = waterTile.getContext('2d');
wctx.imageSmoothingEnabled = false;
drawSprite(wctx, 'water', TILE / 2, TILE / 2, { scale: 4 });

const treeBase = document.createElement('canvas');
treeBase.width = 16; treeBase.height = 16;
const tctx = treeBase.getContext('2d');
tctx.imageSmoothingEnabled = false;
drawSprite(tctx, 'tree', 8, 8);

const waterBase = document.createElement('canvas');
waterBase.width = 16; waterBase.height = 16;
const wbctx = waterBase.getContext('2d');
wbctx.imageSmoothingEnabled = false;
drawSprite(wbctx, 'water', 8, 8);

function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) >>> 0;
  return h;
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
      const dx = toPixel ? toPixel(s.x) : s.x;
      const dy = toPixel ? toPixel(s.y) : s.y;
      const size = step * world.zoom;
      ctx.drawImage(grassTile, dx, dy, size, size);
      const tx = Math.floor(x / step), ty = Math.floor(y / step);
      if ((hash(tx, ty) & 255) < 10) ctx.drawImage(waterTile, dx, dy, size, size);
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
      drawShadow(topLeft.x + size / 2, topLeft.y + size * 0.75, size * 0.5);
      ctx.drawImage(treeBase, dx, dy, size, size);
    } else {
      ctx.drawImage(waterBase, dx, dy, size, size);
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
