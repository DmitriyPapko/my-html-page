/* ==== Simple terrain + blockers (лес/река) ==== */
// Генерим «реки» (непроходимые) как вертикальные полосы и «лес» как кучки препятствий
const blockers = []; // {x,y,r}
function genBlockers() {
  const { rand, clamp, world } = globalThis;
  blockers.length = 0;
  for (let i = 0; i < 4; i++) {
    const x = 2000 + i * 2500 + rand(-400, 400);
    for (let y = 600; y < world.height - 600; y += 180) {
      blockers.push({ x: x + rand(-60, 60), y: y, r: 38 });
    }
  }
  for (let i = 0; i < 70; i++) {
    blockers.push({ x: rand(600, world.width - 600), y: rand(600, world.height - 600), r: clamp(rand(24, 60), 24, 60) });
  }
}
function drawTerrain() {
  const { ctx, world, cvs, worldToScreen } = globalThis;
  ctx.save(); ctx.scale(world.zoom, world.zoom);
  const step = 96;
  const startX = Math.floor(world.camX / step) * step,
        startY = Math.floor(world.camY / step) * step,
        endX = world.camX + cvs.width / world.zoom,
        endY = world.camY + cvs.height / world.zoom;
  for (let y = startY; y <= endY; y += step) {
    for (let x = startX; x <= endX; x += step) {
      const h = ((Math.sin(x * 0.0006) + Math.cos(y * 0.0007)) * 0.5 + 0.5);
      let r = 18, g = 58, b = 20; if (h > 0.9) { r = 80; g = 82; b = 90; }
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x - world.camX, y - world.camY, step, step);
    }
  }
  // реки/лес
  for (const b of blockers) {
    const s = worldToScreen(b.x, b.y);
    ctx.fillStyle = 'rgba(30,80,120,.9)'; ctx.beginPath();
    ctx.arc(s.x, s.y, b.r * world.zoom, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();
  }
  ctx.restore();
}
function isBlocked(wx, wy) {
  const { dist2 } = globalThis;
  for (const b of blockers) {
    if (dist2(wx, wy, b.x, b.y) <= (b.r + 10) * (b.r + 10)) return true;
  }
  return false;
}
Object.assign(globalThis, { blockers, genBlockers, drawTerrain, isBlocked });
