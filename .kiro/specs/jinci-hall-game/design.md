# Design: 夜穿千年 · Jinci Hall of the Holy Mother

## Overview

A static web app: plain ES modules, no build step, no runtime dependencies. Four scenes run in sequence, driven by `js/main.js`:

```
title ──start──▶ travel ──▶ reveal ──▶ game ──9/9──▶ win dialog
                   ▲                                   │
                   └────────────── travel again ───────┘
```

Two full-screen canvases sit behind and in front of the scenes: `#warp` (the time tunnel) and `#embers` (ghost fire and sparks). The night sky (`#sky`) is CSS and is shared by every scene.

## Architecture

| Module | Responsibility |
|---|---|
| `js/main.js` | Scene flow, i18n, HUD, toasts, fact cards, credits dialog |
| `js/data.js` | `MILESTONES`, `PIECES`, `UI`: all bilingual content |
| `js/warp.js` | `Warp`: canvas tunnel with `speed`, `targetSpeed`, and `age` (0 = 2026, 1 = 1023) |
| `js/hall.js` | Procedural SVG elevation of the hall, one builder per piece, plus lanterns |
| `js/puzzle.js` | `Puzzle`: tray layout, scatter, drag, snap, support rules, hint, win |
| `js/fx.js` | `Embers` canvas (wisps, spark bursts, fireworks) and CSS bats |
| `js/audio.js` | `Sound`: Web Audio drone, bells, whoosh, wind, knock, buzz, fanfare |
| `js/credits.js` | `CREDITS`, generated from `assets/photos/credits.json` |

## Key decisions

### The hall is drawn, not cut from a photo
A photo cut into rectangles would teach nothing about structure. Drawing the hall in SVG lets each puzzle piece be a real building element, and the support rules can follow how the hall carries its load. Photos are still used where they work best: the arrival scene, the milestone cards, and the success gallery.

### Stage coordinates
The hall is drawn in a fixed 2000-unit-wide stage. Column centre lines come from seven bay widths `[140, 150, 160, 190, 160, 150, 140]` starting at x = 455, so the central bay is widest, as on the real façade. The SVG `viewBox` starts at y = 80 (above the chiwen tips) and extends down to cover the tray. All snapping distances are in stage units, so they scale with the screen.

### Paint order is separate from build order
Each piece has its own `<g class="slot-…">` layer created in `PAINT_ORDER` (walls behind the platform, plaque on top of the roofs). A placed piece is moved into its layer, so it always draws correctly whatever order the player built in. Loose and dragged pieces live in a top `loose` layer.

### Pointer handling
`pointerdown` is on the piece; `pointermove` and `pointerup` are attached to `window` for the length of the drag. Re-parenting the node to bring it to the front would otherwise lose pointer capture in Chromium (found in play-testing: drags after the first silently failed).

## Data model

```js
// js/data.js
Milestone = { year, era: {zh, en}, text: {zh, en}, photo?, photoCaption?: {zh, en} }
Piece     = { id, needs: [id], name: {zh, en}, fact: {zh, en} }
```

Piece state in `Puzzle.state` (per id): `cx, cy, w, h` (bounding box centre and size in stage units, measured once), `dx, dy, s, rot` (current transform), `traySlot`. A piece is drawn with
`translate(cx+dx, cy+dy) rotate(rot) scale(s) translate(-cx, -cy)`, so `dx = dy = 0, s = 1, rot = 0` is exactly its home position.

## Support graph

```
platform ─┬─▶ walls ───────────────┐
          └─▶ columns ─▶ lowerBrackets ─┴─▶ lowerRoof ─▶ upperBrackets ─┬─▶ upperRoof ─▶ ridge
                                                                      └─▶ plaque
```

`missingSupports(piece, placed)` returns the unmet `needs`. Lanterns appear once `lowerBrackets` is placed (they hang from the architrave) and light on the win.

## Placement logic

```
on drop(piece):
  if distance(home) < 90:
      missing = missingSupports(piece)
      attempts += 1
      if missing: shake, toast(missing names), return to tray
      else:      snap home, move to paint layer, sparks, bell, fact card
                 if all 9 placed: disable input, light lanterns, win
  elif near another unplaced piece's home:
      attempts += 1; toast("not here"); return to tray
  else:
      return to tray
```

## Tray layouts

| Layout | When | Grid | Cell height |
|---|---|---|---|
| landscape | otherwise | 3 × 3 | 160 |
| portrait | `innerHeight > 1.2 × innerWidth` | 2 × 5 | 300 |

Pieces are scaled to fit their cell (max 0.9). On resize the layout is re-picked; if it changes, loose pieces animate to their new cells.

## Error handling

- Missing Web Audio: `Sound` disables itself and the game runs silently.
- Fonts: Google Fonts with system Kai/Song fallbacks.
- Reduced motion: shorter waits in the travel and reveal, CSS animations cut to near zero.

## Correctness properties

These hold for any content edit and are enforced by `tools/check.mjs`:

1. **Bilingual completeness**: every `{zh, en}` value in `MILESTONES`, `PIECES`, and `UI` has non-empty text in both languages. (Req 6.3)
2. **Time runs backwards**: `MILESTONES[i].year < MILESTONES[i-1].year` for all i. (Req 2.2)
3. **Buildable**: every `needs` id exists, the graph has no cycle, and at least one piece needs nothing, so a full build order always exists. (Req 4.8)
4. **Credited images**: every image referenced by `index.html` or a milestone exists on disk and has a credit with author, licence, and source. (Req 8.3)

## Testing strategy

- **On save** (Kiro hook `check-on-save`): `node tools/check.mjs` after any `js/*.js` or `index.html` save.
- **Play-test** (Playwright, headless): start, skip travel, wait for `window.__jinciPuzzle.enabled`, drop the upper roof first (must be rejected and name the upper brackets), then build all 9 in support order and assert the win dialog shows. Run at 1280×800 and 390×844, and resize between them mid-game to check the tray relayout.
