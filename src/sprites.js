/* Simple pixel sprites and drawing helper */
const PALETTE = {
  g: '#3b7a3b',
  G: '#2e642e',
  w: '#83b9d4',
  W: '#5a9bb7',
  r: '#cddc39',
  R: '#a0b020',
  t: '#5d3a1a',
  T: '#2e7d32',
  s: '#f1c27d',
  b: '#8b5a2b'
};

const SPRITES = {
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
  unit: [
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
  ]
};

function drawSprite(name, x, y, scale = 1, override = {}) {
  const spr = SPRITES[name];
  if (!spr) return;
  const h = spr.length;
  const w = spr[0].length;
  const ctx = globalThis.ctx;
  for (let j = 0; j < h; j++) {
    const row = spr[j];
    for (let i = 0; i < w; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      const color = override[ch] || PALETTE[ch] || '#000';
      ctx.fillStyle = color;
      ctx.fillRect(x + (i - w / 2) * scale, y + (j - h / 2) * scale, scale, scale);
    }
  }
}

Object.assign(globalThis, { drawSprite });
