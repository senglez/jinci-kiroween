// Procedural SVG elevation of the Hall of the Holy Mother (圣母殿), front (east) view.
// Drawn in stage coordinates (viewBox 0 0 2000 1150); the hall spans roughly x 300–1700.
// Proportions follow the reference photo: 7 bays, 8 dragon columns, double eaves, hip-gable roof.

const NS = 'http://www.w3.org/2000/svg';

export const STAGE = { w: 2000, h: 1150 };

// Column centre lines: 7 bays, the central bay widest.
const BAYS = [140, 150, 160, 190, 160, 150, 140];
export const COLUMN_X = BAYS.reduce((xs, w) => [...xs, xs[xs.length - 1] + w], [455]);

function el(name, attrs = {}, children = []) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.appendChild(c);
  return node;
}

function group(cls, children) {
  return el('g', { class: cls }, children);
}

// ---------- individual parts ----------

function platform() {
  const parts = [
    el('rect', { x: 380, y: 820, width: 1240, height: 80, class: 'stone' }),
    el('rect', { x: 370, y: 812, width: 1260, height: 14, class: 'stone-light' }),
  ];
  // stone block joints
  for (let x = 420; x < 1600; x += 80) {
    parts.push(el('line', { x1: x, y1: 826, x2: x, y2: 860, class: 'joint' }));
    parts.push(el('line', { x1: x + 40, y1: 860, x2: x + 40, y2: 900, class: 'joint' }));
  }
  parts.push(el('line', { x1: 380, y1: 860, x2: 1620, y2: 860, class: 'joint' }));
  // central stair, three treads
  for (let i = 0; i < 4; i++) {
    parts.push(el('rect', { x: 880 - i * 12, y: 826 + i * 18, width: 240 + i * 24, height: 18, class: 'stone-light' }));
  }
  // marble balustrade posts along the front (as on the Flying Bridge approach)
  for (let x = 400; x <= 1600; x += 60) {
    if (x > 860 && x < 1140) continue;
    parts.push(el('rect', { x: x - 5, y: 790, width: 10, height: 26, class: 'marble' }));
  }
  parts.push(el('rect', { x: 395, y: 798, width: 470, height: 6, class: 'marble' }));
  parts.push(el('rect', { x: 1135, y: 798, width: 470, height: 6, class: 'marble' }));
  return group('part-platform', parts);
}

function walls() {
  const parts = [el('rect', { x: 500, y: 598, width: 1000, height: 214, class: 'wall' })];
  // lattice doors in the five central bays
  for (let b = 1; b < 6; b++) {
    const x0 = COLUMN_X[b] + 24;
    const x1 = COLUMN_X[b + 1] - 24;
    parts.push(el('rect', { x: x0, y: 620, width: x1 - x0, height: 190, class: 'door' }));
    for (let x = x0 + 14; x < x1; x += 14) {
      parts.push(el('line', { x1: x, y1: 624, x2: x, y2: 740, class: 'lattice' }));
    }
    for (let y = 634; y < 740; y += 14) {
      parts.push(el('line', { x1: x0 + 3, y1: y, x2: x1 - 3, y2: y, class: 'lattice' }));
    }
    parts.push(el('rect', { x: x0 + 6, y: 750, width: x1 - x0 - 12, height: 50, class: 'door-panel' }));
  }
  return group('part-walls', parts);
}

function dragonPath(cx) {
  // A sinuous dragon body winding up the column, head at top.
  let d = `M ${cx - 6} 806`;
  let side = 1;
  for (let y = 806; y > 630; y -= 34) {
    d += ` Q ${cx + side * 30} ${y - 17} ${cx - side * 6} ${y - 34}`;
    side = -side;
  }
  return d;
}

function columns() {
  const parts = [];
  for (const x of COLUMN_X) {
    parts.push(el('rect', { x: x - 26, y: 804, width: 52, height: 14, rx: 4, class: 'plinth' }));
    parts.push(el('rect', { x: x - 18, y: 596, width: 36, height: 210, rx: 6, class: 'column' }));
    parts.push(el('path', { d: dragonPath(x), class: 'dragon' }));
    // head and horns
    parts.push(el('ellipse', { cx: x + 10, cy: 618, rx: 13, ry: 9, class: 'dragon-head' }));
    parts.push(el('path', { d: `M ${x + 4} 611 l -8 -14 M ${x + 14} 610 l 2 -15`, class: 'dragon-horn' }));
    parts.push(el('circle', { cx: x + 15, cy: 616, r: 2.2, class: 'dragon-eye' }));
  }
  return group('part-columns', parts);
}

function bracketSet(cx, yTop, scale = 1) {
  const tiers = [
    [110, 9], [90, 10], [64, 10], [34, 12],
  ];
  const parts = [];
  let y = yTop;
  tiers.forEach(([w, h], i) => {
    parts.push(el('rect', {
      x: cx - (w * scale) / 2, y, width: w * scale, height: h * scale,
      class: i % 2 ? 'bracket-b' : 'bracket-a',
    }));
    y += h * scale + 2;
  });
  // the slanted cantilever (ang) arms characteristic of Song brackets
  parts.push(el('path', {
    d: `M ${cx - 44 * scale} ${yTop + 2} L ${cx - 8} ${y} M ${cx + 44 * scale} ${yTop + 2} L ${cx + 8} ${y}`,
    class: 'ang',
  }));
  return parts;
}

function lowerBrackets() {
  const parts = [
    el('rect', { x: 425, y: 576, width: 1150, height: 22, class: 'beam' }),
    el('rect', { x: 415, y: 566, width: 1170, height: 10, class: 'beam-top' }),
  ];
  COLUMN_X.forEach((x, i) => {
    parts.push(...bracketSet(x, 520));
    if (i < COLUMN_X.length - 1) parts.push(...bracketSet((x + COLUMN_X[i + 1]) / 2, 526, 0.8));
  });
  // painted panels on the architrave
  for (let i = 0; i < COLUMN_X.length - 1; i++) {
    const x0 = COLUMN_X[i] + 26;
    const x1 = COLUMN_X[i + 1] - 26;
    parts.push(el('rect', { x: x0, y: 580, width: x1 - x0, height: 14, rx: 3, class: 'beam-paint' }));
  }
  return group('part-lowerBrackets', parts);
}

function tiles(xTop0, xTop1, yTop, xBot0, xBot1, yBot, step) {
  const lines = [];
  const n = Math.round((xBot1 - xBot0) / step);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const xb = xBot0 + (xBot1 - xBot0) * t;
    const xt = xTop0 + (xTop1 - xTop0) * t;
    lines.push(el('line', { x1: xt, y1: yTop, x2: xb, y2: yBot, class: 'tile-line' }));
  }
  return lines;
}

function lowerRoof() {
  const d = 'M 290 478 Q 360 518 450 518 L 1550 518 Q 1640 518 1710 478 L 1490 438 L 510 438 Z';
  return group('part-lowerRoof', [
    el('path', { d, class: 'roof' }),
    ...tiles(520, 1480, 442, 420, 1580, 512, 22),
    el('path', { d: 'M 290 478 Q 360 518 450 518 L 1550 518 Q 1640 518 1710 478', class: 'eave-edge' }),
    el('path', { d: 'M 510 438 L 1490 438', class: 'roof-ridge-line' }),
    // upturned corner ornaments
    el('path', { d: 'M 290 478 q -18 -10 -22 -26 q 14 4 26 18 z', class: 'ornament' }),
    el('path', { d: 'M 1710 478 q 18 -10 22 -26 q -14 4 -26 18 z', class: 'ornament' }),
  ]);
}

function upperBrackets() {
  const parts = [
    el('rect', { x: 545, y: 400, width: 910, height: 42, class: 'wall-upper' }),
    el('rect', { x: 530, y: 392, width: 940, height: 10, class: 'beam-top' }),
  ];
  const xs = [];
  for (let i = 0; i <= 10; i++) xs.push(560 + i * 88);
  xs.forEach((x) => parts.push(...bracketSet(x, 352, 0.82)));
  // panel boards under the eave
  for (let i = 0; i < xs.length - 1; i++) {
    parts.push(el('rect', { x: xs[i] + 30, y: 410, width: 28, height: 22, rx: 3, class: 'beam-paint' }));
  }
  return group('part-upperBrackets', parts);
}

function plaque() {
  return group('part-plaque', [
    el('rect', { x: 962, y: 372, width: 76, height: 112, rx: 6, class: 'plaque-frame' }),
    el('rect', { x: 972, y: 382, width: 56, height: 92, rx: 3, class: 'plaque-board' }),
    ...['圣', '母', '殿'].map((ch, i) => {
      const t = el('text', { x: 1000, y: 405 + i * 28, class: 'plaque-text', 'text-anchor': 'middle' });
      t.textContent = ch;
      return t;
    }),
  ]);
}

function upperRoof() {
  const d = 'M 420 318 Q 500 364 590 364 L 1410 364 Q 1500 364 1580 318 Q 1430 262 1316 186 L 684 186 Q 570 262 420 318 Z';
  return group('part-upperRoof', [
    el('path', { d, class: 'roof' }),
    ...tiles(700, 1300, 192, 560, 1440, 358, 22),
    el('path', { d: 'M 420 318 Q 500 364 590 364 L 1410 364 Q 1500 364 1580 318', class: 'eave-edge' }),
    // hip ridges running down to the corners
    el('path', { d: 'M 684 186 Q 570 262 420 318', class: 'hip-ridge' }),
    el('path', { d: 'M 1316 186 Q 1430 262 1580 318', class: 'hip-ridge' }),
    el('path', { d: 'M 420 318 q -20 -12 -24 -30 q 16 6 28 22 z', class: 'ornament' }),
    el('path', { d: 'M 1580 318 q 20 -12 24 -30 q -16 6 -28 22 z', class: 'ornament' }),
    // small ridge beasts along the hips
    ...[0.35, 0.55, 0.75].flatMap((t) => [
      el('circle', { cx: 684 - 264 * t, cy: 186 + 132 * t - 8, r: 6, class: 'ornament' }),
      el('circle', { cx: 1316 + 264 * t, cy: 186 + 132 * t - 8, r: 6, class: 'ornament' }),
    ]),
  ]);
}

function ridge() {
  return group('part-ridge', [
    el('rect', { x: 668, y: 160, width: 664, height: 30, rx: 4, class: 'ridge' }),
    el('rect', { x: 680, y: 168, width: 640, height: 10, class: 'ridge-band' }),
    // chiwen: fish-tailed ridge beasts curling inward
    el('path', { d: 'M 640 192 L 650 120 Q 656 92 690 96 Q 676 108 680 126 Q 700 118 712 128 Q 690 136 694 160 L 700 192 Z', class: 'chiwen' }),
    el('path', { d: 'M 1360 192 L 1350 120 Q 1344 92 1310 96 Q 1324 108 1320 126 Q 1300 118 1288 128 Q 1310 136 1306 160 L 1300 192 Z', class: 'chiwen' }),
    el('circle', { cx: 664, cy: 150, r: 3, class: 'dragon-eye' }),
    el('circle', { cx: 1336, cy: 150, r: 3, class: 'dragon-eye' }),
    // central finial
    el('path', { d: 'M 984 160 L 992 132 L 1000 118 L 1008 132 L 1016 160 Z', class: 'ornament' }),
  ]);
}

const BUILDERS = {
  platform, walls, columns, lowerBrackets, lowerRoof, upperBrackets, plaque, upperRoof, ridge,
};

// Back-to-front paint order of placed parts.
export const PAINT_ORDER = [
  'walls', 'platform', 'columns', 'lowerBrackets', 'upperBrackets', 'lowerRoof', 'upperRoof', 'ridge', 'plaque',
];

export function buildPart(id) {
  return BUILDERS[id]();
}

// Lanterns hung from the lower eave, one per bay. Lit at the end of the game.
export function buildLanterns() {
  const g = el('g', { class: 'lanterns' });
  for (let i = 0; i < COLUMN_X.length - 1; i++) {
    const x = (COLUMN_X[i] + COLUMN_X[i + 1]) / 2;
    // drawn around y≈570 then shifted down so they hang just below the architrave
    const lantern = el('g', { class: 'lantern', style: `--i:${i}; transform-origin: ${x}px 530px` }, [
      el('line', { x1: x, y1: 530, x2: x, y2: 548, class: 'lantern-string' }),
      el('rect', { x: x - 9, y: 546, width: 18, height: 6, class: 'lantern-cap' }),
      el('ellipse', { cx: x, cy: 572, rx: 22, ry: 20, class: 'lantern-body' }),
      // carved Jack-o'-lantern face, only glows when lit
      el('path', { d: `M ${x - 11} 566 l 5 -6 l 5 6 z M ${x + 1} 566 l 5 -6 l 5 6 z M ${x - 11} 577 q 11 9 22 0 l -4 3 l -3 -3 l -4 3 l -4 -3 l -3 3 z`, class: 'lantern-face' }),
      el('rect', { x: x - 9, y: 590, width: 18, height: 5, class: 'lantern-cap' }),
      el('path', { d: `M ${x - 4} 595 l -2 14 M ${x} 595 l 0 16 M ${x + 4} 595 l 2 14`, class: 'lantern-tassel' }),
    ]);
    lantern.removeAttribute('transform');
    g.appendChild(el('g', { transform: 'translate(0 66)' }, [lantern]));
  }
  return g;
}

export { el };
