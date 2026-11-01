// Project checks, run by the Kiro hook on save and usable by hand: `node tools/check.mjs`
// 1. every js/*.js file parses as an ES module
// 2. every content entry in js/data.js has both zh and en text
// 3. every puzzle `needs` id exists, and the support graph has no cycles
// 4. every image referenced by the game exists and has a credit entry
// 5. the property tests in tools/test.mjs pass
// 6. the vendored hand tracker files are present (hidden level)
import { readdir, readFile, access, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const errors = [];
const fail = (msg) => errors.push(msg);

// 1. syntax (js/ and its sub-folders)
const jsFiles = (await readdir(join(root, 'js'), { recursive: true })).filter((f) => f.endsWith('.js'));
for (const f of jsFiles) {
  const src = await readFile(join(root, 'js', f));
  const r = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: src });
  if (r.status !== 0) fail(`js/${f}: syntax error\n${r.stderr.toString().trim()}`);
}

// 5. property tests for the pure modules (tools/test.mjs)
let testCount = 0;
if (!errors.length) {
  const { results } = await import(join(root, 'tools', 'test.mjs'));
  testCount = results.length;
  for (const r of results.filter((x) => !x.ok)) fail(`test "${r.name}" failed: ${r.detail}`);
}

if (!errors.length) {
  // data.js and credits.js only import nothing / each other, so Node can load them directly.
  const { MILESTONES, PIECES, UI } = await import(join(root, 'js', 'data.js'));
  const { CREDITS } = await import(join(root, 'js', 'credits.js'));

  // 2. bilingual text
  const isText = (v) => v && typeof v === 'object' && 'zh' in v;
  const checkBilingual = (where, obj) => {
    for (const [k, v] of Object.entries(obj)) {
      if (isText(v)) {
        if (!v.zh?.trim() || !v.en?.trim()) fail(`${where}.${k}: missing zh or en text`);
      }
    }
  };
  MILESTONES.forEach((m, i) => checkBilingual(`MILESTONES[${i}] (${m.year})`, m));
  PIECES.forEach((p) => checkBilingual(`PIECES.${p.id}`, p));
  checkBilingual('UI', UI);

  // milestones must run strictly backwards in time
  MILESTONES.forEach((m, i) => {
    if (i && m.year >= MILESTONES[i - 1].year) fail(`MILESTONES: ${m.year} is not earlier than ${MILESTONES[i - 1].year}`);
  });

  // 3. support graph
  const ids = new Set(PIECES.map((p) => p.id));
  for (const p of PIECES) {
    for (const n of p.needs) if (!ids.has(n)) fail(`PIECES.${p.id}: needs unknown piece "${n}"`);
  }
  const byId = Object.fromEntries(PIECES.map((p) => [p.id, p]));
  const state = {};
  const visit = (id, path) => {
    if (state[id] === 'done') return;
    if (state[id] === 'active') { fail(`PIECES: support cycle ${[...path, id].join(' → ')}`); return; }
    state[id] = 'active';
    for (const n of byId[id]?.needs ?? []) visit(n, [...path, id]);
    state[id] = 'done';
  };
  PIECES.forEach((p) => visit(p.id, []));
  if (!PIECES.some((p) => p.needs.length === 0)) fail('PIECES: no piece can be placed first');

  // 4. images
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const referenced = new Set([
    ...MILESTONES.filter((m) => m.photo).map((m) => m.photo),
    ...[...html.matchAll(/src="(assets\/[^"]+)"/g)].map((m) => m[1]),
  ]);
  const credited = new Set(CREDITS.map((c) => c.file));
  for (const file of referenced) {
    try { await access(join(root, file)); } catch { fail(`${file}: referenced but missing`); }
    if (!credited.has(file)) fail(`${file}: used in the game but has no entry in js/credits.js`);
  }
  for (const c of CREDITS) {
    if (!c.author || !c.license || !c.source) fail(`credits: ${c.file} is missing author, license, or source`);
  }
}

// 7. 晋祠美景 gallery: files exist, credited, bilingual, ≥ 5 per season (spec: jinci-gallery)
if (!errors.length) {
  const { GALLERY, SEASONS } = await import(join(root, 'js', 'gallery-data.js'));
  const { CREDITS } = await import(join(root, 'js', 'credits.js'));
  const credited = new Set(CREDITS.map((c) => c.file));
  for (const p of GALLERY) {
    try { await access(join(root, p.file)); } catch { fail(`${p.file}: gallery photo missing`); }
    if (!credited.has(p.file)) fail(`${p.file}: gallery photo has no credit`);
    if (!p.caption?.zh?.trim() || !p.caption?.en?.trim()) fail(`${p.file}: caption needs zh and en`);
    if (!p.author || !p.license || !p.source) fail(`${p.file}: missing author, licence, or source`);
    const m = Number((p.date || '').slice(5, 7));
    const expected = m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
    if (p.season !== expected) fail(`${p.file}: season "${p.season}" does not match shooting date ${p.date}`);
  }
  for (const s of SEASONS) {
    const n = GALLERY.filter((p) => p.season === s.id).length;
    if (n < 5) fail(`gallery: only ${n} ${s.id} photos (need ≥ 5)`);
  }
  const order = GALLERY.map((p) => SEASONS.findIndex((s) => s.id === p.season));
  if (order.some((v, i) => i && v < order[i - 1])) fail('gallery: photos must be in spring → winter order');
}

// 6. vendored hand tracker (see vendor/mediapipe/README.md)
const VENDORED = [
  ['vendor/mediapipe/vision_bundle.mjs', 100_000],
  ['vendor/mediapipe/wasm/vision_wasm_internal.js', 100_000],
  ['vendor/mediapipe/wasm/vision_wasm_internal.wasm', 10_000_000],
  ['vendor/mediapipe/hand_landmarker.task', 5_000_000],
  ['vendor/mediapipe/LICENSE', 10_000],
];
for (const [file, minBytes] of VENDORED) {
  try {
    const { size } = await stat(join(root, file));
    if (size < minBytes) fail(`${file}: only ${size} bytes, looks truncated (expected ≥ ${minBytes})`);
  } catch { fail(`${file}: missing (hidden level needs it)`); }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(2);
}
console.log(`✓ ${jsFiles.length} JS files parse; content is bilingual; build order is acyclic; all images are credited; ${testCount} property tests pass.`);
