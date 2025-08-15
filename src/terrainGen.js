// src/terrainGen.js
export function generateTerrain(width, height, opts = {}) {
  const TS = 32; // тайл 32x32, для консистентности (можно не использовать здесь)
  const rnd = seeded(opts.seed ?? 1337);

  const p = {
    maxLakes: opts.maxLakes ?? 3,
    lakeMinDist: opts.lakeMinDist ?? 18,   // минимальная дистанция между центрами озёр (в тайлах)
    lakeRadius: [8, 18],                   // мин/макс «радиус» озера (в тайлах)
    irregularity: 0.25,                    // «рваность» берега (0..0.4)
    minLakeSize: 40,                       // отсечь слишком маленькие компоненты
    waterCoverageMax: 0.12,                // не больше 12% воды
    flowerRate: 0.015,                     // вероятность цветка на траве ~1.5%
    flowerMinDist: 2                       // минимум 2 клетки между цветами
  };

  // база: всё трава
  const map = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ kind: 'grass' }))
  );

  // 1) центры озёр — «синие точки» (простая реализация min-distance)
  const lakeCenters = [];
  for (let tries = 0; tries < 500 && lakeCenters.length < p.maxLakes; tries++) {
    const cx = Math.floor(rnd() * width);
    const cy = Math.floor(rnd() * height);
    if (lakeCenters.every(c => dist2(c.x, c.y, cx, cy) >= p.lakeMinDist * p.lakeMinDist)) {
      lakeCenters.push({ x: cx, y: cy });
    }
  }

  // 2) рост озёр: заполняем эллипс с неровным краем
  for (const c of lakeCenters) {
    const r = lerp(p.lakeRadius[0], p.lakeRadius[1], rnd());
    const rx = r * (0.8 + rnd() * 0.6);
    const ry = r * (0.8 + rnd() * 0.6);
    for (let y = Math.max(0, Math.floor(c.y - ry)); y <= Math.min(height - 1, Math.ceil(c.y + ry)); y++) {
      for (let x = Math.max(0, Math.floor(c.x - rx)); x <= Math.min(width - 1, Math.ceil(c.x + rx)); x++) {
        const nx = (x - c.x) / rx, ny = (y - c.y) / ry;
        let inside = nx * nx + ny * ny <= 1;
        if (inside) {
          // неровность берега
          const jitter = (rnd() - 0.5) * 2 * p.irregularity;
          if (nx * nx + ny * ny > 1 + jitter) inside = false;
        }
        if (inside) map[y][x].kind = 'water';
      }
    }
  }

  // 3) связность воды и фильтрация мелких луж
  pruneSmallWater(map, p.minLakeSize);

  // 4) ограничение общей доли воды
  enforceCoverage(map, 'water', p.waterCoverageMax, rnd);

  // 5) редкие цветы — «синие точки» по траве (чтобы не было полос)
  sprinkleFlowers(map, p.flowerRate, p.flowerMinDist, rnd);

  // 6) вариативность травы — детерминированно, без полос
  applyGrassVariants(map);

  return map;
}

// ==== helpers ====
function seeded(s) { return function() { s = (s * 1664525 + 1013904223) >>> 0; return (s & 0xfffffff) / 0x10000000; }; }
function lerp(a,b,t){ return a+(b-a)*t; }
function dist2(ax,ay,bx,by){ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; }

function pruneSmallWater(map, minSize) {
  const h = map.length, w = map[0].length;
  const seen = Array.from({ length: h }, () => Array(w).fill(false));
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    if (seen[y][x] || map[y][x].kind !== 'water') continue;
    const comp = [], q = [[x,y]]; seen[y][x] = true;
    while (q.length) {
      const [cx, cy] = q.pop(); comp.push([cx,cy]);
      for (const [dx,dy] of dirs) {
        const nx=cx+dx, ny=cy+dy;
        if (nx>=0 && ny>=0 && nx<w && ny<h && !seen[ny][nx] && map[ny][nx].kind==='water') {
          seen[ny][nx]=true; q.push([nx,ny]);
        }
      }
    }
    if (comp.length < minSize) {
      for (const [cx,cy] of comp) map[cy][cx].kind = 'grass';
    }
  }
}

function enforceCoverage(map, kind, maxShare, rnd) {
  const h = map.length, w = map[0].length, total = w*h;
  const list = [];
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) if (map[y][x].kind===kind) list.push([x,y]);
  const need = Math.floor(total*maxShare);
  if (list.length <= need) return;
  // случайно подсушиваем до нужной доли
  shuffleInPlace(list, rnd);
  for (let i=need; i<list.length; i++) {
    const [x,y] = list[i]; map[y][x].kind = 'grass';
  }
}

function shuffleInPlace(a, rnd) {
  for (let i=a.length-1; i>0; i--) { const j = Math.floor(rnd()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; }
}

function sprinkleFlowers(map, rate, minDist, rnd) {
  const h = map.length, w = map[0].length;
  const flowers = [];
  const canPlace = (x,y) => {
    for (const [fx,fy] of flowers) if (Math.abs(fx-x)<=minDist && Math.abs(fy-y)<=minDist) return false;
    return true;
  };
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    if (map[y][x].kind!=='grass') continue;
    if (rnd() < rate && canPlace(x,y)) {
      map[y][x].kind = 'grass_flowers';
      flowers.push([x,y]);
    }
  }
}

function applyGrassVariants(map){
  const h=map.length, w=map[0].length;
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    if (map[y][x].kind==='grass') {
      // детерминированная вариативность без полос
      const hsh = ((x*73856093) ^ (y*19349663)) & 3;
      map[y][x].kind = (hsh & 1) ? 'grass_A' : 'grass_B';
    }
  }
}
