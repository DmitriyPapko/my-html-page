import { clamp } from './utils.js';

export const cvs = document.getElementById('game');
export const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled = false;
export const mini = document.getElementById('minimap');
export const mctx = mini.getContext('2d');
mctx.imageSmoothingEnabled = false;

export const DPR = Math.max(1, window.devicePixelRatio || 1);
mini.width = Math.floor(mini.clientWidth * DPR);
mini.height = Math.floor(mini.clientHeight * DPR);
mctx.setTransform(DPR, 0, 0, DPR, 0, 0);

export const world = { width: 12000, height: 8000, camX: 0, camY: 0, zoom: 1.25 };

function resize() {
  const w = cvs.clientWidth, h = cvs.clientHeight;
  cvs.width = Math.floor(w * DPR);
  cvs.height = Math.floor(h * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
new ResizeObserver(resize).observe(cvs);
resize();

export function screenToWorld(sx, sy) {
  return { x: sx / world.zoom + world.camX, y: sy / world.zoom + world.camY };
}
export function worldToScreen(wx, wy) {
  return { x: (wx - world.camX) * world.zoom, y: (wy - world.camY) * world.zoom };
}
export function clampCam() {
  const vw = cvs.width / DPR / world.zoom, vh = cvs.height / DPR / world.zoom;
  world.camX = clamp(world.camX, 0, world.width - vw);
  world.camY = clamp(world.camY, 0, world.height - vh);
}

cvs.addEventListener('wheel', e => {
  e.preventDefault();
  const wx = e.offsetX / world.zoom + world.camX;
  const wy = e.offsetY / world.zoom + world.camY;
  const nz = clamp(world.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.6, 2.8);
  world.camX = wx - e.offsetX / nz;
  world.camY = wy - e.offsetY / nz;
  world.zoom = nz;
  clampCam();
}, { passive: false });

export function toPixel(v) { return Math.round(v * DPR) / DPR; }
export function drawShadow(x, y, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(toPixel(x), toPixel(y), r, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
