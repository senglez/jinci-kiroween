# Implementation Plan

- [x] 1. Research and content
  - [x] 1.1 Compile the hall's timeline with sources, recording conflicting dates (984 / 1023 / 1087) in `research/SOURCES.md`
    - _Requirements: 8.1_
  - [x] 1.2 Collect Wikimedia Commons images with author and licence metadata (`research/tools/commons_meta.py`) and public-domain scans of the 1932 《晋祠指南》 and 清《晋祠志》
    - _Requirements: 8.2, 8.3_
  - [x] 1.3 Write `MILESTONES`, `PIECES`, and `UI` in `js/data.js` in Chinese and English
    - _Requirements: 2.2, 2.4, 6.3_

- [x] 2. Scene shell
  - [x] 2.1 `index.html` with title, travel, reveal, and game scenes plus win and credits dialogs
    - _Requirements: 1.1, 5.2_
  - [x] 2.2 Night theme in `css/style.css`: moon, stars, fog, bats, lantern buttons
    - _Requirements: 1.1_
  - [x] 2.3 Scene fade transitions and i18n rendering in `js/main.js`, Chinese by default, `?lang=en` and toggle
    - _Requirements: 6.1, 6.2_

- [x] 3. Time travel
  - [x] 3.1 `Warp` canvas tunnel with eased speed and violet-to-amber ageing
    - _Requirements: 2.1, 2.3_
  - [x] 3.2 Milestone loop: rolling year counter, cards with photos, click to advance, Skip, final flash
    - _Requirements: 2.2, 2.4, 2.5, 2.6, 2.7_

- [x] 4. Arrival
  - [x] 4.1 Zooming hall photo with credit, then darken to night with wind
    - _Requirements: 3.1, 3.2_

- [x] 5. Hall drawing
  - [x] 5.1 Procedural SVG builders for the 9 pieces in `js/hall.js` on a 2000-unit stage, seven bays with the widest in the centre
    - _Requirements: 4.1_
  - [x] 5.2 Jack-o'-lanterns hung from the lower architrave
    - _Requirements: 5.1_

- [x] 6. Puzzle
  - [x] 6.1 Ghost outlines, paint-order layers, tray, and lift-then-fly scatter; input locked until scatter ends
    - _Requirements: 3.3, 3.4_
  - [x] 6.2 Drag with window-level pointer tracking and snap within 90 units
    - _Requirements: 4.1, 4.2, 7.1_
  - [x] 6.3 Support rules: reject with every missing support named; separate "not here" message; no attempt counted for drops in empty space
    - _Requirements: 4.3, 4.4, 4.5_
  - [x] 6.4 Fact cards, HUD progress and timer, hint button
    - _Requirements: 4.2, 4.6, 4.7_
  - [x] 6.5 Keyboard placement with Enter / Space
    - _Requirements: 7.2_
  - [x] 6.6 Portrait 2 × 5 tray and relayout on orientation change
    - _Requirements: 7.3_

- [x] 7. Success
  - [x] 7.1 Light lanterns, fanfare, fireworks, success dialog with time, attempts, and photo gallery; travel-again restart
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Sound, motion, and credits
  - [x] 8.1 Web Audio drone, bells, whoosh, wind, knock, buzz, fanfare; mute button
    - _Requirements: 1.2, 1.3, 7.5, 8.4_
  - [x] 8.2 `prefers-reduced-motion` handling
    - _Requirements: 7.4_
  - [x] 8.3 Generate `js/credits.js` from `assets/photos/credits.json` and render the credits dialog
    - _Requirements: 8.3_

- [x] 9. Verification
  - [x] 9.1 `tools/check.mjs` enforcing the four correctness properties in `design.md`
    - _Requirements: 2.2, 4.8, 6.3, 8.3_
  - [x] 9.2 Kiro hook `.kiro/hooks/check-on-save.json` running the checks on save
    - _Requirements: 2.2, 4.8, 6.3, 8.3_
  - [x] 9.3 Playwright play-test at 1280×800 and 390×844, including an out-of-order drop and a mid-game resize
    - _Requirements: 4.2, 4.3, 5.2, 7.3_
