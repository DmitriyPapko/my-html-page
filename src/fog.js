/* ==== Fog of war ==== */
import state from './state.js';
const F_W = 180, F_H = 120;
const explored = new Uint8Array(F_W * F_H), visible = new Uint8Array(F_W * F_H);
const fogCanvas = document.createElement('canvas');
fogCanvas.width = F_W;
fogCanvas.height = F_H;
const fogCtx = fogCanvas.getContext('2d');
const fogImg = fogCtx.createImageData(F_W, F_H);
const prevVisible = new Set();

function fogIndex(wx, wy) {
  const { clamp, world } = globalThis;
  const x = clamp(Math.floor(wx / world.width * F_W), 0, F_W - 1);
  const y = clamp(Math.floor(wy / world.height * F_H), 0, F_H - 1);
  return y * F_W + x;
}

function updatePixel(x, y) {
  const idx = y * F_W + x;
  let a = 0;
  if (!explored[idx]) a = 220; else if (!visible[idx]) a = 120;
  const j = idx * 4;
  fogImg.data[j] = 0;
  fogImg.data[j + 1] = 0;
  fogImg.data[j + 2] = 0;
  fogImg.data[j + 3] = a;
}

function commitRegion(x0, x1, y0, y1) {
  fogCtx.putImageData(fogImg, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}

function clearVisible() {
  if (!prevVisible.size) { visible.fill(0); return; }
  let minX = F_W, minY = F_H, maxX = 0, maxY = 0;
  for (const idx of prevVisible) {
    visible[idx] = 0;
    const x = idx % F_W, y = Math.floor(idx / F_W);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    updatePixel(x, y);
  }
  commitRegion(minX, maxX, minY, maxY);
  prevVisible.clear();
}

function revealCircle(wx, wy, r) {
  const { clamp, world } = globalThis;
  const cx = Math.floor(wx / world.width * F_W);
  const cy = Math.floor(wy / world.height * F_H);
  const rr = (r / world.width * F_W);
  const R2 = rr * rr;
  const x0 = clamp(Math.floor(cx - rr - 1), 0, F_W - 1);
  const x1 = clamp(Math.ceil(cx + rr + 1), 0, F_W - 1);
  const y0 = clamp(Math.floor(cy - rr - 1), 0, F_H - 1);
  const y1 = clamp(Math.ceil(cy + rr + 1), 0, F_H - 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= R2) {
        const idx = y * F_W + x;
        visible[idx] = 1;
        explored[idx] = 1;
        prevVisible.add(idx);
        updatePixel(x, y);
      }
    }
  }
  commitRegion(x0, x1, y0, y1);
}

function isVisible(wx, wy) {
  return !state.fogEnabled || visible[fogIndex(wx, wy)] === 1;
}

function isExplored(wx, wy) {
  return !state.fogEnabled || explored[fogIndex(wx, wy)] === 1;
}

function drawFog() {
  const { cvs, ctx } = globalThis;
  if (!state.fogEnabled) return;
  ctx.drawImage(fogCanvas, 0, 0, F_W, F_H, 0, 0, cvs.width, cvs.height);
}

Object.assign(globalThis, { F_W, F_H, explored, visible, fogIndex, clearVisible, revealCircle, isVisible, isExplored, drawFog });
