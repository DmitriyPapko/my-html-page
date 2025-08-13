/* ==== Simple terrain + blockers (лес/река) ==== */
// Генерим «реки» (непроходимые) как вертикальные полосы и «лес» как кучки препятствий
const blockers = []; // {x,y,r,kind}
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
  const { world, cvs, worldToScreen } = globalThis;
  const step = 64;
  const startX = Math.floor(world.camX / step) * step,
        startY = Math.floor(world.camY / step) * step,
        endX = world.camX + cvs.width / world.zoom,
        endY = world.camY + cvs.height / world.zoom;
  for (let y = startY; y <= endY; y += step) {
    for (let x = startX; x <= endX; x += step) {
      const s = worldToScreen(x + step / 2, y + step / 2);
      globalThis.drawSprite('grass', s.x, s.y, world.zoom * 4);
    }
  }
  // реки/лес
  for (const b of blockers) {
    const s = worldToScreen(b.x, b.y);
    const sc = world.zoom * (b.r / 8);
    globalThis.drawSprite(b.kind === 'water' ? 'water' : 'tree', s.x, s.y, sc);
  }
}
function isBlocked(wx, wy) {
  const { dist2 } = globalThis;
  for (const b of blockers) {
    if (dist2(wx, wy, b.x, b.y) <= (b.r + 10) * (b.r + 10)) return true;
  }
  return false;
}
Object.assign(globalThis, { blockers, genBlockers, drawTerrain, isBlocked });
