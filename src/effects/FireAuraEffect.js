export class FireAuraEffect {
  constructor({ radius, dpsPerTick, tickMs, durationMs }) {
    this.radius = radius;
    this.dpsPerTick = dpsPerTick;
    this.tickMs = tickMs;
    this.durationMs = durationMs;
    this.elapsed = 0;
    this.tickTimer = 0;
    this.done = false;
  }
  update(dt, host) {
    if (this.done) return;
    this.elapsed += dt * 1000;
    this.tickTimer += dt * 1000;
    if (this.tickTimer >= this.tickMs) {
      this.tickTimer -= this.tickMs;
      const enemies = globalThis.enemiesFor(host.owner) || [];
      const r2 = this.radius * this.radius;
      for (const e of enemies) {
        if (e.dead) continue;
        if (globalThis.dist2(host.x, host.y, e.x, e.y) <= r2) {
          e.damage(this.dpsPerTick, host.owner);
        }
      }
    }
    if (this.elapsed >= this.durationMs || host.dead) {
      this.done = true;
    }
  }
  draw(ctx, host) {
    const s = globalThis.worldToScreen(host.x, host.y);
    const zoom = globalThis.world.zoom;
    const pulse = this.radius + Math.sin(Date.now() * 0.005) * 5;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,80,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, pulse * zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

Object.assign(globalThis, { FireAuraEffect });
