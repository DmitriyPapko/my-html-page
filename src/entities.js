/* ==== Entities ==== */
let nextId = 1;

function moveEntity(e, dx, dy, v, dt) {
  const d = Math.hypot(dx, dy);
  if (d <= 0) return;
  const nx = e.x + (dx / d) * v * dt, ny = e.y + (dy / d) * v * dt;
  if (!globalThis.isBlocked(nx, ny)) { e.x = nx; e.y = ny; return; }
  const ux = -dy / d, uy = dx / d;
  const sx = e.x + ux * v * dt, sy = e.y + uy * v * dt;
  if (!globalThis.isBlocked(sx, sy)) { e.x = sx; e.y = sy; return; }
  const sx2 = e.x - ux * v * dt, sy2 = e.y - uy * v * dt;
  if (!globalThis.isBlocked(sx2, sy2)) { e.x = sx2; e.y = sy2; }
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
  constructor(x, y, owner, type = 'worker') {
    super(x, y, owner);
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
    const P = globalThis.players[this.owner];
    const HQ = P.structures.find(s => s.kind === 'hq');
    if (!HQ) { this.state = 'idle'; this.noteTimer = 2; return; }
    const node = (this.role === 'rice' ? nearestNode('rice', P) : nearestNode('water', P));
    if (!node) { this.state = 'idle'; this.noteTimer = 2; this.nodeId = null; return; }
    if (this.nodeId !== node.id && this.state !== 'to_hq') {
      this.nodeId = node.id;
      this.state = 'to_node';
      this.destX = node.x + globalThis.rand(-24, 24);
      this.destY = node.y + globalThis.rand(-24, 24);
    }
    if (this.state === 'idle') {
      this.state = 'to_node';
      this.destX = node.x + globalThis.rand(-24, 24);
      this.destY = node.y + globalThis.rand(-24, 24);
    }
    if (this.state === 'to_node') {
      const dx = this.destX - this.x, dy = this.destY - this.y, d = Math.hypot(dx, dy);
      if (d > 2) {
        const v = this.getCurrentSpeed();
        moveEntity(this, dx, dy, v, dt);
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
        this.destX = HQ.x + globalThis.rand(-32, 32);
        this.destY = HQ.y + globalThis.rand(-32, 32);
      }
    }
    if (this.state === 'to_hq') {
      const dx = this.destX - this.x, dy = this.destY - this.y, d = Math.hypot(dx, dy);
      if (d > 2) {
        const v = this.getCurrentSpeed();
        moveEntity(this, dx, dy, v, dt);
      } else {
        if (this.carry > 0) {
          if (this.role === 'rice') P.res.rice += this.carry;
          else P.res.water += this.carry;
          if (this.owner === 0) globalThis.updateRes();
          this.carry = 0;
        }
        this.state = 'to_node';
        this.destX = node.x + globalThis.rand(-24, 24);
        this.destY = node.y + globalThis.rand(-24, 24);
      }
    }
  }
  updateRetreat(dt) {
    if (this.owner !== 0 && !this.isHero) {
      const HQ = globalThis.players[this.owner].structures.find(s => s.kind === 'hq');
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
      moveEntity(this, dx, dy, v, dt);
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
      moveEntity(this, dx, dy, v, dt);
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
        if (d > 40) { const v = this.getCurrentSpeed(); moveEntity(this, dx, dy, v, dt); }
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
    const col = globalThis.players[this.owner]?.color || '#9fb2a1';
    const spr = this.isHero ? 'hero' : (this.type === 'archer' ? 'archer' : (this.type === 'mage' ? 'mage' : 'soldier'));
    globalThis.drawSprite(spr, s.x, s.y, globalThis.world.zoom * 1.25, { o: col });
    globalThis.drawHp(s.x, s.y - 18 * globalThis.world.zoom, this.hp / this.maxHp);
    if (this.auraTimer > 0) {
      globalThis.ctx.strokeStyle = 'rgba(255,215,0,0.5)';
      globalThis.ctx.beginPath();
      globalThis.ctx.arc(s.x, s.y, 80 * globalThis.world.zoom, 0, 6.283);
      globalThis.ctx.stroke();
    }
    if (this.isHero) {
      globalThis.ctx.strokeStyle = '#ffd27a';
      globalThis.ctx.beginPath();
      globalThis.ctx.arc(s.x, s.y, 14 * globalThis.world.zoom, 0, 6.283);
      globalThis.ctx.stroke();
    }
    if (this.selected) {
      globalThis.ctx.strokeStyle = '#7ac8ff';
      globalThis.ctx.beginPath();
      globalThis.ctx.arc(s.x, s.y, 16 * globalThis.world.zoom, 0, 6.283);
      globalThis.ctx.stroke();
    }
    if (this.noteTimer > 0 && this.type === 'worker') {
      globalThis.ctx.fillStyle = '#ffd27a';
      globalThis.ctx.font = `${12 * globalThis.world.zoom}px sans-serif`;
      globalThis.ctx.fillText('!', s.x - 3 * globalThis.world.zoom, s.y - 20 * globalThis.world.zoom);
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
      if (this.qTime <= 0) this.qTime = 2.0;
      this.qTime -= dt;
      if (this.qTime <= 0) {
        const u = this.queue[0];
        if (globalThis.trainUnit(this.owner, this, u)) {
          this.queue.shift();
          this.qTime = 0;
        } else {
          this.qTime = 1.0;
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
    globalThis.drawSprite('building', s.x, s.y, scale, { o: col });
    globalThis.drawHp(s.x, s.y - w / 2 - 10, this.hp / this.maxHp);
    if (this.selected) {
      globalThis.ctx.strokeStyle = '#7ac8ff';
      globalThis.ctx.strokeRect(s.x - w / 2 - 4, s.y - w / 2 - 4, w + 8, w + 8);
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
    const scale = globalThis.world.zoom * (this.radius * 2 / 16);
    globalThis.drawSprite(this.type === 'rice' ? 'rice' : 'water', s.x, s.y, scale);
  }
}

export class ItemDrop extends Entity {
  constructor(x, y, kind = 'scroll_dps') {
    super(x, y, -1);
    this.kind = kind;
    this.radius = 14;
  }
  draw() {
    if (!globalThis.isExplored(this.x, this.y)) return;
    const s = globalThis.worldToScreen(this.x, this.y);
    const map = { scroll_hp: 'HP', scroll_dps: 'DPS', ring_atk: 'Mana', boots: 'Boots', amulet: 'Amul', orb: 'Orb' };
    const col = (this.kind === 'scroll_hp') ? '#7cff97' : (this.kind === 'scroll_dps' ? '#ffd27a' : '#8ad');
    globalThis.drawSprite('item', s.x, s.y - 10 * globalThis.world.zoom, globalThis.world.zoom * 1.25, { r: col, R: col });
    globalThis.ctx.fillStyle = '#000';
    globalThis.ctx.font = `${12 * globalThis.world.zoom}px system-ui`;
    globalThis.ctx.fillText(map[this.kind] || this.kind, s.x - 16 * globalThis.world.zoom, s.y + 14 * globalThis.world.zoom);
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
    if (kind === 'mage') { this.maxHp = 140; this.dps = 24; this.attackRange = 260; this.leash = 340; this.tier = 1; }
    else if (kind === 'gnome') { this.maxHp = 220; this.dps = 22; this.attackRange = 50; this.leash = 360; this.block = 0.25; this.tier = 2; }
    else if (kind === 'troll') { this.maxHp = 500; this.dps = 40; this.attackRange = 40; this.leash = 380; this.tier = 3; }
    else { this.maxHp = 360; this.dps = 30; this.attackRange = 30; this.leash = 360; this.tier = 2; this.kind = 'beast'; }
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
    if (!globalThis.isExplored(this.x, this.y)) return;
    const s = globalThis.worldToScreen(this.x, this.y);
    let col = '#9fb2a1';
    if (this.kind === 'mage') col = '#8ad';
    else if (this.kind === 'gnome') col = '#b86';
    else if (this.kind === 'troll') col = '#a44';
    globalThis.drawSprite('unit', s.x, s.y, globalThis.world.zoom * 1.25, { o: col });
    globalThis.drawHp(s.x, s.y - 18 * globalThis.world.zoom, this.hp / this.maxHp);
  }
}

export function getById(id) {
  if (!id) return null;
  for (const p of globalThis.players) {
    for (const u of p.units) { if (u.id === id) return u; }
    for (const s of p.structures) { if (s.id === id) return s; }
  }
  for (const n of globalThis.neutral.units) { if (n.id === id) return n; }
  return null;
}

export function enemiesFor(owner) {
  const arr = [];
  for (const p of globalThis.players) {
    if (p === globalThis.players[owner]) continue;
    arr.push(...p.units.filter(u => !u.dead), ...p.structures.filter(s => !s.isGhost));
  }
  arr.push(...globalThis.neutral.units);
  return arr;
}

export function allUnits() {
  return globalThis.players[0].units.concat(globalThis.players[1].units, globalThis.players[2].units);
}

export function allStructures() {
  return globalThis.players[0].structures.concat(globalThis.players[1].structures, globalThis.players[2].structures);
}

export function nearestNode(type, P) {
  const arr = (type === 'rice' ? globalThis.riceNodes : globalThis.waterNodes);
  if (!P.structures || P.structures.length === 0) return null;
  let best = null, bd = 1e9;
  for (const n of arr) {
    const d = globalThis.dist2(P.structures[0].x, P.structures[0].y, n.x, n.y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

export function lootFromTier(t) {
  const base = ['scroll_hp', 'scroll_dps'];
  const rare = ['ring_atk', 'boots', 'amulet', 'orb'];
  return (Math.random() < 0.6 ? base[Math.random() < 0.5 ? 0 : 1] : rare[(Math.random() * rare.length) | 0]);
}
