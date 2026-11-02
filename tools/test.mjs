// Property-based tests for the pure modules. No dependencies: `node tools/test.mjs`.
// Each property runs many seeded random cases; a failure prints the seed and the case
// so it can be replayed. Property numbers match the design doc
// (.kiro/specs/gesture-bonus-level/design.md, "Correctness properties").

import { afterCompletion, createProgressStore, EMPTY_PROGRESS, parseProgress, STORAGE_KEY, UNLOCK_MS } from '../js/bonus/progress.js';
import { GRAB_RATIO, HoldTimer, isPalmsTogether, mapToUnit, OneEuro, PinchMachine, pinchPoint, PRAYER, RELEASE_RATIO, selectHand, STEADY_FRAMES } from '../js/bonus/gesture.js';
import { MAX_TILT, sameOrder, scatterLayout, shuffle } from '../js/scatter.js';
import { firstOfSeason, seasonForMonth, wrap } from '../js/gallery.js';
import { clampIndex, flightDirection, nextAuto } from '../js/timeline.js';

// ---------- harness ----------

// mulberry32: small, fast, seedable generator with good statistical quality for tests.
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const results = [];
function property(name, runs, gen, check) {
  const base = 0x5eed;
  for (let i = 0; i < runs; i++) {
    const seed = base + i;
    const rng = seeded(seed);
    const input = gen(rng);
    let ok;
    let err;
    try { ok = check(input, rng) !== false; } catch (e) { ok = false; err = e; }
    if (!ok) {
      const shown = JSON.stringify(input, (k, v) => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v));
      results.push({ name, ok: false, detail: `seed ${seed}: ${err?.message ?? 'check returned false'}\n    input: ${shown.slice(0, 400)}` });
      return;
    }
  }
  results.push({ name, ok: true, detail: `${runs} cases` });
}
function example(name, fn) {
  try { fn(); results.push({ name, ok: true, detail: 'example' }); } catch (e) { results.push({ name, ok: false, detail: e.message }); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ---------- generators ----------

const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, xs) => xs[Math.floor(rng() * xs.length)];
const PIECE_IDS = ['platform', 'walls', 'columns', 'lowerBrackets', 'lowerRoof', 'upperBrackets', 'plaque', 'upperRoof', 'ridge'];
// Completion times biased to land near the 2-minute threshold as well as far from it.
const completionMs = (rng) => pick(rng, [
  () => int(rng, 0, 400_000),
  () => UNLOCK_MS + int(rng, -3, 3),
  () => UNLOCK_MS - 1,
  () => UNLOCK_MS,
])();
// One frame of pinch input: a ratio somewhere in [0, 1], or null for "no hand".
const frame = (rng) => (rng() < 0.15 ? null : pick(rng, [
  () => rng() * GRAB_RATIO, // clearly pinched
  () => RELEASE_RATIO + rng() * (1 - RELEASE_RATIO), // clearly open
  () => GRAB_RATIO + rng() * (RELEASE_RATIO - GRAB_RATIO), // in the hysteresis band
  () => pick(rng, [GRAB_RATIO, RELEASE_RATIO]), // exactly on a threshold
])());

const runMachine = (frames, m = new PinchMachine()) => frames.map((f) => m.update(f)).filter(Boolean);

// ---------- Property 1–2: unlock progress ----------

property('P1 unlock iff the first completion is under 2 minutes', 2000,
  (rng) => completionMs(rng),
  (t) => afterCompletion(EMPTY_PROGRESS, t).unlocked === (t < UNLOCK_MS));

property('P2 only the first completion ever counts', 1000,
  (rng) => Array.from({ length: int(rng, 1, 12) }, () => completionMs(rng)),
  (times) => {
    const [first, ...later] = times;
    const after1 = afterCompletion(EMPTY_PROGRESS, first);
    let p = after1;
    for (const t of later) p = afterCompletion(p, t);
    return p === after1;
  });

property('P2 store: unlock state survives reloads and later runs', 300,
  (rng) => Array.from({ length: int(rng, 1, 6) }, () => completionMs(rng)),
  (times) => {
    const disk = new Map();
    const storage = { getItem: (k) => disk.get(k) ?? null, setItem: (k, v) => disk.set(k, String(v)) };
    let reveals = 0;
    for (const t of times) {
      const store = createProgressStore(storage); // a fresh store = a page reload
      if (store.complete(t).justUnlocked) reveals++;
    }
    const expected = times[0] < UNLOCK_MS;
    return createProgressStore(storage).isUnlocked() === expected && reveals === (expected ? 1 : 0);
  });

example('store falls back to memory when storage throws (Req 1.6)', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const store = createProgressStore(broken);
  assert(store.complete(60_000).justUnlocked, 'first fast run should unlock');
  assert(store.isUnlocked(), 'unlock should be remembered for this page load');
  assert(!createProgressStore(broken).isUnlocked(), 'a new page load cannot remember it');
  assert(createProgressStore(null).complete(1).justUnlocked, 'null storage works');
});

example('corrupt or hand-edited stored values are handled (Req 1.4)', () => {
  for (const raw of [null, '', '{', '"x"', '[]', '{"firstCompletionMs":-5,"unlocked":true}', '{"firstCompletionMs":"9","unlocked":true}']) {
    assert(parseProgress(raw) === EMPTY_PROGRESS, `should be empty: ${raw}`);
  }
  const edited = parseProgress(JSON.stringify({ firstCompletionMs: 300_000, unlocked: true }));
  assert(edited.firstCompletionMs === 300_000 && edited.unlocked === false, 'slow run cannot be edited into an unlock');
  const disk = new Map([[STORAGE_KEY, '{not json']]);
  const store = createProgressStore({ getItem: (k) => disk.get(k) ?? null, setItem: (k, v) => disk.set(k, v) });
  assert(store.complete(10).justUnlocked, 'corrupt record counts as no first completion');
});

// ---------- Property 3–5: pinch state machine ----------

property('P3 grab and release strictly alternate, starting with grab', 2000,
  (rng) => Array.from({ length: int(rng, 0, 200) }, () => frame(rng)),
  (frames) => runMachine(frames).every((e, i) => e === (i % 2 === 0 ? 'grab' : 'release')));

property('P4 ratios inside the hysteresis band never change state', 1000,
  (rng) => ({
    startPinched: rng() < 0.5,
    frames: Array.from({ length: int(rng, 1, 100) }, () => (rng() < 0.1 ? null : GRAB_RATIO + rng() * (RELEASE_RATIO - GRAB_RATIO))),
  }),
  ({ startPinched, frames }) => {
    const m = new PinchMachine();
    if (startPinched) for (let i = 0; i < STEADY_FRAMES; i++) m.update(0);
    return m.pinched === startPinched && runMachine(frames, m).length === 0 && m.pinched === startPinched;
  });

property('P5 fewer than 3 steady frames never trigger a gesture', 1000,
  (rng) => {
    // Runs of 0–2 pinched frames, each broken by an in-band frame; nulls sprinkled anywhere.
    const frames = [];
    for (let k = int(rng, 1, 30); k > 0; k--) {
      for (let j = int(rng, 0, STEADY_FRAMES - 1); j > 0; j--) {
        frames.push(rng() * GRAB_RATIO);
        if (rng() < 0.3) frames.push(null);
      }
      frames.push((GRAB_RATIO + RELEASE_RATIO) / 2);
    }
    return frames;
  },
  (frames) => runMachine(frames).length === 0);

example('three steady pinched frames grab on the third; no-hand frames do not break the run', () => {
  const m = new PinchMachine();
  assert(m.update(0.1) === null && m.update(null) === null && m.update(0.1) === null, 'not yet');
  assert(m.update(0.1) === 'grab', 'third pinched frame grabs');
  assert(m.update(0.5) === null && m.update(0.5) === null && m.update(0.5) === 'release', 'release after three open frames');
});

// ---------- Property 6: mapping ----------

property('P6 mapping stays inside the stage, mirrored and monotonic', 3000,
  (rng) => ({ a: { x: rng() * 3 - 1, y: rng() * 3 - 1 }, b: { x: rng() * 3 - 1, y: rng() * 3 - 1 } }),
  ({ a, b }) => {
    const ma = mapToUnit(a);
    const mb = mapToUnit(b);
    const inside = (p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
    const mirrored = a.x < b.x ? ma.x >= mb.x : ma.x <= mb.x;
    const monoY = a.y < b.y ? ma.y <= mb.y : ma.y >= mb.y;
    return inside(ma) && inside(mb) && mirrored && monoY;
  });

example('mapping: centre maps to centre; non-finite input stays on stage', () => {
  const c = mapToUnit({ x: 0.5, y: 0.5 });
  assert(Math.abs(c.x - 0.5) < 1e-9 && Math.abs(c.y - 0.5) < 1e-9, 'centre');
  const n = mapToUnit({ x: NaN, y: Infinity });
  assert(n.x >= 0 && n.x <= 1 && n.y >= 0 && n.y <= 1, 'non-finite');
});

// ---------- Property 7: smoothing ----------

property('P7 One-Euro output converges to a constant input', 500,
  (rng) => ({ start: rng() * 2000, target: rng() * 2000, dts: Array.from({ length: 120 }, () => 1 / int(rng, 15, 60)) }),
  ({ start, target, dts }) => {
    const f = new OneEuro();
    let t = 0;
    f.filter(start, t);
    let out = start;
    for (const dt of dts) { t += dt; out = f.filter(target, t); }
    return Math.abs(out - target) < 0.5; // under half a pixel
  });

// ---------- Property 8–10: scatter layout ----------

property('P8 every piece gets exactly one cell; tilt and jitter in range', 2000,
  (rng) => ({ previous: rng() < 0.5 ? shuffle(PIECE_IDS, rng) : null }),
  ({ previous }, rng) => {
    const { order, pieces, launch } = scatterLayout(PIECE_IDS, previous, rng);
    const slots = PIECE_IDS.map((id) => pieces[id].slot).sort((x, y) => x - y);
    return slots.every((s, i) => s === i)
      && order.every((id, i) => pieces[id].slot === i)
      && [...launch].sort().join() === [...PIECE_IDS].sort().join()
      && PIECE_IDS.every((id) => {
        const p = pieces[id];
        return Math.abs(p.tilt) <= MAX_TILT && Math.abs(p.jitter.x) <= 1 && Math.abs(p.jitter.y) <= 1 && p.lift.dy <= -40;
      });
  });

property('P9 a new scatter never repeats the previous arrangement', 2000,
  (rng) => ({ seed: int(rng, 1, 2 ** 31) }),
  ({ seed }) => {
    // Make `previous` the very arrangement the generator would produce first, to force a reshuffle.
    const previous = shuffle(PIECE_IDS, seeded(seed));
    return !sameOrder(scatterLayout(PIECE_IDS, previous, seeded(seed)).order, previous);
  });

const CHI2_CRITICAL_DF8_P001 = 26.12;
function worstChi2(makeOrder, runs = 18_000) {
  const counts = Object.fromEntries(PIECE_IDS.map((id) => [id, new Array(PIECE_IDS.length).fill(0)]));
  for (let i = 0; i < runs; i++) makeOrder().forEach((id, slot) => counts[id][slot]++);
  const e = runs / PIECE_IDS.length;
  return Math.max(...PIECE_IDS.map((id) => counts[id].reduce((s, c) => s + (c - e) ** 2 / e, 0)));
}

example('P10 each piece lands in each cell equally often (chi-square, p > 0.001)', () => {
  const rng = seeded(2026);
  let prev = null;
  const chi = worstChi2(() => (prev = scatterLayout(PIECE_IDS, prev, rng).order));
  assert(chi < CHI2_CRITICAL_DF8_P001, `worst chi-square ${chi.toFixed(1)} ≥ ${CHI2_CRITICAL_DF8_P001}`);
});

example('P10 sanity: the same test rejects the old random-comparator shuffle', () => {
  const rng = seeded(2026);
  const chi = worstChi2(() => PIECE_IDS.slice().sort(() => rng() - 0.5));
  assert(chi >= CHI2_CRITICAL_DF8_P001, `old shuffle unexpectedly passed (chi-square ${chi.toFixed(1)})`);
});

// ---------- Property 11–14: easter egg 合十 ----------

// A plausible palms-together pair centred at (cx, cy) with palm length s, plus small noise.
function prayerPair(rng, cx = 0.5, cy = 0.5, s = 0.15) {
  const n = () => (rng() - 0.5) * 0.06 * s;
  const hand = (side) => {
    const h = Array.from({ length: 21 }, () => ({ x: cx + side * 0.05 * s, y: cy, z: 0 }));
    h[0] = { x: cx + side * 0.15 * s + n(), y: cy + s + n(), z: 0 }; // wrist
    h[9] = { x: cx + side * 0.1 * s + n(), y: cy + n(), z: 0 }; // middle knuckle (palm = s)
    h[12] = { x: cx + side * 0.05 * s + n(), y: cy - 0.8 * s + n(), z: 0 }; // middle tip
    h[8] = { x: cx + side * 0.07 * s + n(), y: cy - 0.7 * s + n(), z: 0 }; // index tip
    h[4] = { x: cx + side * 0.2 * s + n(), y: cy + 0.1 * s + n(), z: 0 }; // thumb tip
    return h;
  };
  return [hand(-1), hand(1)];
}
const mapHand = (h, f) => h.map((p) => ({ ...f(p), z: 0 }));

property('P11 palms-together is symmetric and invariant under move and scale', 2000,
  (rng) => ({ pair: prayerPair(rng, 0.3 + rng() * 0.4, 0.3 + rng() * 0.4, 0.08 + rng() * 0.15), dx: rng() - 0.5, dy: rng() - 0.5, k: 0.5 + rng() * 1.5 }),
  ({ pair: [a, b], dx, dy, k }) => {
    const base = isPalmsTogether(a, b);
    const move = (p) => ({ x: p.x + dx, y: p.y + dy });
    const scale = (p) => ({ x: 0.5 + (p.x - 0.5) * k, y: 0.5 + (p.y - 0.5) * k });
    return base === true
      && isPalmsTogether(b, a) === base
      && isPalmsTogether(mapHand(a, move), mapHand(b, move)) === base
      && isPalmsTogether(mapHand(a, scale), mapHand(b, scale)) === base;
  });

property('P12 hands apart or pointing down are not palms together', 2000,
  (rng) => ({ pair: prayerPair(rng), far: 2.05 + rng() * 3, angle: rng() * Math.PI * 2, flip: rng() < 0.5 }),
  ({ pair: [a, b], far, angle, flip }) => {
    const s = 0.15;
    if (flip) {
      // Both hands together but pointing down (mirror the whole pair about a horizontal
      // line): every distance check still passes, so only "upright" can reject it.
      const m = (p) => ({ x: p.x, y: 1 - p.y });
      return isPalmsTogether(mapHand(a, m), mapHand(b, m)) === false;
    }
    const away = mapHand(b, (p) => ({ x: p.x + Math.cos(angle) * far * s, y: p.y + Math.sin(angle) * far * s }));
    return isPalmsTogether(a, away) === false;
  });

property('P13 hold fires once, only after 5 s of a run without long gaps', 1500,
  (rng) => {
    // Segments of steady tracking (0–7 s of frames, mostly active, short dropouts),
    // separated by breaks that may or may not exceed the gap limit.
    const frames = [];
    let t = 0;
    for (let seg = int(rng, 1, 6); seg > 0; seg--) {
      const end = t + rng() * 7000;
      while (t < end) {
        t += pick(rng, [16, 33, 33, 33, 50, 120, 300, 390]);
        frames.push({ t, active: rng() < 0.9 });
      }
      t += pick(rng, [100, 350, 401, 450, 900, 2000]);
      frames.push({ t, active: rng() < 0.5 });
    }
    return frames;
  },
  (frames) => {
    const timer = new HoldTimer();
    let runStart = null;
    let lastActive = null;
    let firedThisRun = false;
    for (const { t, active } of frames) {
      if (lastActive !== null && t - lastActive > PRAYER.GAP_MS) { runStart = null; lastActive = null; firedThisRun = false; }
      if (active) { runStart ??= t; lastActive = t; }
      const { done, progress } = timer.update(active, t);
      if (progress < 0 || progress > 1) return false;
      if (done) {
        if (firedThisRun || !active || runStart === null || t - runStart < PRAYER.HOLD_MS) return false;
        firedThisRun = true;
      }
      // must fire as soon as the model says it is due
      if (!done && active && runStart !== null && t - runStart >= PRAYER.HOLD_MS && !firedThisRun) return false;
    }
    return true;
  });

property('P14 selectHand returns a valid index, nearest to the previous point', 2000,
  (rng) => ({ hands: Array.from({ length: int(rng, 1, 3) }, () => prayerPair(rng, rng(), rng())[0]), prev: rng() < 0.2 ? null : { x: rng(), y: rng() } }),
  ({ hands, prev }) => {
    const i = selectHand(hands, prev);
    if (!(i >= 0 && i < hands.length)) return false;
    if (hands.length === 1 || !prev) return i === 0;
    const d = (h) => { const p = pinchPoint(h); return Math.hypot(p.x - prev.x, p.y - prev.y); };
    return hands.every((h) => d(hands[i]) <= d(h));
  });

example('egg: no hands or one hand is never palms together; selectHand([]) is -1', () => {
  const [a] = prayerPair(seeded(1));
  assert(!isPalmsTogether(a, null) && !isPalmsTogether(null, null), 'missing hand');
  assert(selectHand([], null) === -1, 'empty list');
});

// ---------- gallery paging (spec: jinci-gallery) ----------

property('G1 wrap stays in range and next-then-prev returns to the start', 3000,
  (rng) => ({ i: int(rng, -1000, 1000), n: int(rng, 1, 50), k: int(rng, 0, 120) }),
  ({ i, n, k }) => {
    const w = wrap(i, n);
    let j = w;
    for (let s = 0; s < k; s++) j = wrap(j + 1, n);
    for (let s = 0; s < k; s++) j = wrap(j - 1, n);
    return Number.isInteger(w) && w >= 0 && w < n && j === w && wrap(w + n, n) === w;
  });

example('G2 every month maps to its season (Mar–May spring … Dec–Feb winter)', () => {
  const want = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
  want.forEach((s, i) => assert(seasonForMonth(i + 1) === s, `month ${i + 1} → ${seasonForMonth(i + 1)}`));
  const items = [{ season: 'spring' }, { season: 'spring' }, { season: 'summer' }];
  assert(firstOfSeason(items, 'summer') === 2 && firstOfSeason(items, 'winter') === -1, 'firstOfSeason');
});

// ---------- timeline (main spec Requirement 9) ----------

property('T1 timeline index is clamped, never wraps, and nextAuto stops at the end', 3000,
  (rng) => ({ i: pick(rng, [int(rng, -50, 50), NaN, Infinity, -Infinity, int(rng, 0, 9) + 0.5]), n: int(rng, 1, 20) }),
  ({ i, n }, rng) => {
    const c = clampIndex(i, n);
    if (!(Number.isInteger(c) && c >= 0 && c < n)) return false;
    if (Number.isFinite(i) && i >= 0 && i < n && c !== Math.trunc(i)) return false;
    if (i >= n && c !== n - 1) return false; // past the end: stays at the last milestone
    const k = int(rng, 0, n - 1);
    return nextAuto(n - 1, n) === null && (k === n - 1 || nextAuto(k, n) === k + 1);
  });

property('T2 flight direction: higher index = further into the past, and it is antisymmetric', 2000,
  (rng) => ({ a: int(rng, 0, 9), b: int(rng, 0, 9) }),
  ({ a, b }) => {
    const d = flightDirection(a, b);
    const same = (x, y) => x === y || (x === 0 && y === 0); // treat -0 and 0 as equal
    return same(d, Math.sign(b - a)) && same(flightDirection(b, a), -d) && (a !== b || d === 0);
  });

// ---------- report ----------

export function report() {
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name} (${r.detail})`);
  return failed.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const failed = report();
  console.log(failed ? `\n${failed} failing` : `\nall ${results.length} passing`);
  process.exit(failed ? 1 : 0);
}

export { results };
