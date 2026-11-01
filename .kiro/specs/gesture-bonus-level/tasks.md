# Implementation Plan

- [x] 1. Random scatter
  - [x] 1.1 Create `js/scatter.js` with `shuffle` (Fisher–Yates), `sameOrder`, and `scatterLayout(ids, previousOrder, rng)`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_
  - [x] 1.2 Use `scatterLayout` in `Puzzle.scatter()`; keep the last order; fit each tilted piece inside its cell and apply the in-cell offset in `trayTarget()`
    - _Requirements: 9.2, 9.3, 9.5_

- [x] 2. Property-test harness
  - [x] 2.1 Create `tools/test.mjs`: seeded generator, `property(name, runs, fn)` runner, readable failure output with the seed
    - _Requirements: 1.7, 9.6_
  - [x] 2.2 Properties 8–10 for the scatter layout (valid layout, never repeats, uniform)
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 2.3 Run `tools/test.mjs` from `tools/check.mjs` so the `check-on-save` hook covers it
    - _Requirements: 8.1_

- [x] 3. Unlock progress
  - [x] 3.1 Create `js/bonus/progress.js`: `afterCompletion`, `parseProgress`, `createProgressStore(storage)` with in-memory fallback
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_
  - [x] 3.2 Properties 1–2 (unlock rule, one chance) plus fallback and corrupt-value cases
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

- [x] 4. Gesture maths
  - [x] 4.1 Create `js/bonus/gesture.js`: `pinchRatio`, `pinchPoint`, `PinchMachine`, `OneEuro`, `mapToUnit`
    - _Requirements: 5.1, 5.2, 5.5, 6.3, 6.3a, 6.5_
  - [x] 4.2 Properties 3–7 (alternation, hysteresis, debounce, mapping, smoothing)
    - _Requirements: 5.1, 5.2, 5.5, 6.3, 6.5_

- [x] 5. Vendor the hand tracker
  - [x] 5.1 Add `vendor/mediapipe/` (bundle, SIMD wasm, hand model, Apache-2.0 `LICENSE`, `README.md` with versions and sources)
    - _Requirements: 8.2, 8.4_
  - [x] 5.2 MIME types for `.mjs`, `.wasm`, `.task` in `tools/serve.mjs`; vendored-file check in `tools/check.mjs`
    - _Requirements: 8.2_
  - [x] 5.3 Credit MediaPipe in `NOTICE.md` and the in-game credits; allow `vendor/` in the steering file
    - _Requirements: 8.4_

- [x] 6. Puzzle input API
  - [x] 6.1 Split drag handling into `pieceAt`, `beginDrag`, `dragTo`, `endDrag`, `cancelDrag`; pointer events call them
    - _Requirements: 6.1, 6.4, 6.6, 8.5_
  - [x] 6.2 `setInputMode('pointer' | 'gesture')`; pointer and keyboard ignored in gesture mode
    - _Requirements: 3.4, 8.5_

- [x] 7. Camera and tracker
  - [x] 7.1 Create `js/bonus/tracker.js`: camera start with error codes, lazy MediaPipe load (GPU then CPU), frame loop, idempotent `stop()`
    - _Requirements: 2.2, 2.3, 2.5, 3.1, 3.2, 3.3, 8.2, 8.3_

- [x] 8. Gesture input
  - [x] 8.1 Create `js/bonus/input.js`: ghost cursor with open / hover / pinched states, hover hit-testing, grab and release, 1-second hand-lost cancel
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.4, 6.6_

- [x] 9. Bonus level
  - [x] 9.1 Bilingual strings for every new text in `js/data.js`
    - _Requirements: 8.1_
  - [x] 9.2 Markup and styles: title entrance, unlock reveal, privacy / loading / error / tutorial panel, camera preview with badge, ghost cursor, ghost-green theme, bonus success dialog
    - _Requirements: 1.1, 1.4, 2.1, 2.4, 4.1, 5.3, 7.2, 7.3, 7.4, 7.5_
  - [x] 9.3 Create `js/bonus/level.js`: screen flow, tutorial steps, play, win, exit button and Escape, stop camera on hide and ask again on return; test seam `window.__jinciBonus`
    - _Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 7.1, 7.3, 7.4, 7.5_
  - [x] 9.4 Wire into `js/main.js`: record progress when the 9th piece is placed, unlock reveal, title entrance, shared round start, completion time taken at the 9th placement
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 6.7, 7.1_

- [x] 10. End-to-end checks (Playwright)
  - [x] 10.1 Model smoke test: vendored files load with the CPU delegate and no request goes to another host
    - _Requirements: 8.2, 8.4_
  - [x] 10.2 Scatter test: two scatters differ; every piece inside its cell, landscape and portrait
    - _Requirements: 9.2, 9.3, 9.5_
  - [x] 10.3 Unlock test: fast first win unlocks and survives reload; slow first win then fast win stays locked
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 10.4 Gesture flow test with scripted landmarks: tutorial, empty grab, rejected drop, hand lost, full build, bonus win, Escape stops camera
    - _Requirements: 4.2, 5.4, 6.1, 6.2, 6.4, 6.6, 7.3, 7.5_
  - [x] 10.5 Camera denied: only "返回" is offered
    - _Requirements: 3.2_

- [x] 11. Docs
  - [x] 11.1 README: hidden level, privacy, vendored files, how to run the tests
    - _Requirements: 2.3, 8.4_
