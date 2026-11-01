# 夜穿千年 · 晋祠圣母殿 — A Night Across Ten Centuries

A Kiroween 2026 web game about the Hall of the Holy Mother (圣母殿) at Jinci, Taiyuan, Shanxi.
It is a Northern Song building, first raised in 1023–1032 and rebuilt in 1102.

## How it plays

1. **Title.** Click the lantern button. This also starts the synthesized sound.
2. **Time travel.** In first person you fly down a time tunnel from 2026 back to 1023. The year counter rolls back, and at each stop a card explains what happened then: the 1993–96 full dismantling and repair, the 1961 heritage listing, Liang Sicheng and Lin Huiyin's 1934 survey, the 1932 guidebook, the 1875 imperial plaque, the 1168 Offering Hall, the 1118 iron lions, the 1102 rebuild and the 1023 founding. Click a card to move on early, or press “Skip”.
3. **Arrival.** A photo of today's hall front fades in. Then night falls and a ghost wind blows the hall apart into nine timber parts.
4. **Puzzle.** Drag each part onto its glowing outline. The order follows how the building is actually built. A roof can't go up before the brackets that carry it, and the game tells you which supporting part is still missing. Every placed part shows a short fact card. The “Lantern hint” button points to a part that can go up now.
5. **Success.** The jack-o'-lanterns under the eaves light up, fireworks go off, and you see your time and number of attempts.

The game is in Chinese and English (toggle at top right, or `?lang=en`). It works with mouse, touch, and keyboard (Tab to a part, Enter to place it), and respects `prefers-reduced-motion`.

## Run locally

No build step and no dependencies.

```bash
node tools/serve.mjs 8080   # then open http://localhost:8080
```

Any static host works (GitHub Pages, Netlify, S3, etc.).

Check content and code before committing:

```bash
node tools/check.mjs
```

It verifies that every JS file parses, all text has Chinese and English, the milestone years run backwards, the puzzle build order has no cycles, and every image shown in the game is credited.

## How Kiro is used

- **Spec**: `.kiro/specs/jinci-hall-game/` holds the requirements (EARS acceptance criteria), the design (architecture, support graph, correctness properties), and the task list.
- **Hook**: `.kiro/hooks/check-on-save.json` runs `node tools/check.mjs` whenever a `js/*.js` file or `index.html` is saved.
- **Steering**: `.kiro/steering/project.md` sets the content, licensing, and code rules.
- **Powers**: Playwright was used to play-test the full game headlessly on desktop and phone sizes.

## Project layout

```
index.html          scenes and modals
css/style.css       night / lantern theme
js/main.js          scene flow, i18n, HUD
js/data.js          timeline + puzzle facts (zh/en)
js/warp.js          canvas time tunnel
js/hall.js          procedural SVG drawing of the hall, split into 9 parts
js/puzzle.js        drag & drop, structural dependency rules
js/fx.js            ghost-fire wisps, bats, spark bursts
js/audio.js         Web Audio bells, wind, drone (no music files)
js/credits.js       image attribution shown in-game
assets/photos/      the 13 images used in the game
research/           sources, full image catalogue, download tools
tools/serve.mjs     local static server
tools/check.mjs     content and code checks (run by the Kiro hook)
.kiro/              spec, hook, steering
```

## Sources and licences

- Code: MIT (see `LICENSE`).
- Photos keep their own licences (CC BY / CC BY-SA from Wikimedia Commons, or public domain); see `NOTICE.md`. The in-game credits list each one; `assets/photos/credits.json` holds the full data.
- History sources are listed in [research/SOURCES.md](research/SOURCES.md). The full catalogue of 79 Commons images is in [research/IMAGES.md](research/IMAGES.md).
