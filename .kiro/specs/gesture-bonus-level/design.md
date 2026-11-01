# Design: Hidden Level 鬼手营造 (Ghost-Hand Builder)

## Overview

The bonus level reuses the existing `Puzzle` (same SVG hall, pieces, support rules, fact cards) and replaces pointer input with a webcam hand-tracking pipeline:

```
webcam ─▶ <video> ─▶ HandTracker ─▶ landmarks ─▶ gesture.js ─▶ GestureInput ─▶ Puzzle drag API
          (getUserMedia)  (MediaPipe,          (pinch ratio,    (cursor, hover,     (beginDrag /
                           vendored)            hysteresis,      grab / release,     dragTo /
                                                smoothing,       hand-lost timer)    endDrag)
                                                mapping)
```

Everything runs in the browser. No frame or landmark leaves the page.

## Files

| File | Kind | Responsibility |
|---|---|---|
| `js/bonus/progress.js` | pure | Unlock rule and `localStorage` read/write |
| `js/bonus/gesture.js` | pure | Pinch ratio, pinch state machine, One-Euro smoothing, camera-to-stage mapping |
| `js/bonus/tracker.js` | browser | Camera start/stop, lazy-load MediaPipe, per-frame detection loop |
| `js/bonus/input.js` | browser | `GestureInput`: ghost cursor, hit-testing, drives the Puzzle drag API |
| `js/bonus/level.js` | browser | `BonusLevel`: screens (privacy, loading, error, tutorial, play, win), exit, visibility |
| `vendor/mediapipe/` | vendored | `vision_bundle.mjs`, `wasm/vision_wasm_internal.{js,wasm}`, `hand_landmarker.task`, `LICENSE` |
| `js/scatter.js` | pure | Random scatter layout shared by the main game and the bonus level |
| `tools/test.mjs` | test | Property-based tests for the three pure modules (no dependencies) |

"Pure" modules import nothing from the DOM, so Node can import them in tests and in `tools/check.mjs`.

Changes to existing files:

- `js/puzzle.js`: extract the drag logic into public methods, add an input mode (below), and take the scatter layout from `js/scatter.js` instead of the biased `sort(() => Math.random() - 0.5)`.
- `js/main.js`: record progress on win, show the unlock reveal, show the title-screen entrance, start `BonusLevel`.
- `js/data.js`: new bilingual strings under `UI.bonus*`.
- `index.html` / `css/style.css`: bonus overlays, camera preview, ghost cursor, ghost-green theme (`#scene-game.bonus`).
- `js/credits.js` + `NOTICE.md`: credit MediaPipe.
- `tools/serve.mjs`: add MIME types for `.mjs`, `.wasm`, `.task`.
- `tools/check.mjs`: run `tools/test.mjs` and check the vendored files exist.
- `.kiro/steering/project.md`: allow vendored third-party code under `vendor/` with its licence.

## Vendored hand tracker

- Package `@mediapipe/tasks-vision` **1.2.0**, Apache-2.0, from npm.
- Only the files the hand landmarker needs: `vision_bundle.mjs` (156 KB), `wasm/vision_wasm_internal.js` (334 KB), `wasm/vision_wasm_internal.wasm` (14.5 MB).
- Model `hand_landmarker.task` float16 v1 (7.8 MB) from `storage.googleapis.com/mediapipe-models/...`, Apache-2.0.
- Total about **23 MB**. The no-SIMD WebAssembly build (12.9 MB) is left out. Every current desktop browser supports WebAssembly SIMD; if one does not, `FilesetResolver.isSimdSupported()` returns false and the level shows the "browser not supported" error (Requirement 3.3).
- The bundle's `//# sourceMappingURL` comment points to a map we do not ship; the browser only logs a devtools warning. The file is otherwise unchanged.

Loading, only when the player presses "开启摄像头":

```js
const { FilesetResolver, HandLandmarker } = await import('../../vendor/mediapipe/vision_bundle.mjs');
if (!(await FilesetResolver.isSimdSupported())) throw new TrackerError('unsupported');
const fileset = await FilesetResolver.forVisionTasks(new URL('../../vendor/mediapipe/wasm', import.meta.url).href);
const landmarker = await HandLandmarker.createFromOptions(fileset, {
  baseOptions: { modelAssetPath: new URL('../../vendor/mediapipe/hand_landmarker.task', import.meta.url).href, delegate: 'GPU' },
  runningMode: 'VIDEO', numHands: 1,
  minHandDetectionConfidence: 0.6, minHandPresenceConfidence: 0.6, minTrackingConfidence: 0.5,
});
```

If creating with the GPU delegate throws, retry once with `delegate: 'CPU'`.

## Unlock progress (`progress.js`)

Stored under `localStorage['jinci-bonus-v1']` as `{ firstCompletionMs: number | null, unlocked: boolean }`.

```js
export const UNLOCK_MS = 120_000;
// Pure: returns the progress to store after a completion. Never mutates `prev`.
export function afterCompletion(prev, completionMs) {
  if (prev.firstCompletionMs !== null) return prev;          // only the first completion ever counts
  return { firstCompletionMs: completionMs, unlocked: completionMs < UNLOCK_MS };
}
```

`loadProgress()` / `saveProgress()` wrap storage in `try/catch`. If storage throws, they fall back to a module-level in-memory value, which gives the per-page-load behaviour of Requirement 1.6. A corrupt stored value is treated as empty progress. `afterCompletion` returns `{ progress, justUnlocked }` to `main.js` through a thin wrapper so the dialog knows whether to play the reveal.

## Random scatter (`scatter.js`)

Today `Puzzle.scatter()` shuffles with `ids.sort(() => Math.random() - 0.5)`. A random comparator gives a biased order (some arrangements come up far more often than others), and nothing stops two scatters in a row from being identical. The layout moves into a pure module:

```js
// rng: () => number in [0, 1). Defaults to Math.random; tests pass a seeded generator.
export function shuffle(items, rng) { /* Fisher–Yates: for i from n−1 down to 1, swap i with floor(rng()·(i+1)) */ }

export function scatterLayout(ids, previousOrder, rng = Math.random) {
  let order = shuffle(ids, rng);
  while (previousOrder && sameOrder(order, previousOrder)) order = shuffle(ids, rng); // Req 9.2
  return {
    order,                                   // order[i] goes to tray cell i
    pieces: Object.fromEntries(order.map((id, i) => [id, {
      slot: i,
      tilt: (rng() * 2 - 1) * 8,             // degrees, Req 9.3
      jitter: { x: rng() * 2 - 1, y: rng() * 2 - 1 },  // −1…1, scaled to the free space in the cell
      lift: { dx: (rng() * 2 - 1) * 80, dy: -40 - rng() * 60 },  // Req 9.4
    }])),
    launch: shuffle(ids, rng),               // fly-out order, Req 9.4
  };
}
```

With 9 pieces there are 9! = 362,880 arrangements, so the reshuffle loop almost never runs more than once.

`Puzzle` keeps the last `order` for the "differs from previous" rule. `trayTarget(id)` turns `jitter` into stage units: after the piece is scaled to fit its cell, the free space left on each side is `(cellW − 90 − w·s) / 2` horizontally and `(rowH − 50 − h·s) / 2` vertically. The offset is `jitter × min(free space, 24)`, so the piece never crosses its cell border (Req 9.3). The tilt is applied on top, and the 45/25-unit cell padding leaves room for it. Slots are cell numbers, so a landscape/portrait relayout keeps each piece's cell (Req 9.5).

## Gesture recognition (`gesture.js`)

MediaPipe returns 21 landmarks per hand in normalized image coordinates. Indices used: 0 wrist, 4 thumb tip, 8 index tip, 9 middle-finger knuckle (MCP).

**Pinch ratio** (scale-free, Requirement 6.3a):

```
ratio = dist(lm[4], lm[8]) / dist(lm[0], lm[9])
```

**Pinch state machine** with hysteresis and debounce (Requirements 6.3, 6.5):

```
            ratio < GRAB (0.30) for ≥ 3 frames
   OPEN ─────────────────────────────────────▶ PINCHED   (emit 'grab')
     ▲                                           │
     └───────────────────────────────────────────┘
            ratio > RELEASE (0.45) for ≥ 3 frames         (emit 'release')
```

Ratios between 0.30 and 0.45 never change the state. Frames without a hand do not advance either counter. At about 30 detections per second, 3 frames is about 100 ms. The thresholds are constants so they can be tuned during play-testing.

**Smoothing** (Requirement 5.2): a One-Euro filter on x and y (`minCutoff 1.2, beta 0.02, dCutoff 1.0`). It removes jitter when the hand is still and keeps little lag when it moves fast.

**Mapping** (Requirements 5.1, 5.5): the pinch point `(x, y)` is mirrored (`x' = 1 − x`), then the central part of the camera image (`0.15…0.85` on both axes) is stretched to the full stage and clamped to `[0, 1]`. The player reaches every edge of the stage without the hand leaving the camera's view.

## Tracker loop (`tracker.js`)

- `getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })`.
- Errors map to error codes shown in plain words: `NotAllowedError` → `denied`; `NotFoundError` / `OverconstrainedError` → `nocamera`; `NotReadableError` → `busy`; no `navigator.mediaDevices` → `nocameraapi`; load failures → `unsupported` or `loadfailed`.
- Detection runs on `requestAnimationFrame`, but only when `video.currentTime` has changed, so no frame is processed twice. Each result is passed to the listener as `{ landmarks: Landmark[] | null, t }`. A rolling FPS value is kept for the debug overlay and the 20 FPS requirement.
- `stop()` stops every `MediaStreamTrack`, clears `video.srcObject`, and cancels the loop. It is idempotent.
- *Changed during implementation:* the loaded landmarker is kept (not `close()`d) so that "再玩一次隐藏关卡" does not reload 22 MB. It holds no camera access and no frames; privacy depends only on the camera tracks, which `stop()` always ends.
- *Found during implementation:* the puzzle can be built while its scene is hidden, when `getBBox()` returns 0×0. `Puzzle.measure()` re-measures pieces before `assemble()` and `scatter()`.

## Puzzle changes (`puzzle.js`)

The current `bindPiece` closure is split into public methods used by both pointer events and gestures:

```js
pieceAt(clientX, clientY)        // unplaced loose piece under the point, or null (elementFromPoint + closest('.piece'))
beginDrag(id, clientX, clientY)  // same as today's pointerdown body
dragTo(clientX, clientY)         // same as today's pointermove body
endDrag()                        // same as today's pointerup body → drop()
cancelDrag()                     // return held piece to its tray cell, no attempt counted
setInputMode('pointer' | 'gesture')
```

In `'gesture'` mode the pointer and keyboard handlers on pieces return early (Requirement 3.4). Pointer mode behaves exactly as today (Requirement 8.5). The ghost cursor element has `pointer-events: none`, so `elementFromPoint` finds the piece under it.

## Gesture input (`input.js`)

`GestureInput` connects tracker results to the puzzle:

| Event | Action |
|---|---|
| hand frame | update smoothed cursor; set `hover` if `pieceAt()` finds a piece; if holding, `dragTo()` |
| `grab` | if hovering a piece → `beginDrag()`, cursor shows *pinched*; else nothing (Req 6.2) |
| `release` | if holding → `endDrag()` (normal drop rules, Req 6.4) |
| no hand | fade cursor, show "看不到你的手"; if holding for > 1000 ms → `cancelDrag()` and say the hand was lost (Req 6.6) |

## Level flow (`level.js`)

```
entrance ─▶ privacy ──开启摄像头──▶ loading ──ok──▶ tutorial ──3 steps / 跳过──▶ play ──9/9──▶ bonus win
               │                      │                                      │
               └──返回──▶ title       └──error──▶ error screen ──返回──▶ title  └──退出 / Esc──▶ title
```

- **Play** starts from the assembled hall and the ghost-wind scatter (Req 7.1), with `#scene-game.bonus` for the ghost-green theme and the "鬼手营造" title.
- **Bonus win** stops the camera first, then lights the lanterns and shows "鬼手匠师 · 隐藏关卡完成！" with time and attempts, plus "再玩一次隐藏关卡" (back to *privacy*, camera starts again on consent) and "回到开始".
- **Visibility**: on `visibilitychange` to hidden, the camera stops (Req 2.5), any held piece is cancelled, and when the page is visible again the *privacy* screen is shown so the player opts in again. Puzzle progress is kept.
- **Exit** (button or Escape) always calls `tracker.stop()`.
- Bonus completions do not call `afterCompletion`, so they never affect unlocking.

## UI additions

- Title screen: `#btn-bonus` (hidden unless unlocked), styled as a ghost-green lantern.
- Success dialog: `#unlock-reveal` block, hidden by default; the reveal is a flicker-in with a bell and green sparks.
- Bonus overlay `#bonus-panel` for the privacy, loading, error, and tutorial screens.
- Camera preview: `<video id="cam" playsinline muted>` 160×120, bottom-right, mirrored with `transform: scaleX(-1)`, with a red "● 摄像头开启" badge.
- Ghost cursor `#ghost-hand`: an SVG hand with three states (`.open`, `.hover`, `.pinched`).

## Error handling

| Situation | Shown to player | Choices |
|---|---|---|
| no `mediaDevices` | 这个浏览器不支持摄像头 | 返回 |
| permission denied | 你没有允许使用摄像头。可以在地址栏的摄像头图标里重新允许。 | 返回 |
| no camera / busy | 没有找到可用的摄像头（可能被别的程序占用） | 返回 |
| no WebAssembly SIMD | 这个浏览器太旧，无法运行手势识别 | 返回 |
| model / wasm failed | 手势识别加载失败，请刷新后再试 | 返回 |

All texts are bilingual in `data.js`.

## Correctness properties

Tested by `tools/test.mjs` with a small seeded random generator (hundreds of cases each, no dependencies):

1. **Unlock rule**: for empty progress, `afterCompletion(p, t).unlocked === (t < 120000)` for any `t ≥ 0`. (Req 1.1, 1.2)
2. **One chance**: once `firstCompletionMs` is set, any sequence of later completions leaves the progress unchanged. (Req 1.3, 1.4)
3. **Alternation**: for any sequence of ratios and missing-hand frames, the pinch machine's events strictly alternate `grab, release, grab, …`, starting with `grab`. (Req 6.3)
4. **Hysteresis**: ratios that stay inside `[0.30, 0.45]` never produce an event, whatever the starting state. (Req 6.3)
5. **Debounce**: a run of fewer than 3 qualifying frames never produces an event. (Req 6.5)
6. **Mapping**: for any input point, including outside `[0, 1]`, the mapped point is inside `[0, 1]²`, and the mapping is monotonic and mirrored on x. (Req 5.1, 5.5)
7. **Smoothing**: for a constant input, the One-Euro output converges to that input. (Req 5.2)
8. **Valid layout**: for any seed and any previous order, `scatterLayout` puts every piece in exactly one cell `0…8`, tilts lie in `[−8°, 8°]`, and jitters lie in `[−1, 1]`. (Req 9.1, 9.3)
9. **Never repeats**: for any seed, the new order differs from the given previous order. (Req 9.2)
10. **Uniform**: over 18,000 seeded shuffles, the cell each piece lands in passes a chi-square test against the uniform distribution (8 degrees of freedom, p > 0.001). The test fails on the old random-comparator shuffle. (Req 9.1)

`tools/check.mjs` runs these tests, so the existing `check-on-save` hook covers the new code.

## Testing strategy

- **Property tests**: above, run on every save by the hook.
- **Model smoke test** (Playwright, headless Chromium): load the vendored bundle, wasm, and model from the local server with the CPU delegate, run `detectForVideo` on a blank canvas, and assert it returns without error and makes no request to another host.
- **Gesture flow test** (Playwright): a camera cannot be faked with a real hand, so `level.js` exposes `window.__jinciBonus.feed(landmarks | null)` in the same way `__jinciPuzzle` is exposed. The test drives the tutorial and builds all 9 pieces with scripted landmark frames, and also checks: grab over empty space does nothing, an out-of-order drop is rejected, losing the hand for > 1 s returns the piece, and Escape stops the camera.
- **Scatter test** (Playwright): scatter twice in one page load and assert the two `order` arrays differ and every piece's bounding box lies inside its tray cell, in both landscape and portrait.
- **Unlock test** (Playwright): win under 2 minutes in a fresh context → reveal shown and title entrance after reload; win again in the same context with a slow time → still unlocked; fresh context with a slow first win, then a fast second win → stays locked.
- **Error screens**: deny camera permission in the Playwright context and check only "返回" is offered.
- **Manual check you need to do**: real webcam play on your laptop, since automated tests cannot wave a hand. Thresholds may need tuning after that.
