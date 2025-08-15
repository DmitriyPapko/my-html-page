// src/terrainGen.js
export function generateTerrain(width, height, opts = {}) {
  const rnd = seeded(opts.seed ?? 1337);

  const p = {
    maxLakes: opts.maxLakes ?? 3,          // 1..5 озёр
    lakeMinDist: opts.lakeMinDist ?? 22,   // мин. дистанция между центрами озёр (в тайлах)
    lakeRadius: opts.lakeRadius ?? [10,18],// эллипсный радиус (x/y чуть разный)
    irregularity: opts.irregularity ?? 0.25, // «рваность» берега 0..0.4
    minLakeSize: opts.minLakeSize ?? 60,   // убрать мелкие компоненты воды
    waterCoverageMax: opts.waterCoverageMax ?? 0.12, // ≤ 12% воды
    flowerRate: opts.flowerRate ?? 0.012,
    flowerMinDist: opts.flowerMinDist ?? 2
  };

  // база: всё трава
  const map = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ kind: 'grass' }))
  );

  // 1) Центры озёр — выбор с минимальной дистанцией (без полос/модуля)
  const centers = [];
  for (let tries = 0; tries < 1000 && centers.length < p.maxLakes; tries++) {
    const cx = Math.floor(rnd()*width), cy = Math.floor(rnd()*height);
    if (centers.every(c => dist2(c.x,c.y,cx,cy) >= p.lakeMinDist*p.lakeMinDist)) {
      centers.push({x:cx,y:cy});
    }
  }

  // 2) Наполнение озёр эллипсами с небольшим шумом по границе
  for (const c of centers) {
    const r = lerp(p.lakeRadius[0], p.lakeRadius[1], rnd());
    const rx = r * (0.8 + rnd()*0.6);
    const ry = r * (0.8 + rnd()*0.6);
    for (let y=Math.max(0, Math.floor(c.y-ry)); y<=Math.min(height-1, Math.ceil(c.y+ry)); y++) {
      for (let x=Math.max(0, Math.floor(c.x-rx)); x<=Math.min(width-1, Math.ceil(c.x+rx)); x++) {
        const nx = (x-c.x)/rx, ny = (y-c.y)/ry;
        const jitter = (rnd()-0.5)*2*p.irregularity; // рваность
        if (nx*nx + ny*ny <= 1 + jitter) map[y][x].kind = 'water';
      }
    }
  }

  // 3) Сгладить маску воды: убрать одиночки/линию, оставить лишь монолит
  pruneSmallAndLinearWater(map, p.minLakeSize);

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

function pruneSmallAndLinearWater(map, minSize) {
  const H = map.length, W = map[0].length;
  const seen = Array.from({length:H},()=>Array(W).fill(false));
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if (seen[y][x] || map[y][x].kind!=='water') continue;
    // BFS-компонента
    const comp=[], q=[[x,y]]; seen[y][x]=true;
    let minx=x,maxx=x,miny=y,maxy=y, linearScore=0;
    while(q.length){
      const [cx,cy]=q.pop(); comp.push([cx,cy]);
      minx=Math.min(minx,cx); maxx=Math.max(maxx,cx);
      miny=Math.min(miny,cy); maxy=Math.max(maxy,cy);
      // соседей-воды (4-neigh)
      let n=0;
      for (const [dx,dy] of dirs) {
        const nx=cx+dx, ny=cy+dy;
        if (nx>=0&&ny>=0&&nx<W&&ny<H && map[ny][nx].kind==='water') { n++; if(!seen[ny][nx]){seen[ny][nx]=true; q.push([nx,ny]);} }
      }
      if (n<=2) linearScore++; // «линейность»: большинство клеток имеет <=2 соседей
    }

    const area = comp.length;
    const bw = maxx-minx+1, bh = maxy-miny+1;
    const isTooSmall = area < minSize;
    const isLineLike = (linearScore/area) > 0.7 || Math.min(bw,bh) <= 1; // тонкая цепочка

    if (isTooSmall || isLineLike) {
      for (const [cx,cy] of comp) map[cy][cx].kind='grass';
    }
  }
}

function enforceCoverage(map, kind, maxShare, rnd){
  const H=map.length, W=map[0].length, total=W*H;
  const list=[];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(map[y][x].kind===kind) list.push([x,y]);
  const cap = Math.floor(total*maxShare);
  if(list.length <= cap) return;
  // случайно «подсушить»
  for(let i=list.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [list[i],list[j]]=[list[j],list[i]]; }
  for(let i=cap;i<list.length;i++){ const [x,y]=list[i]; map[y][x].kind='grass'; }
}

function sprinkleFlowers(map, rate, minDist, rnd){
  const H=map.length, W=map[0].length; const placed=[];
  const ok=(x,y)=>placed.every(([px,py])=>Math.abs(px-x)>minDist||Math.abs(py-y)>minDist);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(map[y][x].kind!=='grass') continue;
    if(rnd()<rate && ok(x,y)){ map[y][x].kind='grass_flowers'; placed.push([x,y]); }
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
