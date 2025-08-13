/* ==== Fog of war ==== */
const F_W = 180, F_H = 120;
const explored = new Uint8Array(F_W * F_H), visible = new Uint8Array(F_W * F_H);
function fogIndex(wx, wy) {
  const { clamp, world } = globalThis;
  const x = clamp(Math.floor(wx / world.width * F_W), 0, F_W - 1);
  const y = clamp(Math.floor(wy / world.height * F_H), 0, F_H - 1);
  return y * F_W + x;
}
function clearVisible() { visible.fill(0); }
function revealCircle(wx, wy, r) {
  const { clamp, world } = globalThis;
  const cx = Math.floor(wx / world.width * F_W), cy = Math.floor(wy / world.height * F_H), rr = (r / world.width * F_W), R2 = rr * rr;
  const x0 = clamp(Math.floor(cx - rr - 1), 0, F_W - 1), x1 = clamp(Math.ceil(cx + rr + 1), 0, F_W - 1);
  const y0 = clamp(Math.floor(cy - rr - 1), 0, F_H - 1), y1 = clamp(Math.ceil(cy + rr + 1), 0, F_H - 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= R2) { visible[y * F_W + x] = 1; explored[y * F_W + x] = 1; }
    }
  }
}
function isVisible(wx, wy) { return !globalThis.fogEnabled || visible[fogIndex(wx, wy)] === 1; }
function isExplored(wx, wy) { return !globalThis.fogEnabled || explored[fogIndex(wx, wy)] === 1; }
function drawFog() {
  const { fogEnabled, cvs, ctx, DPR, world } = globalThis;
  if (!fogEnabled) return;
  const w = cvs.width, h = cvs.height;
  const img = ctx.createImageData(w, h);
  for (let py = 0; py < h; py += 2) {
    for (let px = 0; px < w; px += 2) {
      const wx = (px / DPR) / world.zoom + world.camX,
            wy = (py / DPR) / world.zoom + world.camY,
            idx = fogIndex(wx, wy);
      let a = 0;
      if (!explored[idx]) a = 220; else if (!visible[idx]) a = 120;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const j = ((py + dy) * w + (px + dx)) * 4;
          img.data[j] = 0; img.data[j + 1] = 0; img.data[j + 2] = 0; img.data[j + 3] = a;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}
Object.assign(globalThis, { F_W, F_H, explored, visible, fogIndex, clearVisible, revealCircle, isVisible, isExplored, drawFog });
