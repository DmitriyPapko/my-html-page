/* ==== Entities ==== */
import state from './state.js';

export function defaultRand(min = 0, max = 1) {
  return Math.random() * (max - min) + min;
}

let nextId = 1;

function moveEntity(e, dx, dy, v, dt, isBlocked = state.isBlocked) {
  const d = Math.hypot(dx, dy);
  if (d <= 0) return;
  const nx = e.x + (dx / d) * v * dt, ny = e.y + (dy / d) * v * dt;
  if (!isBlocked(nx, ny)) { e.x = nx; e.y = ny; return; }
  const ux = -dy / d, uy = dx / d;
  const sx = e.x + ux * v * dt, sy = e.y + uy * v * dt;
  if (!isBlocked(sx, sy)) { e.x = sx; e.y = sy; return; }
  const sx2 = e.x - ux * v * dt, sy2 = e.y - uy * v * dt;
  if (!isBlocked(sx2, sy2)) { e.x = sx2; e.y = sy2; }
}

export class Entity {
  constructor(x, y, owner = -1) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.owner = owner;
    this.hp = 100;
    this.maxHp = 100;
    this.dead = false;
    this.selected = false;
    this.radius = 16;
    this.lastHitBy = null;
    this.regen = 0;
    this.shield = 0;
  }
  damage(n, killerOwner = null) {
    if (n <= 0) return;
    const take = Math.min(this.shield, n);
    this.shield -= take;
    n -= take;
    if (n > 0) {
      this.hp -= n;
      if (killerOwner != null) this.lastHitBy = killerOwner;
      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;
        this.onDeath && this.onDeath(this.lastHitBy);
      }
    }
  }
}

export class Unit extends Entity {
  constructor(x, y, owner, type = 'worker', deps = {}) {
    super(x, y, owner);
    this.deps = {
      isBlocked: deps.isBlocked || state.isBlocked || (() => false),
      rand: deps.rand || state.rand || defaultRand,
      players: deps.players || state.players || [],
    };
    this.type = type;
    this.radius = 12;
    this.speed = 150;
    this.baseSpeed = 150;
    this.destX = x;
    this.destY = y;
    this.attackRange = 28;
    this.attackCd = 0;
    this.dps = 22;
    this.vision = 480;
    this.isHero = false;
    this.mp = 0;
    this.maxMp = 0;
    this.mpRegen = 0;
    this.cd1 = 0;
    this.cd2 = 0;
    this.cd3 = 0;
    this.cdM1 = 8;
    this.cdM2 = 12;
    this.cdM3 = 20;
    this.heroClass = null;
    this.levelStacks = 0;
    this.inventory = [];
    this.targetId = null;
    this.role = null;
    this.state = 'idle';
    this.workTimer = 0;
    this.carry = 0;
    this.speedBuff = 0;
    this.slow = 0;
    this.summonTimer = 0;
    this.retreat = false;
    this.regen = 0.25;
    this.auraTimer = 0;
    this.buildTargetId = null;
    this.noteTimer = 0;
    this.nodeId = null;
    this.effects = [];
  }
  setDest(x, y) {
    this.destX = x;
    this.destY = y;
    this.state = 'move';
    this.targetId = null;
  }
  setTarget(e) {
    this.targetId = e ? e.id : null;
    this.state = e ? 'fight' : 'move';
  }
  getCurrentSpeed() {
    return this.speed * (this.speedBuff ? 1.5 : 1.0) * (this.slow ? 0.6 : 1.0);
  }
  updateWorker(dt) {
    if (this.role !== 'rice' && this.role !== 'water') return;
    const P = this.deps.players[this.owner];
    const HQ = P.structures.find(s => s.kind === 'hq' || s.kind === 'square');
    if (!HQ) { this.state = 'idle'; this.noteTimer = 2; return; }
    const node = (this.role === 'rice' ? nearestNode('rice', P) : nearestNode('water', P));
    if (!node) { this.state = 'idle'; this.noteTimer = 2; this.nodeId = null; return; }
    if (this.nodeId !== node.id && this.state !== 'to_hq') {
      this.nodeId = node.id;
      this.state = 'to_node';
      this.destX = node.x + this.deps.rand(-24, 24);
      this.destY = node.y + this.deps.rand(-24, 24);
    }
    if (this.state === 'idle') {
      this.state = 'to_node';
      this.destX = node.x + this.deps.rand(-24, 24);
      this.destY = node.y + this.deps.rand(-24, 24);
    }
    if (this.state === 'to_node') {
      const dx = this.destX - this.x, dy = this.destY - this.y, d = Math.hypot(dx, dy);
      if (d > 2) {
        const v = this.getCurrentSpeed();
        moveEntity(this, dx, dy, v, dt, this.deps.isBlocked);
      } else {
        this.state = 'harvest';
        this.workTimer = (this.role === 'rice' ? 2.2 : 2.6);
      }
    }
    if (this.state === 'harvest') {
      this.workTimer -= dt;
      if (this.workTimer <= 0) {
        this.carry = (this.role === 'rice' ? 12 : 9);
        this.state = 'to_hq';
        this.destX = HQ.x + this.deps.rand(-32, 32);
        this.destY = HQ.y + this.deps.rand(-32, 32);
      }
    }
    if (this.state === 'to_hq') {
      const dx = this.destX - this.x, dy = this.destY - this.y, d = Math.hypot(dx, dy);
      if (d > 2) {
        const v = this.getCurrentSpeed();
        moveEntity(this, dx, dy, v, dt, this.deps.isBlocked);
      } else {
        if (this.carry > 0) {
          if (this.role === 'rice') P.res.rice += this.carry;
          else P.res.water += this.carry;
          if (this.owner === 0) globalThis.updateRes();
          this.carry = 0;
        }
        this.state = 'to_node';
        this.destX = node.x + this.deps.rand(-24, 24);
        this.destY = node.y + this.deps.rand(-24, 24);
      }
    }
  }
  updateRetreat(dt) {
    if (this.owner !== 0 && !this.isHero) {
      const HQ = this.deps.players[this.owner].structures.find(s => s.kind === 'hq' || s.kind === 'square');
      if (this.hp / this.maxHp < 0.35) {
        this.retreat = true;
        if (HQ) this.setDest(HQ.x, HQ.y + 40);
      } else if (this.hp / this.maxHp > 0.8) {
        this.retreat = false;
      }
    }
  }
  updateCombat(dt, target) {
    const dx = target.x - this.x, dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d > this.attackRange) {
      const v = this.getCurrentSpeed();
        moveEntity(this, dx, dy, v, dt, this.deps.isBlocked);
    } else {
      this.attackCd -= dt;
      if (this.attackCd <= 0) {
        this.attackCd = .55;
        if (this.attackRange > 80) {
          globalThis.projectiles.push(new Projectile(this.x, this.y, target.id, this.owner, this.dps));
        } else {
          target.damage(this.dps, this.owner);
        }
        if (!globalThis.muted) globalThis.beep(220 + this.dps, 0.05, 'square', 0.03);
      }
    }
  }
  updateMovement(dt) {
    const dx = this.destX - this.x, dy = this.destY - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 2) {
      const v = this.getCurrentSpeed();
      moveEntity(this, dx, dy, v, dt, this.deps.isBlocked);
    }
  }
  update(dt) {
    if (this.dead) return;
    if (this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.regen * dt * 60);
    }
    if (this.mp < this.maxMp) {
      this.mp = Math.min(this.maxMp, this.mp + this.mpRegen * dt * 60);
    }
    if (this.auraTimer > 0) { this.auraTimer = Math.max(0, this.auraTimer - dt); }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const eff = this.effects[i];
      eff.update(dt, this);
      if (eff.done) this.effects.splice(i, 1);
    }
    this.cd1 = Math.max(0, this.cd1 - dt);
    this.cd2 = Math.max(0, this.cd2 - dt);
    this.cd3 = Math.max(0, this.cd3 - dt);
    if (this.speedBuff > 0) { this.speedBuff = Math.max(0, this.speedBuff - dt); }
    if (this.slow > 0) { this.slow = Math.max(0, this.slow - dt); }
    if (this.summonTimer > 0) { this.summonTimer -= dt; if (this.summonTimer <= 0) { this.dead = true; } }
    if (this.noteTimer > 0) { this.noteTimer = Math.max(0, this.noteTimer - dt); }
    if (this.state === 'build') {
      const target = getById(this.buildTargetId);
      if (!target || !target.isGhost) { this.state = 'idle'; this.buildTargetId = null; }
      else {
        const dx = target.x - this.x, dy = target.y - this.y, d = Math.hypot(dx, dy);
        if (d > 40) { const v = this.getCurrentSpeed(); moveEntity(this, dx, dy, v, dt, this.deps.isBlocked); }
        else { target.hp += 30 * dt; if (target.hp >= target.maxHp) { target.isGhost = false; target.hp = 520; target.maxHp = 520; this.state = 'idle'; this.buildTargetId = null; if (typeof globalThis.beep === 'function' && !globalThis.muted) globalThis.beep(300, 0.08, 'triangle', 0.05); } }
      }
      return;
    }
    if (this.type === 'worker' && !this.isHero) { this.updateWorker(dt); return; }
    this.updateRetreat(dt);
    const target = getById(this.targetId);
    if (target && !target.dead && !this.retreat) {
      this.updateCombat(dt, target);
    } else {
      this.updateMovement(dt);
    }
    if (!this.isHero) {
      const enemies = enemiesFor(this.owner);
      let best = null, bd = 1e9;
      for (const e of enemies) {
        if (e.dead) continue;
        const d = globalThis.dist2(this.x, this.y, e.x, e.y);
        if (d < bd && d <= this.vision * this.vision) { bd = d; best = e; }
      }
      if (best) { this.setTarget(best); }
    }
  }
  draw() {
    if (this.owner !== 0 && !globalThis.isVisible(this.x, this.y)) return;
    const s = globalThis.worldToScreen(this.x, this.y);
    const zoom = globalThis.world.zoom;
    const ctx = globalThis.ctx;
    const col = globalThis.players[this.owner]?.color || '#9fb2a1';
    globalThis.drawShadow(s.x, s.y + 12 * zoom, 12 * zoom);
    if (this.isHero && globalThis.nextFrame && globalThis.drawSprite && globalThis.FRAMES) {
      if (this.heroClass === 'paladin') {
        let anim = 'paladin_idle';
        if (this.dead) anim = 'paladin_death';
        else if (this.state === 'cast') anim = 'paladin_cast';
        else if (this.state === 'fight') anim = 'paladin_attack';
        else if (this.state === 'move') anim = 'paladin_walk';
        const frame = globalThis.nextFrame(
          anim,
          globalThis.simTime || 0,
          anim === 'paladin_cast' ? 12 : 10
        ) || 'paladin_idle_0';
        globalThis.drawSprite(frame, s.x, s.y, zoom);
        return;
      } else if (this.heroClass === 'rogue') {
        let anim = 'rogue_idle';
        if (this.dead) anim = 'rogue_death';
        else if (this.state === 'cast') anim = 'rogue_cast';
        else if (this.state === 'fight') anim = 'rogue_attack';
        else if (this.state === 'move') anim = 'rogue_walk';
        const frame = globalThis.nextFrame(
          anim,
          globalThis.simTime || 0,
          anim === 'rogue_cast' ? 12 : 10
        ) || 'rogue_idle_0';
        globalThis.drawSprite(frame, s.x, s.y, zoom);
        return;
      }
      let anim = 'mage_idle';
      if (this.dead) anim = 'mage_death';
      else if (this.state === 'cast') anim = 'mage_cast';
      else if (this.state === 'fight') anim = 'mage_attack';
      else if (this.state === 'move') anim = 'mage_walk';
      const frame = globalThis.nextFrame(
        anim,
        globalThis.simTime || 0,
        anim === 'mage_cast' ? 12 : 10
      ) || 'mage_idle_0';
      globalThis.drawSprite(frame, s.x, s.y, zoom);
      return;
    }
    if (this.type === 'worker' && !this.isHero && globalThis.nextFrame) {
      const movingStates = ['move', 'to_node', 'to_hq', 'build'];
      let animName = 'worker_idle';
      if (this.state === 'harvest') animName = 'worker_gather';
      else if (movingStates.includes(this.state)) animName = 'worker_walk';
      else if (this.state === 'fight') animName = 'worker_attack';
      const frame = globalThis.nextFrame(animName, globalThis.simTime || 0) || 'worker_idle_0';
      globalThis.drawSprite(frame, s.x, s.y, zoom);
    } else {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(zoom, zoom);
      const grad = ctx.createLinearGradient(0, -12, 0, 12);
      grad.addColorStop(0, '#f0f0f0');
      grad.addColorStop(1, '#bdbdbd');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -8, 8, Math.PI, 0);
      ctx.lineTo(8, 8);
      ctx.arc(0, 8, 8, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(-8, -2, 16, 4);
      // unique icons for unit types
      if (this.type === 'worker') {
        // small hammer on the side
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(10, -6);
        ctx.lineTo(14, -10);
        ctx.moveTo(10, -6);
        ctx.lineTo(14, -2);
        ctx.stroke();
      } else if (this.type === 'soldier') {
        // blade for swordsman
        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-12, 4);
        ctx.closePath();
        ctx.fill();
      } else if (this.type === 'archer') {
        // bow arc
        ctx.strokeStyle = '#da8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(12, 0, 6, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      } else if (this.type === 'mage') {
        // magic orb/staff
        ctx.fillStyle = '#8ad';
        ctx.beginPath();
        ctx.arc(0, -14, 4, 0, 6.283);
        ctx.fill();
      }
      ctx.restore();
    }
    globalThis.drawHp(s.x, s.y - 18 * zoom, this.hp / this.maxHp);
    for (const eff of this.effects) {
      if (eff.draw) eff.draw(ctx, this);
    }
    if (this.auraTimer > 0) {
      ctx.strokeStyle = 'rgba(255,215,0,0.5)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 80 * zoom, 0, 6.283);
      ctx.stroke();
    }
    if (this.isHero) {
      ctx.strokeStyle = '#ffd27a';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 14 * zoom, 0, 6.283);
      ctx.stroke();
    }
    if (this.selected) {
      ctx.strokeStyle = '#7ac8ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 16 * zoom, 0, 6.283);
      ctx.stroke();
    }
    if (this.noteTimer > 0 && this.type === 'worker') {
      ctx.fillStyle = '#ffd27a';
      ctx.font = `${12 * zoom}px sans-serif`;
      ctx.fillText('!', s.x - 3 * zoom, s.y - 20 * zoom);
    }
  }
}

export class Structure extends Entity {
  constructor(x, y, owner, kind = 'hq', ghost = false) {
    super(x, y, owner);
    this.kind = kind;
    this.isGhost = ghost;
    this.radius = 36;
    this.maxHp = ghost ? 200 : 520;
    this.hp = ghost ? 40 : 520;
    this.queue = [];
    this.qTime = 0;
    this.vision = 520;
    this.regen = 0.3;
  }
  update(dt) {
    if (this.isGhost) {
      return;
    }
    if (this.queue.length > 0) {
      if (this.qTime <= 0) this.qTime = this.queue[0] === 'hero' ? 20.0 : 2.0;
      this.qTime -= dt;
      if (this.qTime <= 0) {
        const u = this.queue.shift();
        if (u === 'hero') {
          if (!globalThis.players[this.owner].hero || globalThis.players[this.owner].hero.dead) {
            globalThis.spawnHero(this.owner, this.x + 40, this.y - 20, globalThis.players[this.owner].chosenClass);
          }
          this.qTime = 0;
        } else {
          if (globalThis.trainUnit(this.owner, this, u)) {
            this.qTime = 0;
          } else {
            this.qTime = 1.0;
            this.queue.unshift(u);
          }
        }
      }
    }
  }
  draw() {
    if (this.owner !== 0 && !globalThis.isVisible(this.x, this.y)) return;
    const s = globalThis.worldToScreen(this.x, this.y);
    const col = globalThis.players[this.owner]?.color || '#9fb2a1';
    const scale = globalThis.world.zoom * 5.25;
    const w = 16 * scale;
    globalThis.drawShadow(s.x, s.y + w / 2, w / 2);
    globalThis.drawSprite('building', s.x, s.y, scale, { o: col });
    // faction flag
    const ctx = globalThis.ctx;
    const zoom = globalThis.world.zoom;
    ctx.save();
    ctx.translate(s.x + w / 2 - 6 * zoom, s.y - w / 2 - 8 * zoom);
    ctx.scale(zoom, zoom);
    const t = performance.now() / 400;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -14);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    const wave = Math.sin(t) * 3;
    ctx.moveTo(0, -14);
    ctx.lineTo(12 + wave, -10);
    ctx.lineTo(0, -6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    globalThis.drawHp(s.x, s.y - w / 2 - 10, this.hp / this.maxHp);
    if (this.selected) {
      globalThis.ctx.strokeStyle = '#7ac8ff';
      globalThis.ctx.strokeRect(s.x - w / 2 - 4, s.y - w / 2 - 4, w + 8, w + 8);
    }
    if (this.queue.length > 0 && this.owner === 0) {
      const ctx = globalThis.ctx;
      const zoom = globalThis.world.zoom;
      const barY = s.y + w / 2 + 6 * zoom;
      const total = this.queue[0] === 'hero' ? 20.0 : 2.0;
      const prog = globalThis.clamp(1 - this.qTime / total, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(s.x - w / 2, barY, w, 4 * zoom);
      ctx.fillStyle = '#6be36b';
      ctx.fillRect(s.x - w / 2, barY, w * prog, 4 * zoom);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.strokeRect(s.x - w / 2, barY, w, 4 * zoom);
      ctx.fillStyle = '#fff';
      ctx.font = `${10 * zoom}px sans-serif`;
      ctx.fillText(this.qTime.toFixed(1), s.x - w / 2, barY - 2 * zoom);
      if (this.queue.length > 1) {
        ctx.fillText('+' + (this.queue.length - 1), s.x + w / 2 + 4 * zoom, barY + 3 * zoom);
      }
    }
  }
}

export class ResourceNode {
  constructor(x, y, type = 'rice') {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 44;
  }
  draw() {
    if (!globalThis.isExplored(this.x, this.y)) return;
    const s = globalThis.worldToScreen(this.x, this.y);
    const ctx = globalThis.ctx;
    const zoom = globalThis.world.zoom;
    const r = this.radius * zoom;
    globalThis.drawShadow(s.x, s.y + 8 * zoom, r * 0.6);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(zoom, zoom);
    ctx.lineWidth = 2;
    if (this.type === 'rice') {
      const grad = ctx.createLinearGradient(-this.radius, -this.radius, this.radius, this.radius);
      grad.addColorStop(0, '#cddc39');
      grad.addColorStop(1, '#a0b020');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
      ctx.fill();
      ctx.strokeStyle = '#3b7a3b';
      ctx.stroke();
    } else {
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
      grad.addColorStop(0, '#83b9d4');
      grad.addColorStop(1, '#5a9bb7');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
      ctx.fill();
      // animated transparent waves
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#ffffff';
      const t = Date.now() / 1000;
      for (let i = -this.radius; i <= this.radius; i += 6) {
        ctx.beginPath();
        const off = Math.sin(i * 0.3 + t * 3) * 2;
        ctx.moveTo(-this.radius, i + off);
        ctx.lineTo(this.radius, i + off);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = '#2e7d32';
      ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
      ctx.beginPath();
    }
    ctx.restore();
  }
}

export class ItemDrop extends Entity {
  constructor(x, y, kind = 'scroll_dps') {
    super(x, y, -1);
    this.kind = kind;
    this.radius = 14;
  }
  draw() {
    if (this.dead || !globalThis.isExplored(this.x, this.y)) return;
    const s = globalThis.worldToScreen(this.x, this.y);
    const colors = {
      scroll_hp: '#7cff97',
      scroll_dps: '#ffd27a',
      scroll_fire_aura: '#ff7a4d',
      ring_atk: '#8ad',
      boots: '#8ad',
      amulet: '#8ad',
      orb: '#8ad'
    };
    const col = colors[this.kind] || '#8ad';
    globalThis.drawSprite('item', s.x, s.y - 10 * globalThis.world.zoom, globalThis.world.zoom * 1.25, { r: col, R: col });
  }
}

export class Projectile extends Entity {
  constructor(x, y, targetId, owner, dmg) {
    super(x, y, owner);
    this.targetId = targetId;
    this.dmg = dmg;
    this.speed = 520;
    this.radius = 4;
  }
  update(dt) {
    const tgt = getById(this.targetId);
    if (!tgt || tgt.dead) { this.dead = true; return; }
    const dx = tgt.x - this.x, dy = tgt.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < this.speed * dt) { tgt.damage(this.dmg, this.owner); this.dead = true; }
    else { this.x += dx / d * this.speed * dt; this.y += dy / d * this.speed * dt; }
  }
  draw() {
    if (this.owner !== 0 && !globalThis.isVisible(this.x, this.y)) return;
    const s = globalThis.worldToScreen(this.x, this.y);
    globalThis.ctx.fillStyle = '#ffd27a';
    globalThis.ctx.beginPath();
    globalThis.ctx.arc(s.x, s.y, 3 * globalThis.world.zoom, 0, 6.283);
    globalThis.ctx.fill();
  }
}

export class NeutralCreep extends Entity {
  constructor(x, y, kind = 'beast') {
    super(x, y, -1);
    this.kind = kind;
    if (kind === 'mage') {
      this.maxHp = 140; this.dps = 24; this.attackRange = 260; this.leash = 340; this.tier = 1;
      this.displayName = 'Отшельник‑маг';
      this.lootTable = [{ item: 'scroll_dps', chance: 0.4 }, { item: 'orb', chance: 0.2 }];
    }
    else if (kind === 'gnome') {
      this.maxHp = 220; this.dps = 22; this.attackRange = 50; this.leash = 360; this.block = 0.25; this.tier = 2;
      this.displayName = 'Гном‑искатель';
      this.lootTable = [{ item: 'scroll_hp', chance: 0.4 }, { item: 'ring_atk', chance: 0.2 }];
    }
    else if (kind === 'troll') {
      this.maxHp = 500; this.dps = 40; this.attackRange = 40; this.leash = 380; this.tier = 3;
      this.displayName = 'Лесной тролль';
      this.lootTable = [{ item: 'boots', chance: 0.3 }, { item: 'amulet', chance: 0.15 }];
    }
    else {
      this.maxHp = 360; this.dps = 30; this.attackRange = 30; this.leash = 360; this.tier = 2; this.kind = 'beast';
      this.displayName = 'Дикий зверь';
      this.lootTable = [{ item: 'scroll_hp', chance: 0.4 }, { item: 'scroll_dps', chance: 0.2 }];
    }
    this.hp = this.maxHp;
    this.radius = 12 + 4 * (this.tier - 1);
    this.homeX = x;
    this.homeY = y;
    this.aggro = false;
    this.attackCd = 0;
    this.vision = 280 + 40 * (this.tier - 1);
    this.awarded = false;
    this.regen = 0.2;
    this.baseSpeed = 80;
  }
  damage(n, killerOwner = null) {
    if (this.kind === 'gnome' && Math.random() < 0.25) n *= 0.5;
    super.damage(n, killerOwner);
  }
  update(dt) {
    if (this.dead) return;
    let tgt = null, bd = 1e9;
    const candidates = globalThis.players[0].units.concat(globalThis.players[1].units, globalThis.players[2].units);
    for (const u of candidates) {
      if (u.dead) continue;
      const d = globalThis.dist2(this.x, this.y, u.x, u.y);
      if (d < bd) { bd = d; tgt = u; }
    }
    const md = Math.sqrt(bd);
    if (!this.aggro && md < this.leash) this.aggro = true;
    let spd = this.baseSpeed;
    if (this.kind === 'beast' && this.hp < this.maxHp * 0.4) spd *= 1.5;
    if (this.aggro && tgt && md < this.leash * 1.2) {
      if (md > this.attackRange) {
        moveEntity(this, tgt.x - this.x, tgt.y - this.y, spd, dt);
      } else {
        this.attackCd -= dt;
        if (this.attackCd <= 0) {
          this.attackCd = .65;
          tgt.damage(this.dps, -1);
        }
      }
    } else {
      const dx = this.homeX - this.x, dy = this.homeY - this.y, d = Math.hypot(dx, dy);
      if (d > 2) {
        moveEntity(this, dx, dy, spd, dt);
      }
      this.aggro = false;
    }
  }
  draw() {
    if (!globalThis.isVisible(this.x, this.y)) return;
    const s = globalThis.worldToScreen(this.x, this.y);
    const ctx = globalThis.ctx;
    const zoom = globalThis.world.zoom;
    let band = '#9fb2a1';
    if (this.kind === 'mage') band = '#8ad';
    else if (this.kind === 'gnome') band = '#b86';
    else if (this.kind === 'troll') band = '#a44';
    globalThis.drawShadow(s.x, s.y + 12 * zoom, 12 * zoom);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(zoom, zoom);
    const grad = ctx.createLinearGradient(0, -12, 0, 12);
    grad.addColorStop(0, '#f0f0f0');
    grad.addColorStop(1, '#bdbdbd');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -8, 8, Math.PI, 0);
    ctx.lineTo(8, 8);
    ctx.arc(0, 8, 8, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = band;
    ctx.fillRect(-8, -2, 16, 4);
    // small icons by type
    if (this.kind === 'mage') {
      ctx.fillStyle = '#8ad';
      ctx.beginPath();
      ctx.arc(0, -14, 4, 0, 6.283);
      ctx.fill();
    } else if (this.kind === 'gnome') {
      ctx.fillStyle = '#b86';
      ctx.fillRect(-10, -12, 8, 4);
    } else if (this.kind === 'troll') {
      ctx.fillStyle = '#a44';
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.lineTo(-2, -16);
      ctx.lineTo(2, -12);
      ctx.lineTo(8, -16);
      ctx.lineTo(8, -12);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#9fb2a1';
      ctx.beginPath();
      ctx.moveTo(-10, -12);
      ctx.lineTo(-6, -16);
      ctx.lineTo(-2, -12);
      ctx.lineTo(2, -16);
      ctx.lineTo(6, -12);
      ctx.fill();
    }
    ctx.restore();
    globalThis.drawHp(s.x, s.y - 18 * zoom, this.hp / this.maxHp);
  }
}

export function getById(id) {
  if (!id) return null;
  for (const p of state.players) {
    for (const u of p.units) { if (u.id === id) return u; }
    for (const s of p.structures) { if (s.id === id) return s; }
  }
  for (const n of state.neutral.units) { if (n.id === id) return n; }
  return null;
}

export function enemiesFor(owner) {
  const arr = [];
  for (const p of state.players) {
    if (p === state.players[owner]) continue;
    arr.push(...p.units.filter(u => !u.dead), ...p.structures.filter(s => !s.isGhost));
  }
  arr.push(...state.neutral.units);
  return arr;
}

export function allUnits() {
  return state.players[0].units.concat(state.players[1].units, state.players[2].units);
}

export function allStructures() {
  return state.players[0].structures.concat(state.players[1].structures, state.players[2].structures);
}

export function nearestNode(type, P) {
  const arr = (type === 'rice' ? globalThis.riceNodes : globalThis.waterNodes);
  const base = P.structures.find(s => s.kind === 'hq' || s.kind === 'square');
  if (!base) return null;
  let best = null, bd = 1e9;
  for (const n of arr) {
    const d = globalThis.dist2(base.x, base.y, n.x, n.y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

export function lootFromTier(t) {
  const base = ['scroll_hp', 'scroll_dps', 'scroll_fire_aura'];
  const rare = ['ring_atk', 'boots', 'amulet', 'orb'];
  return (Math.random() < 0.6 ? base[(Math.random() * base.length) | 0] : rare[(Math.random() * rare.length) | 0]);
}
