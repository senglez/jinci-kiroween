---
inclusion: always
---

# Jinci Hall of the Holy Mother — Kiroween 2026 game

## Product
- Web history game. Flow: title → first-person time tunnel (2026 → 1023) → photo of today's hall → 9-part structural puzzle → success.
- Halloween mood (night, moon, bats, ghost fire, jack-o'-lanterns) must stay respectful of a living heritage site. Never mock the Holy Mother (邑姜), the statues, or the worship context. The spooky part is the night and the "ghost wind", not the deity.

## Content rules
- Every historical claim in `js/data.js` must have a source in `research/SOURCES.md`. Where sources disagree, use the mainstream date and note the alternative in SOURCES.md.
- All text is bilingual: every entry has both `zh` and `en`. Chinese is the default language.
- Only use images that are public domain or CC-licensed. Add each new image to `assets/photos/credits.json` and regenerate `js/credits.js`.

## Code rules
- Plain ES modules, no build step, no runtime dependencies. Must run from any static host.
- The hall is drawn procedurally in SVG (`js/hall.js`, stage 2000×1150). Puzzle pieces are hall parts; `needs` in `PIECES` encodes structural support order.
- Sound is synthesized with Web Audio. Do not add music files.
- Keep pointer, touch, and keyboard input working, and honour `prefers-reduced-motion`.
- Play-test with Playwright: `window.__jinciPuzzle` exposes the puzzle for automated runs.
- `node tools/check.mjs` must pass before committing. The `check-on-save` hook runs it automatically.
- The feature spec lives in `.kiro/specs/jinci-hall-game/`. Update its requirements and tasks when behaviour changes.
