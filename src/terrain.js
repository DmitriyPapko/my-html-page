/* ==== Simple terrain + blockers (лес/река) ==== */
import { drawSprite, toPixel } from './sprites.js';

// Генерим «реки» (непроходимые) как вертикальные полосы и «лес» как кучки препятствий
const blockers = []; // {x,y,r,kind}

// pre-rendered tiles
const TILE = 64;
const grassTile = document.createElement('canvas');
grassTile.width = grassTile.height = TILE;
const gctx = grassTile.getContext('2d');
gctx.imageSmoothingEnabled = false;
drawSprite(gctx, 'grass', TILE / 2, TILE / 2, { scale: 4 });

const waterTile = document.createElement('canvas');
waterTile.width = waterTile.height = TILE;
const wctx = waterTile.getContext('2d');
wctx.imageSmoothingEnabled = false;
drawSprite(wctx, 'water', TILE / 2, TILE / 2, { scale: 4 });

function hash(x, y) {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function genBlockers() {
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

function drawTerrain() {
  const { world, cvs, ctx } = globalThis;
  const startX = Math.floor(world.camX / TILE) * TILE;
  const startY = Math.floor(world.camY / TILE) * TILE;
  const endX = world.camX + cvs.width / world.zoom;
  const endY = world.camY + cvs.height / world.zoom;
  for (let y = startY; y <= endY; y += TILE) {
    for (let x = startX; x <= endX; x += TILE) {
      const sx = (x - world.camX) * world.zoom;
      const sy = (y - world.camY) * world.zoom;
      const tx = (x / TILE) | 0;
      const ty = (y / TILE) | 0;
      const img = hash(tx, ty) < 0.03 ? waterTile : grassTile;
      ctx.drawImage(img, toPixel(sx), toPixel(sy), TILE * world.zoom, TILE * world.zoom);
    }
  }
}

function drawBlockers() {
  const { world, worldToScreen, ctx } = globalThis;
  for (const b of blockers) {
    const s = worldToScreen(b.x, b.y);
    const sc = world.zoom * (b.r / 8);
    drawSprite(ctx, b.kind === 'water' ? 'water' : 'tree', s.x, s.y, { scale: sc, shadow: b.kind === 'tree' });
  }
}

function isBlocked(wx, wy) {
  const { dist2 } = globalThis;
  for (const b of blockers) {
    if (dist2(wx, wy, b.x, b.y) <= (b.r + 10) * (b.r + 10)) return true;
  }
  return false;
}
Object.assign(globalThis, { blockers, genBlockers, drawTerrain, drawBlockers, isBlocked });
export { blockers, genBlockers, drawTerrain, drawBlockers, isBlocked };
