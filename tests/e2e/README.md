# End-to-end tests

Each file is a single `async (page) => { … }` function, the format accepted by the Playwright MCP tool `browser_run_code` (pass the file path as `filename`). Each test serves the repository at `https://jinci.test/` by routing requests to the local files. HTTPS makes the page a secure context, so the camera API is present. It returns a result object and throws on the first failed assertion.

| File | Spec task | What it checks |
|---|---|---|
| `model-smoke.js` | 10.1 | Vendored MediaPipe files load and run a detection; no request goes to another host |
| `scatter.js` | 10.2 | Two scatters differ; every piece lies inside its tray cell, landscape and portrait |
| `unlock.js` | 10.3 | Fast first win unlocks and survives reload; slow first win keeps it locked forever |
| `gesture-flow.js` | 10.4 | Tutorial, empty grab, rejected drop, hand lost, full build, bonus win, Escape, mouse disabled |
| `camera-denied.js` | 10.5 | Without a usable camera only "返回" is offered and the camera stays off |

Set `ROOT` at the top of each file to your checkout path if it is not `/projects/sandbox/repo-jinci`.

The gesture test cannot use a real hand. It calls `window.__jinciBonus.useFakeTracker()` and feeds scripted MediaPipe-style landmarks through the same `GestureInput` code the camera uses. Real webcam play still needs a manual check.
