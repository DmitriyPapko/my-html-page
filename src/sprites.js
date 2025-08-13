// Pixel sprite system

// --- Palette and sprite masks ---
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
  o: '#ffffff'
};

export const SPRITES = {
  grass: [
    'gGgggGggggGggggg',
    'gggggGgggggggggg',
    'gggGggggggGggggg',
    'gggggggggggggggg',
    'gGggggggggggGggg',
    'gggggggggggggggg',
    'gggggGgggggggggg',
    'ggggggggGggggggg',
    'gggggggggggggggg',
    'gggGgggggGgggggg',
    'gggggggggggggggg',
    'gggggggggggggggg',
    'gggggggggGgggggg',
    'gggggggggggggggg',
    'gggggggggggggggg',
    'gggggggggggggggg'
  ],
  water: [
    'wwWWwwWWwwWWwwWW',
    'WWwwWWwwWWwwWWww',
    'wwWWwwWWwwWWwwWW',
    'WWwwWWwwWWwwWWww',
    'wwWWwwWWwwWWwwWW',
    'WWwwWWwwWWwwWWww',
    'wwWWwwWWwwWWwwWW',
    'WWwwWWwwWWwwWWww',
    'wwWWwwWWwwWWwwWW',
    'WWwwWWwwWWwwWWww',
    'wwWWwwWWwwWWwwWW',
    'WWwwWWwwWWwwWWww',
    'wwWWwwWWwwWWwwWW',
    'WWwwWWwwWWwwWWww',
    'wwWWwwWWwwWWwwWW',
    'WWwwWWwwWWwwWWww'
  ],
  tree: [
    '........T.......',
    '.......TTT......',
    '......TTTTT.....',
    '.....TTTTTTT....',
    '....TTTTTTTTT...',
    '...TTTTTTTTTTT..',
    '....TTTTTTTTT...',
    '.....TTTTTTT....',
    '........T.......',
    '........T.......',
    '........T.......',
    '........T.......',
    '.......TTT......',
    '.......TTT......',
    '.......TTT......',
    '.......TTT......'
  ],
  rice: [
    'rrrrrrrrrrrrrrrr',
    'rRrRrRrRrRrRrRrR',
    'rrrrrrrrrrrrrrrr',
    'rRrRrRrRrRrRrRrR',
    'rrrrrrrrrrrrrrrr',
    'rRrRrRrRrRrRrRrR',
    'rrrrrrrrrrrrrrrr',
    'rRrRrRrRrRrRrRrR',
    'rrrrrrrrrrrrrrrr',
    'rRrRrRrRrRrRrRrR',
    'rrrrrrrrrrrrrrrr',
    'rRrRrRrRrRrRrRrR',
    'rrrrrrrrrrrrrrrr',
    'rRrRrRrRrRrRrRrR',
    'rrrrrrrrrrrrrrrr',
    'rRrRrRrRrRrRrRrR'
  ],
  waterNode: [
    '................',
    '................',
    '....wwWWww......',
    '...wwWWWWww.....',
    '..wwWWWWWWww....',
    '..wWWWWWWWWw....',
    '..wWWWWWWWWw....',
    '..wwWWWWWWww....',
    '...wwWWWWww.....',
    '....wwWWww......',
    '.....wwww.......',
    '................',
    '................',
    '................',
    '................',
    '................'
  ],
  soldier: [
    '................',
    '.......s........',
    '......sss.......',
    '......sss.......',
    '.......s........',
    '....ooooooo.....',
    '...ooooooooo....',
    '...ooooooooo....',
    '...ooooooooo....',
    '...ooooooooo....',
    '....ooooooo.....',
    '.......o........',
    '......o.o.......',
    '.....o...o......',
    '................',
    '................'
  ],
  unit: [
    '................',
    '.......s........',
    '......sss.......',
    '......sss.......',
    '.......s........',
    '....ooooooo.....',
    '...ooooooooo....',
    '...ooooooooo....',
    '...ooooooooo....',
    '...ooooooooo....',
    '....ooooooo.....',
    '.......o........',
    '......o.o.......',
    '.....o...o......',
    '................',
    '................'
  ],
  archer: [
    '................',
    '.......s........',
    '......sss.......',
    '......sss.......',
    '.......s........',
    '....obbbbo......',
    '...obbbbbbbo....',
    '...obbbbbbbo....',
    '...obbbbbbbo....',
    '...obbbbbbbo....',
    '....obbbbo......',
    '.......o........',
    '......o.o.......',
    '.....o...o......',
    '................',
    '................'
  ],
  mage: [
    '................',
    '.......s........',
    '......sss.......',
    '......sss.......',
    '.......s........',
    '....orrrro......',
    '...orrrrrrro....',
    '...orrrrrrro....',
    '...orrrrrrro....',
    '...orrrrrrro....',
    '....orrrro......',
    '.......o........',
    '......o.o.......',
    '.....o...o......',
    '................',
    '................'
  ],
  hero: [
    '................',
    '.......s........',
    '......sss.......',
    '......sss.......',
    '.......s........',
    '....oRRRRo......',
    '...oRRRRRRRo....',
    '...oRRRRRRRo....',
    '...oRRRRRRRo....',
    '...oRRRRRRRo....',
    '....oRRRRo......',
    '.......o........',
    '......o.o.......',
    '.....o...o......',
    '................',
    '................'
  ],
  item: [
    '................',
    '....rrrrrr......',
    '...rRRRRRRr.....',
    '..rR......Rr....',
    '..rR......Rr....',
    '...rRRRRRRr.....',
    '....rrrrrr......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................'
  ]
};

// --- Internal cache of rendered sprites ---
const CACHE = new Map();

function renderSprite(name, override = {}) {
  const key = name + JSON.stringify(override);
  if (CACHE.has(key)) return CACHE.get(key);
  const mask = SPRITES[name];
  if (!mask) return null;
  const canv = document.createElement('canvas');
  canv.width = 16; canv.height = 16;
  const c = canv.getContext('2d');
  c.imageSmoothingEnabled = false;
  for (let y = 0; y < 16; y++) {
    const row = mask[y];
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      c.fillStyle = override[ch] || PALETTE[ch] || '#000';
      c.fillRect(x, y, 1, 1);
    }
  }
  CACHE.set(key, canv);
  return canv;
}

// --- Helpers ---
export function toPixel(v) {
  const DPR = globalThis.DPR || 1;
  return Math.round(v * DPR) / DPR;
}

export function drawShadow(ctx, x, y, r) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(toPixel(x), toPixel(y), r, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// --- Main draw function ---
export function drawSprite(ctx, name, x, y, opts = {}) {
  const {
    scale = 1,
    alpha = 1,
    flipX = false,
    flipY = false,
    rotate = 0,
    anchor = 'center',
    shadow = false,
    override = {}
  } = opts;

  const img = renderSprite(name, override);
  if (!img) return;

  const w = 16, h = 16;
  const ax = anchor === 'center' ? w / 2 : 0;
  const ay = anchor === 'center' ? h / 2 : 0;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.translate(toPixel(x), toPixel(y));
  if (rotate) ctx.rotate(rotate);
  ctx.scale(flipX ? -scale : scale, flipY ? -scale : scale);
  if (shadow) drawShadow(ctx, 0, ay * scale, w * 0.35 * scale);
  ctx.drawImage(img, -ax, -ay, w, h);
  ctx.restore();
}

// Legacy global wrapper for compatibility
export function drawSpriteLegacy(name, x, y, scale = 1, override = {}) {
  const ctx = globalThis.ctx;
  if (!ctx) return;
  drawSprite(ctx, name, x, y, { scale, override });
}

// Expose legacy wrapper and helpers to global scope for existing code
Object.assign(globalThis, { drawSprite: drawSpriteLegacy, toPixel, drawShadow });

