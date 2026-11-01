// Hidden-level unlock progress (pure logic + a small storage wrapper).
// Spec: .kiro/specs/gesture-bonus-level, Requirement 1.

export const UNLOCK_MS = 120_000;
export const STORAGE_KEY = 'jinci-bonus-v1';
export const EMPTY_PROGRESS = Object.freeze({ firstCompletionMs: null, unlocked: false });

// Pure. Only the first completion ever counts; later ones leave progress unchanged.
export function afterCompletion(prev, completionMs) {
  if (prev.firstCompletionMs !== null) return prev;
  return { firstCompletionMs: completionMs, unlocked: completionMs < UNLOCK_MS };
}

// Pure. Anything that is not a well-formed progress record counts as empty.
export function parseProgress(raw) {
  if (typeof raw !== 'string') return EMPTY_PROGRESS;
  try {
    const v = JSON.parse(raw);
    const ms = v?.firstCompletionMs;
    if (ms === null && v.unlocked === false) return EMPTY_PROGRESS;
    if (typeof ms === 'number' && Number.isFinite(ms) && ms >= 0 && typeof v.unlocked === 'boolean') {
      // Re-derive `unlocked` so a hand-edited record cannot unlock a slow first run.
      return { firstCompletionMs: ms, unlocked: ms < UNLOCK_MS };
    }
  } catch { /* corrupt JSON */ }
  return EMPTY_PROGRESS;
}

// `storage` is a Storage-like object (getItem/setItem) or null. If it is missing or
// throws, progress lives in memory for this page load only (Req 1.6).
export function createProgressStore(storage) {
  let memory = EMPTY_PROGRESS;
  const load = () => {
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw != null) memory = parseProgress(raw);
    } catch { /* storage blocked: keep memory */ }
    return memory;
  };
  const save = (p) => {
    memory = p;
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* storage blocked */ }
  };
  return {
    load,
    isUnlocked: () => load().unlocked,
    // Call when the 9th piece of a main-game round is placed (Req 1.5).
    complete(completionMs) {
      const prev = load();
      const next = afterCompletion(prev, completionMs);
      if (next !== prev) save(next);
      return { progress: next, justUnlocked: !prev.unlocked && next.unlocked };
    },
  };
}
