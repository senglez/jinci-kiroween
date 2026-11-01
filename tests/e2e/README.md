# End-to-end tests

Each file is a single `async (page) => { … }` function, the format accepted by the Playwright MCP tool `browser_run_code` (pass the file path as `filename`). Each test serves the repository at `https://jinci.test/` by routing requests to the local files. HTTPS makes the page a secure context, so the camera API is present. It returns a result object and throws on the first failed assertion.

| File | Spec task | What it checks |
|---|---|---|
| `model-smoke.js` | 10.1 | Vendored MediaPipe files load and run a detection; no request goes to another host |
| `scatter.js` | 10.2 | Two scatters differ; every piece lies inside its tray cell, landscape and portrait |
| `unlock.js` | 10.3 | Fast first win unlocks and survives reload; slow first win keeps it locked forever |
| `gesture-flow.js` | 10.4 | Tutorial, empty grab, rejected drop, hand lost, full build, bonus win, Escape, mouse disabled |
| `gallery.js` | gallery 3.2 | No download before opening; opens on the current season; paging wraps; keys, swipe, tabs; Escape and focus; portrait fit; English; hidden in bonus mode |
| `gesture-release-drift.js` | 12.4 | Realistic release: the pinch point drifts ~140 px while the fingers open; every piece must still go in, with the ready highlight shown first. Fails on the code before the fix (0 of 9 placed) |
| `prayer-egg.js` | 14.4 | 合十 easter egg: no effect in the tutorial or with hands apart; halo only after 1 s; a 0.6 s break restarts the count, 0.3 s dropouts don't; 5 s builds all 9 pieces with the special title; a second hand can't steal the pinch; the pose cancels a held piece |
| `camera-denied.js` | 10.5 | Without a usable camera only "返回" is offered and the camera stays off |

Run the files **one at a time**. They share the browser's `localStorage`, and `unlock.js` installs a fake clock, so running them in parallel makes them interfere with each other.

Set `ROOT` at the top of each file to your checkout path if it is not `/projects/sandbox/repo-jinci`.

The gesture test cannot use a real hand. It calls `window.__jinciBonus.useFakeTracker()` and feeds scripted MediaPipe-style landmarks through the same `GestureInput` code the camera uses. Real webcam play still needs a manual check.
