// Project checks, run by the Kiro hook on save and usable by hand: `node tools/check.mjs`
// 1. every js/*.js file parses as an ES module
// 2. every content entry in js/data.js has both zh and en text
// 3. every puzzle `needs` id exists, and the support graph has no cycles
// 4. every image referenced by the game exists and has a credit entry
import { readdir, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const errors = [];
const fail = (msg) => errors.push(msg);

// 1. syntax
const jsFiles = (await readdir(join(root, 'js'))).filter((f) => f.endsWith('.js'));
for (const f of jsFiles) {
  const src = await readFile(join(root, 'js', f));
  const r = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: src });
  if (r.status !== 0) fail(`js/${f}: syntax error\n${r.stderr.toString().trim()}`);
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

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(2);
}
console.log(`✓ ${jsFiles.length} JS files parse; content is bilingual; build order is acyclic; all images are credited.`);
