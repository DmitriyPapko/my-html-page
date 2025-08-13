/* ==== Entities module ==== */
let nextId = 1;
export function genId() { return nextId++; }

export class Entity {
  constructor(x, y, owner = -1) {
    this.id = genId();
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
    this.speed = 190;
    this.baseSpeed = 190;
    this.destX = x;
    this.destY = y;
    this.attackRange = 28;
    this.attackCd = 0;
    this.dps = 22;
    this.vision = 480;
    this.isHero = false;
    this.mp = 0;
    this.maxMp = 0;
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
  }
  setDest(x, y) { this.destX = x; this.destY = y; this.state = 'move'; this.targetId = null; }
  setTarget(e) { this.targetId = e ? e.id : null; this.state = e ? 'fight' : 'move'; }
  thinkWorker(dt) {
    if (this.role !== 'rice' && this.role !== 'water') return;
    const P = players[this.owner];
    const HQ = P.structures.find(s => s.kind === 'hq');
    const node = (this.role === 'rice' ? nearestNode('rice', P) : nearestNode('water', P));
    if (!HQ || !node) return;
    if (this.state === 'idle') { this.state = 'to_node'; this.destX = node.x + rand(-24, 24); this.destY = node.y + rand(-24, 24); }
    if (this.state === 'to_node') {
      const dx = this.destX - this.x, dy = this.destY - this.y, d = Math.hypot(dx, dy);
      if (d > 2) {
        const v = this.speed * (this.speedBuff ? 1.5 : 1.0) * (this.slow ? 0.6 : 1.0);
        const nx = this.x + dx / d * v * dt, ny = this.y + dy / d * v * dt;
        if (!isBlocked(nx, ny)) { this.x = nx; this.y = ny; }
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
        this.destX = HQ.x + rand(-32, 32);
        this.destY = HQ.y + rand(-32, 32);
      }
    }
    if (this.state === 'to_hq') {
      const dx = this.destX - this.x, dy = this.destY - this.y, d = Math.hypot(dx, dy);
      if (d > 2) {
        const v = this.speed * (this.speedBuff ? 1.5 : 1.0) * (this.slow ? 0.6 : 1.0);
        const nx = this.x + dx / d * v * dt, ny = this.y + dy / d * v * dt;
        if (!isBlocked(nx, ny)) { this.x = nx; this.y = ny; }
      } else {
        if (this.carry > 0) {
          if (this.role === 'rice') P.res.rice += this.carry;
          else P.res.water += this.carry;
          if (this.owner === 0) updateRes();
          this.carry = 0;
        }
        this.state = 'to_node';
        this.destX = node.x + rand(-24, 24);
        this.destY = node.y + rand(-24, 24);
      }
    }
  }
  update(dt) {
    if (this.dead) return;
    if (this.hp < this.maxHp) { this.hp = Math.min(this.maxHp, this.hp + this.regen * dt * 60); }
    this.cd1 = Math.max(0, this.cd1 - dt);
    this.cd2 = Math.max(0, this.cd2 - dt);
    this.cd3 = Math.max(0, this.cd3 - dt);
    if (this.speedBuff > 0) { this.speedBuff = Math.max(0, this.speedBuff - dt); }
    if (this.slow > 0) { this.slow = Math.max(0, this.slow - dt); }
    if (this.summonTimer > 0) { this.summonTimer -= dt; if (this.summonTimer <= 0) { this.dead = true; } }
    if (this.type === 'worker' && !this.isHero) { this.thinkWorker(dt); return; }
    if (this.owner !== 0 && !this.isHero) {
      const HQ = players[this.owner].structures.find(s => s.kind === 'hq');
      if (this.hp / this.maxHp < 0.35) { this.retreat = true; if (HQ) this.setDest(HQ.x, HQ.y + 40); }
      else if (this.hp / this.maxHp > 0.8) { this.retreat = false; }
    }
    const target = getById(this.targetId);
    if (target && !target.dead && !this.retreat) {
      const dx = target.x - this.x, dy = target.y - this.y; const d = Math.hypot(dx, dy);
      if (d > this.attackRange) {
        const v = this.speed * (this.speedBuff ? 1.5 : 1.0) * (this.slow ? 0.6 : 1.0);
        const nx = this.x + dx / d * v * dt, ny = this.y + dy / d * v * dt;
        if (!isBlocked(nx, ny)) { this.x = nx; this.y = ny; }
      } else {
        this.attackCd -= dt;
        if (this.attackCd <= 0) {
          this.attackCd = .55;
          target.damage(this.dps, this.owner);
          if (!muted) beep(220 + this.dps, 0.05, 'square', 0.03);
        }
      }
    } else {
      const dx = this.destX - this.x, dy = this.destY - this.y; const d = Math.hypot(dx, dy);
      if (d > 2) {
        const v = this.speed * (this.speedBuff ? 1.5 : 1.0) * (this.slow ? 0.6 : 1.0);
        const nx = this.x + dx / d * v * dt, ny = this.y + dy / d * v * dt;
        if (!isBlocked(nx, ny)) { this.x = nx; this.y = ny; }
      }
    }
    if (!this.isHero) {
      const enemies = enemiesFor(this.owner);
      let best = null, bd = 1e9;
      for (const e of enemies) {
        if (e.dead) continue;
        const d = dist2(this.x, this.y, e.x, e.y);
        if (d < bd && d <= this.vision * this.vision) { bd = d; best = e; }
      }
      if (best) { this.setTarget(best); }
    }
  }
  draw() {
    if (this.owner !== 0 && !isVisible(this.x, this.y)) return;
    const s = worldToScreen(this.x, this.y);
    let col = '#6bb0ff';
    if (this.owner === 1) col = '#e05dff';
    if (this.owner === 2) col = '#ffd27a';
    if (this.owner === -1) col = '#9fb2a1';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 10 * world.zoom, 0, 6.283);
    ctx.fill();
    drawHp(s.x, s.y - 18 * world.zoom, this.hp / this.maxHp);
    if (this.isHero) {
      ctx.strokeStyle = '#ffd27a';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 14 * world.zoom, 0, 6.283);
      ctx.stroke();
    }
    if (this.selected) {
      ctx.strokeStyle = '#7ac8ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 16 * world.zoom, 0, 6.283);
      ctx.stroke();
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
      this.hp = Math.min(this.maxHp, this.hp + 15 * dt);
      if (this.hp >= this.maxHp) this.isGhost = false;
      return;
    }
    if (this.queue.length > 0) {
      if (this.qTime <= 0) this.qTime = 2.0;
      this.qTime -= dt;
      if (this.qTime <= 0) {
        const u = this.queue[0];
        if (trainUnit(this.owner, this, u)) {
          this.queue.shift();
          this.qTime = 0;
        } else {
          this.qTime = 1.0;
        }
      }
    }
  }
  draw() {
    if (this.owner !== 0 && !isVisible(this.x, this.y)) return;
    const s = worldToScreen(this.x, this.y);
    ctx.fillStyle = this.kind === 'hq' ? '#6f8' : this.kind === 'barracks' ? '#f86' : this.kind === 'range' ? '#cfa' : this.kind === 'mBarracks' ? '#9bf' : '#acf';
    const w = 84 * world.zoom;
    ctx.fillRect(s.x - w / 2, s.y - w / 2, w, w);
    drawHp(s.x, s.y - w / 2 - 10, this.hp / this.maxHp);
    if (this.selected) {
      ctx.strokeStyle = '#7ac8ff';
      ctx.strokeRect(s.x - w / 2 - 4, s.y - w / 2 - 4, w + 8, w + 8);
    }
  }
}

export function getById(id) {
  if (!id) return null;
  for (const p of players) {
    for (const u of p.units) { if (u.id === id) return u; }
    for (const s of p.structures) { if (s.id === id) return s; }
  }
  for (const n of neutral.units) { if (n.id === id) return n; }
  return null;
}

export function enemiesFor(owner) {
  const arr = [];
  for (const p of players) {
    if (p === players[owner]) continue;
    arr.push(...p.units.filter(u => !u.dead), ...p.structures.filter(s => !s.isGhost));
  }
  arr.push(...neutral.units);
  return arr;
}

export function allUnits() {
  return players[0].units.concat(players[1].units, players[2].units);
}

export function allStructures() {
  return players[0].structures.concat(players[1].structures, players[2].structures);
}

export function nearestNode(type, P) {
  const arr = (type === 'rice' ? riceNodes : waterNodes);
  let best = null, bd = 1e9;
  for (const n of arr) {
    const d = dist2(P.structures[0].x, P.structures[0].y, n.x, n.y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

export function lootFromTier(t) {
  const base = ['scroll_hp', 'scroll_dps'];
  const rare = ['ring_atk', 'boots', 'amulet', 'orb'];
  return (Math.random() < 0.6 ? base[Math.random() < 0.5 ? 0 : 1] : rare[(Math.random() * rare.length) | 0]);
}
