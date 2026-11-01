# Implementation Plan

- [x] 1. Photos
  - [x] 1.1 Pick 6 photos per season from `research/jinci_all.json`, resize to `assets/gallery/`, generate `js/gallery-data.js`, add credits
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
- [x] 2. Viewer
  - [x] 2.1 Pure helpers `wrap`, `firstOfSeason`, `seasonForMonth` in `js/gallery.js`, with property tests in `tools/test.mjs`
    - _Requirements: 1.2, 2.3_
  - [x] 2.2 `GalleryViewer`: open/close, focus, paging, keys, swipe, tabs, preload, loading state
    - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 2.4, 2.5, 2.6, 4.4_
  - [x] 2.3 Markup, styles, bilingual UI strings; button hidden in bonus mode
    - _Requirements: 1.1, 1.5, 4.1, 4.2, 4.3_
- [x] 3. Checks
  - [x] 3.1 Gallery checks in `tools/check.mjs`
    - _Requirements: 3.1, 3.4, 3.5_
  - [x] 3.2 Playwright test `tests/e2e/gallery.js`
    - _Requirements: 1.2, 1.3, 1.5, 2.2, 2.3, 2.4, 4.3, 4.4_
