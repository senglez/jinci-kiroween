// Hand-gesture maths for the hidden level (pure: no DOM, testable in Node).
// Landmarks are MediaPipe Hand Landmarker points in normalized image coordinates.
// Spec: .kiro/specs/gesture-bonus-level, Requirements 5 and 6.

export const LM = { WRIST: 0, THUMB_TIP: 4, INDEX_TIP: 8, MIDDLE_MCP: 9 };
export const GRAB_RATIO = 0.30; // pinch closes below this
export const RELEASE_RATIO = 0.45; // pinch opens above this (hysteresis gap between the two)
export const STEADY_FRAMES = 3; // frames a gesture must hold before it counts
// While holding, a ratio above this means the fingers are opening: freeze the piece so the
// drifting pinch point cannot pull it off target before the release fires (Req 6.4a).
export const OPENING_RATIO = (GRAB_RATIO + RELEASE_RATIO) / 2;
export const ACTIVE_AREA = { min: 0.15, max: 0.85 }; // part of the camera image mapped to the whole stage

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Thumb-to-index distance relative to palm length, so it does not depend on
// how far the hand is from the camera (Req 6.3a).
export function pinchRatio(lm) {
  const palm = dist(lm[LM.WRIST], lm[LM.MIDDLE_MCP]);
  return palm > 1e-6 ? dist(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]) / palm : Infinity;
}

export function pinchPoint(lm) {
  const a = lm[LM.THUMB_TIP];
  const b = lm[LM.INDEX_TIP];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// OPEN --(ratio < GRAB for STEADY frames)--> PINCHED --(ratio > RELEASE for STEADY frames)--> OPEN
// update() returns 'grab', 'release', or null. `null` input means no hand this frame:
// it neither advances nor breaks the current run.
export class PinchMachine {
  constructor() { this.reset(); }

  reset() {
    this.pinched = false;
    this.run = 0;
  }

  update(ratio) {
    if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return null;
    const qualifies = this.pinched ? ratio > RELEASE_RATIO : ratio < GRAB_RATIO;
    if (!qualifies) {
      this.run = 0;
      return null;
    }
    if (++this.run < STEADY_FRAMES) return null;
    this.run = 0;
    this.pinched = !this.pinched;
    return this.pinched ? 'grab' : 'release';
  }
}

// One-Euro filter (Casiez et al. 2012): little jitter when still, little lag when moving.
// Values are in CSS pixels, time in seconds.
export class OneEuro {
  constructor({ minCutoff = 1.2, beta = 0.02, dCutoff = 1.0 } = {}) {
    Object.assign(this, { minCutoff, beta, dCutoff });
    this.reset();
  }

  reset() {
    this.x = null;
    this.dx = 0;
    this.t = null;
  }

  static alpha(cutoff, dt) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(value, t) {
    if (this.x === null || this.t === null || t <= this.t) {
      this.x = value;
      this.t = t;
      return value;
    }
    const dt = t - this.t;
    const rawDx = (value - this.x) / dt;
    this.dx += OneEuro.alpha(this.dCutoff, dt) * (rawDx - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += OneEuro.alpha(cutoff, dt) * (value - this.x);
    this.t = t;
    return this.x;
  }
}

// ---------- easter egg: palms together 合十 (Requirement 10) ----------

export const LM_EGG = { INDEX_TIP: 8, MIDDLE_TIP: 12 };
export const PRAYER = {
  UPRIGHT: 0.8, // middle fingertip at least this many palm lengths above the wrist
  WRISTS: 1.0, // wrists within this many palm lengths
  TIPS: 0.7, // index and middle fingertips within this many palm lengths
  SIZE_RATIO: 0.6, // smaller palm / larger palm
  HOLD_MS: 5000,
  GAP_MS: 400,
};

const palmLength = (h) => dist(h[LM.WRIST], h[LM.MIDDLE_MCP]);
const upright = (h) => h[LM.WRIST].y - h[LM_EGG.MIDDLE_TIP].y >= PRAYER.UPRIGHT * palmLength(h);

export function isPalmsTogether(a, b) {
  if (!a || !b) return false;
  const pa = palmLength(a);
  const pb = palmLength(b);
  if (!(pa > 1e-6 && pb > 1e-6)) return false;
  if (Math.min(pa, pb) / Math.max(pa, pb) < PRAYER.SIZE_RATIO) return false;
  const s = (pa + pb) / 2;
  return upright(a) && upright(b)
    && dist(a[LM.WRIST], b[LM.WRIST]) <= PRAYER.WRISTS * s
    && dist(a[LM_EGG.MIDDLE_TIP], b[LM_EGG.MIDDLE_TIP]) <= PRAYER.TIPS * s
    && dist(a[LM.INDEX_TIP], b[LM.INDEX_TIP]) <= PRAYER.TIPS * s;
}

// Counts how long a pose has been held. Short tracking dropouts (≤ GAP_MS) do not break
// the run; a longer break restarts it. `done` is reported once per run.
export class HoldTimer {
  constructor(holdMs = PRAYER.HOLD_MS, gapMs = PRAYER.GAP_MS) {
    Object.assign(this, { holdMs, gapMs });
    this.reset();
  }

  reset() {
    this.start = null;
    this.lastActive = null;
    this.fired = false;
  }

  update(active, t) {
    if (this.lastActive !== null && t - this.lastActive > this.gapMs) this.reset();
    if (!active) {
      return { progress: this.start === null ? 0 : Math.min(1, (this.lastActive - this.start) / this.holdMs), done: false };
    }
    if (this.start === null) this.start = t;
    this.lastActive = t;
    const held = t - this.start;
    const done = !this.fired && held >= this.holdMs;
    if (done) this.fired = true;
    return { progress: Math.min(1, held / this.holdMs), done };
  }
}

// With two hands in view, keep following the one nearest the previous cursor point.
export function selectHand(hands, previous) {
  if (!hands?.length) return -1;
  if (hands.length === 1 || !previous) return 0;
  let best = 0;
  let bestD = Infinity;
  hands.forEach((h, i) => {
    const p = pinchPoint(h);
    const d = Math.hypot(p.x - previous.x, p.y - previous.y);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

const clamp01 = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5);

// Camera point -> unit square of the stage. Mirrored on x so moving the hand right moves
// the cursor right; the central ACTIVE_AREA is stretched to the full stage (Req 5.1, 5.5).
export function mapToUnit({ x, y }) {
  const span = ACTIVE_AREA.max - ACTIVE_AREA.min;
  return {
    x: clamp01((1 - x - ACTIVE_AREA.min) / span),
    y: clamp01((y - ACTIVE_AREA.min) / span),
  };
}
