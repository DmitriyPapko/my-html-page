import { worldToScreen, world, ctx, cvs } from './camera.js';

export const weather = { type: 'sun', particles: [] };

export function setWeather(t) {
  weather.type = t;
  weather.particles.length = 0;
  if (t === 'rain') {
    for (let i = 0; i < 120; i++) weather.particles.push({ x: Math.random() * world.width, y: Math.random() * world.height });
  }
}

export function drawWeather(dt) {
  if (weather.type === 'evening') {
    ctx.fillStyle = 'rgba(255,180,100,0.08)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
  } else if (weather.type === 'rain') {
    ctx.fillStyle = 'rgba(120,120,120,0.12)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.strokeStyle = 'rgba(180,180,255,0.5)';
    ctx.beginPath();
    for (const p of weather.particles) {
      const s = worldToScreen(p.x, p.y);
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - 2 * world.zoom, s.y + 8 * world.zoom);
      p.x -= 50 * dt; p.y += 200 * dt;
      if (p.y > world.height) { p.y = 0; p.x = Math.random() * world.width; }
    }
    ctx.stroke();
  }
}
