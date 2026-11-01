// Random scatter layout for the ghost-wind (pure: no DOM, testable in Node).
// Spec: .kiro/specs/gesture-bonus-level, Requirement 9.

export const MAX_TILT = 8; // degrees

// Fisher–Yates shuffle. Every permutation is equally likely if rng() is uniform in [0, 1).
export function shuffle(items, rng = Math.random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sameOrder(a, b) {
  return !!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]);
}

const signed = (rng) => rng() * 2 - 1; // uniform in [-1, 1)

// Returns where each piece lands and how it gets there.
// order[i] is the piece that goes to tray cell i.
export function scatterLayout(ids, previousOrder = null, rng = Math.random) {
  let order = shuffle(ids, rng);
  // A one-piece puzzle has only one arrangement, so it cannot differ.
  while (ids.length > 1 && sameOrder(order, previousOrder)) order = shuffle(ids, rng);
  const pieces = {};
  order.forEach((id, slot) => {
    pieces[id] = {
      slot,
      tilt: signed(rng) * MAX_TILT,
      jitter: { x: signed(rng), y: signed(rng) },
      lift: { dx: signed(rng) * 80, dy: -40 - rng() * 60 },
    };
  });
  return { order, pieces, launch: shuffle(ids, rng) };
}
