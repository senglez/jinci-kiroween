# Vendored: MediaPipe Hand Landmarker

Used only by the hidden level (鬼手营造). Loaded on demand from this folder; the game makes no request to any other host.

| File | Source | Version | Licence | SHA-256 |
|---|---|---|---|---|
| `vision_bundle.mjs` | npm [`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision) | 1.2.0 | Apache-2.0 | `870da5cfc43bfcf2a8b0f14e8152dae8c7e701722e1191b0e592b94b81b4127a` |
| `wasm/vision_wasm_internal.js` | same package | 1.2.0 | Apache-2.0 | `85c1a342be70427987f900969a5f26e17557351111364e6585e97fb03e93e108` |
| `wasm/vision_wasm_internal.wasm` | same package | 1.2.0 | Apache-2.0 | `bcc13df22d3d69ec8cbe8e280989356d844ae00f4523eb82072d2484f44134dc` |
| `hand_landmarker.task` | `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task` | float16 v1 | Apache-2.0 ([model card](https://mediapipe.page.link/handmc): "Licensed under Apache License, Version 2.0") | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` |

`LICENSE` is the Apache License 2.0 text from the [MediaPipe repository](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE).

Files are unmodified. Not included:

- `vision_wasm_nosimd_internal.*` (12.9 MB): only needed by browsers without WebAssembly SIMD. Those browsers see a "not supported" message instead.
- `vision_wasm_module_internal.*`: the ES-module loader variant, which this game does not use.
- `*.map` source maps. `vision_bundle.mjs` still ends with a `sourceMappingURL` comment, so browser devtools may log a harmless "source map not found" warning.

To update, download a newer package (`npm pack @mediapipe/tasks-vision`), copy the same three files, update the table, and run `node tools/check.mjs`.
