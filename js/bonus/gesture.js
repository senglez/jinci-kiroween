// Hand-gesture maths for the hidden level (pure: no DOM, testable in Node).
// Landmarks are MediaPipe Hand Landmarker points in normalized image coordinates.
// Spec: .kiro/specs/gesture-bonus-level, Requirements 5 and 6.

export const LM = { WRIST: 0, THUMB_TIP: 4, INDEX_TIP: 8, MIDDLE_MCP: 9 };
export const GRAB_RATIO = 0.30; // pinch closes below this
export const RELEASE_RATIO = 0.45; // pinch opens above this (hysteresis gap between the two)
export const STEADY_FRAMES = 3; // frames a gesture must hold before it counts
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
