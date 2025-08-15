// Pixel sprite system
export const PALETTE = {
  g: '#3b7a3b',
  G: '#2e642e',
  w: '#83b9d4',
  W: '#5a9bb7',
  r: '#cddc39',
  R: '#a0b020',
  t: '#5d3a1a',
  T: '#2e7d32',
  s: '#f1c27d',
  b: '#8b5a2b',
  o: '#9fb2a1'
};

export const SPRITES = {
  grass: [
    "gGgggGggggGggggg",
    "gggggGgggggggggg",
    "gggGggggggGggggg",
    "gggggggggggggggg",
    "gGggggggggggGggg",
    "gggggggggggggggg",
    "gggggGgggggggggg",
    "ggggggggGggggggg",
    "gggggggggggggggg",
    "gggGgggggGgggggg",
    "gggggggggggggggg",
    "gggggggggggggggg",
    "gggggggggGgggggg",
    "gggggggggggggggg",
    "gggggggggggggggg",
    "gggggggggggggggg"
  ],
  water: [
    [
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww"
    ],
    [
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW",
      "WWwwWWwwWWwwWWww",
      "wwWWwwWWwwWWwwWW"
    ]
  ],
  tree: [
    ".......T.......",
    "......TTT......",
    ".....TTTTT.....",
    "....TTTTTTT....",
    "...TTTTTTTTT...",
    "..TTTTTTTTTTT..",
    "...TTTTTTTTT...",
    "....TTTTTTT....",
    ".......T.......",
    ".......T.......",
    ".......T.......",
    ".......T.......",
    "......TTT......",
    "......TTT......",
    "......TTT......",
    "......TTT......"
  ],
  rice: [
    "rrrrrrrrrrrrrrrr",
    "rRrRrRrRrRrRrRrR",
    "rrrrrrrrrrrrrrrr",
    "rRrRrRrRrRrRrRrR",
    "rrrrrrrrrrrrrrrr",
    "rRrRrRrRrRrRrRrR",
    "rrrrrrrrrrrrrrrr",
    "rRrRrRrRrRrRrRrR",
    "rrrrrrrrrrrrrrrr",
    "rRrRrRrRrRrRrRrR",
    "rrrrrrrrrrrrrrrr",
    "rRrRrRrRrRrRrRrR",
    "rrrrrrrrrrrrrrrr",
    "rRrRrRrRrRrRrRrR",
    "rrrrrrrrrrrrrrrr",
    "rRrRrRrRrRrRrRrR"
  ],
  waterNode: [
    "......WWWW......",
    "....WWwwwwWW....",
    "...WwwwwwwwwW...",
    "..WwwwwwwwwwwW..",
    "..WwwwwwwwwwwW..",
    "...WwwwwwwwwW...",
    "....WWwwwwWW....",
    "......WWWW......",
    "......WWWW......",
    "....WWwwwwWW....",
    "...WwwwwwwwwW...",
    "..WwwwwwwwwwwW..",
    "..WwwwwwwwwwwW..",
    "...WwwwwwwwwW...",
    "....WWwwwwWW....",
    "......WWWW......"
  ],
  soldier: [
    "................",
    ".......s........",
    "......sss.......",
    "......sss.......",
    ".......s........",
    "....ooooooo.....",
    "...ooooooooo....",
    "...ooooooooo....",
    "...ooooooooo....",
    "...ooooooooo....",
    "....ooooooo.....",
    ".......o........",
    "......o.o.......",
    ".....o...o......",
    "................",
    "................"
  ],
  archer: [
    "................",
    ".......s........",
    "......sss.......",
    "......sss.......",
    ".......s........",
    "....obbbbo......",
    "...obbbbbbbo....",
    "...obbbbbbbo....",
    "...obbbbbbbo....",
    "...obbbbbbbo....",
    "....obbbbo......",
    ".......o........",
    "......o.o.......",
    ".....o...o......",
    "................",
    "................"
  ],
  mage: [
    "................",
    ".......s........",
    "......sss.......",
    "......sss.......",
    ".......s........",
    "....orrrro......",
    "...orrrrrrro....",
    "...orrrrrrro....",
    "...orrrrrrro....",
    "...orrrrrrro....",
    "....orrrro......",
    ".......o........",
    "......o.o.......",
    ".....o...o......",
    "................",
    "................"
  ],
  hero: [
    "................",
    ".......s........",
    "......sss.......",
    "......sss.......",
    ".......s........",
    "....oRRRRo......",
    "...oRRRRRRRo....",
    "...oRRRRRRRo....",
    "...oRRRRRRRo....",
    "...oRRRRRRRo....",
    "....oRRRRo......",
    ".......o........",
    "......o.o.......",
    ".....o...o......",
    "................",
    "................"
  ],
  item: [
    "................",
    "....rrrrrr......",
    "...rRRRRRRr.....",
    "..rR......Rr....",
    "..rR......Rr....",
    "...rRRRRRRr.....",
    "....rrrrrr......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................"
  ],
  building: [
    "bbbbbbbbbbbbbbbb",
    "boooooooooooooob",
    "bo............ob",
    "bo............ob",
    "bo............ob",
    "bo............ob",
    "bo............ob",
    "bbbbbbbbbbbbbbbb",
    "boooooooooooooob",
    "bo............ob",
    "bo............ob",
    "bo............ob",
    "bo............ob",
    "boooooooooooooob",
    "bbbbbbbbbbbbbbbb",
    "................"
  ],
  icon_hp: [
    "..rr..rr..",
    ".rrrrrrrr.",
    ".rrrrrrrr.",
    ".rrrrrrrr.",
    "..rrrrrr..",
    "...rrrr...",
    "....rr....",
    "..........",
    "..........",
    ".........."
  ],
  icon_mp: [
    "....ww....",
    "...wwww...",
    "..wwwwww..",
    "...wwww...",
    "....ww....",
    "....ww....",
    "...wwww...",
    "..wwwwww..",
    "..........",
    ".........."
  ],
  icon_attack: [
    "..r....r..",
    "..rr..rr..",
    "..rrrrrr..",
    "...rrrr...",
    "....rr....",
    "...rrrr...",
    "..rrrrrr..",
    "..rr..rr..",
    "..r....r..",
    ".........."
  ],
  icon_armor: [
    "..wwwwww..",
    ".wwwwwwww.",
    ".wwwwwwww.",
    ".wwwwwwww.",
    "..wwwwww..",
    "...wwww...",
    "....ww....",
    "....ww....",
    "..........",
    ".........."
  ],
  icon_rice: [
    "..rrr.....",
    ".rrrrr....",
    ".rrrrr....",
    "..rrr.....",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    ".........."
  ],
  icon_water: [
    "...ww.....",
    "..wwww....",
    ".wwwwww...",
    "..wwww....",
    "...ww.....",
    "...ww.....",
    "..wwww....",
    ".wwwwww...",
    "..........",
    ".........."
  ],
  icon_scroll: [
    "..bbbbbb..",
    "..b....b..",
    "..b....b..",
    "..bbbbbb..",
    "..b....b..",
    "..b....b..",
    "..bbbbbb..",
    "..........",
    "..........",
    ".........."
  ],
  icon_boots: [
    "..b..b....",
    "..bbbb....",
    "..b..b....",
    "..b..b....",
    "..bbbb....",
    "..b..b....",
    "..b..b....",
    "..........",
    "..........",
    ".........."
  ],
  icon_ring: [
    "...ooo....",
    "..o...o...",
    ".o.....o..",
    ".o.....o..",
    ".o.....o..",
    ".o.....o..",
    "..o...o...",
    "...ooo....",
    "..........",
    ".........."
  ],
  icon_amulet: [
    "...rrr....",
    "..r...r...",
    ".r.....r..",
    ".r.....r..",
    "..r...r...",
    "...rrr....",
    "...r.r....",
    "...r.r....",
    "...rrr....",
    ".........."
  ]
};

const CACHE = new Map();
const CACHE_LIMIT = 200;

function stableKey(obj) {
  const sorted = Object.keys(obj).sort().reduce((acc, k) => {
    acc[k] = obj[k];
    return acc;
  }, {});
  return JSON.stringify(sorted);
}

export function drawSprite(ctx, name, x, y, opts = {}) {
  let spr = SPRITES[name];
  if (!spr) return;
  const {
    scale = 1,
    alpha = 1,
    flipX = false,
    flipY = false,
    rotate = 0,
    anchor = 'center',
    shadow = false,
    frame = 0,
    override = {}
  } = opts;
  if (Array.isArray(spr[0])) {
    spr = spr[frame % spr.length];
  }
  const w = spr[0].length;
  const h = spr.length;
  let canvas = null;
  if (!flipX && !flipY && !rotate && alpha === 1 && !shadow) {
    const key = name + '@' + frame + '@' + scale + '@' + stableKey(override);
    canvas = CACHE.get(key);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const cctx = canvas.getContext('2d');
      cctx.imageSmoothingEnabled = false;
      for (let j = 0; j < h; j++) {
        const row = spr[j];
        for (let i = 0; i < w; i++) {
          const ch = row[i];
          if (ch === '.') continue;
          const color = override[ch] || PALETTE[ch] || '#000';
          cctx.fillStyle = color;
          cctx.fillRect(i * scale, j * scale, scale, scale);
        }
      }
      CACHE.set(key, canvas);
      if (CACHE.size > CACHE_LIMIT) {
        const firstKey = CACHE.keys().next().value;
        CACHE.delete(firstKey);
      }
    }
  }
  const tp = globalThis.toPixel || (v => v);
  const px = tp(x);
  const py = tp(y);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;
  if (shadow && globalThis.drawShadow) {
    const r = (w * scale) / 2;
    globalThis.drawShadow(px, py + r * 0.6, r);
  }
  ctx.translate(px, py);
  if (rotate) ctx.rotate(rotate);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  const ox = anchor === 'center' ? -w * scale / 2 : 0;
  const oy = anchor === 'center' ? -h * scale / 2 : 0;
  if (canvas) {
    ctx.drawImage(canvas, ox, oy);
  } else {
    for (let j = 0; j < h; j++) {
      const row = spr[j];
      for (let i = 0; i < w; i++) {
        const ch = row[i];
        if (ch === '.') continue;
        const color = override[ch] || PALETTE[ch] || '#000';
        ctx.fillStyle = color;
        ctx.fillRect(ox + i * scale, oy + j * scale, scale, scale);
      }
    }
  }
  ctx.restore();
}

export function drawSpriteLegacy(name, x, y, scale = 1, override = {}) {
  if (!globalThis.ctx) return;
  drawSprite(globalThis.ctx, name, x, y, { scale, override });
}
