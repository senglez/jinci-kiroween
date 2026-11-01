# Third-party content

The code in this repository is licensed under the MIT License (see `LICENSE`).

Images in `assets/photos/` and `research/` are **not** covered by the MIT License. Each keeps its original licence:

- Photos from Wikimedia Commons under CC BY 2.0, CC BY 3.0, CC BY-SA 2.0, CC BY-SA 3.0, or CC BY-SA 4.0. Reuse requires attribution; adaptations of CC BY-SA images must be shared under the same licence.
- Scans of 《晋祠指南》 (1932) and 清·刘大鹏《晋祠志》 from the National Library of China via Wikimedia Commons, in the public domain.

Author, licence, and source link for every image used in the game are in `assets/photos/credits.json` and the in-game credits. The full research catalogue is in `research/IMAGES.md`.

The moon in the night sky (`assets/photos/moon.png`) is cropped and tinted from [FullMoon2010.jpg](https://commons.wikimedia.org/wiki/File:FullMoon2010.jpg) by Gregory H. Revera, CC BY-SA 3.0; the adapted file is shared under the same licence.

## Hand tracking (hidden level)

`vendor/mediapipe/` contains unmodified files from Google's MediaPipe, under the Apache License 2.0 (text in `vendor/mediapipe/LICENSE`):

- `@mediapipe/tasks-vision` 1.2.0: `vision_bundle.mjs` and `wasm/vision_wasm_internal.{js,wasm}`
- Hand Landmarker model `hand_landmarker.task` (float16 v1)

Versions, sources, and checksums are in `vendor/mediapipe/README.md`. Camera video is processed only in the browser and is never uploaded or stored.

## Sound

All sound is synthesized in the browser; no audio files are included.
