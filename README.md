# 夜穿千年 · 晋祠圣母殿 — A Night Across Ten Centuries

A Kiroween 2026 web game about the Hall of the Holy Mother (圣母殿) at Jinci, Taiyuan, Shanxi.
It is a Northern Song building, first raised in 1023–1032 and rebuilt in 1102.

## How it plays

1. **Title.** Click the lantern button. This also starts the synthesized sound.
2. **Time travel.** In first person you fly down a time tunnel from 2026 back to 1023. The year counter rolls back, and at each stop a card explains what happened then: the 1993–96 full dismantling and repair, the 1961 heritage listing, Liang Sicheng and Lin Huiyin's 1934 survey, the 1932 guidebook, the 1875 imperial plaque, the 1168 Offering Hall, the 1118 iron lions, the 1102 rebuild and the 1023 founding. Click a card to move on early, or press “Skip”. A timeline at the top lets you fly to any era, forwards or back, in about a second (or use ← / →); this pauses the journey until you press “继续 / Continue”. After the journey, the “时间线 / Timeline” button lets you revisit any era's card at any time.
3. **Arrival.** A photo of today's hall front fades in. Then night falls and a ghost wind blows the hall apart into nine timber parts.
4. **Puzzle.** Drag each part onto its glowing outline. The order follows how the building is actually built. A roof can't go up before the brackets that carry it, and the game tells you which supporting part is still missing. Every placed part shows a short fact card. The “Lantern hint” button points to a part that can go up now.
5. **Success.** The jack-o'-lanterns under the eaves light up, fireworks go off, and you see your time and number of attempts.

**晋祠美景 (Jinci in four seasons).** The button at top right opens a gallery of 24 photos of Jinci's halls and gardens, six per season, grouped by each photo's recorded shooting date. Page with ‹ › buttons, arrow keys, or a swipe; the season tabs jump straight to spring, summer, autumn, or winter. Every photo is CC-licensed and credited under it.

Every scatter is a fresh, uniformly random arrangement that never repeats the previous one, so replays can't be solved from memory.

### Hidden level: 鬼手营造 (Ghost-Hand Builder)

If the **first** time you finish in this browser takes under 2 minutes, a hidden level unlocks. Each browser gets one chance; the result is remembered in `localStorage`. Once unlocked, the entrance stays on the title screen.

In the hidden level you rebuild the hall again with your webcam and one hand: **pinch thumb and index finger to grab, open them to drop**. A ghost-hand cursor follows the point between your fingers; when the outline glows gold you are close enough, so open your fingers to drop. Add `?debug` to the URL to see live pinch values while tuning. The rules are the same as the main puzzle; mouse and touch are switched off.

<details><summary>Spoiler: a secret inside the hidden level</summary>

Press your palms together 🙏 in front of the camera and hold still. After a second a golden halo appears; after five seconds the hall builds itself (心诚则灵). Spec: `.kiro/specs/gesture-bonus-level/` Requirement 10.
</details>

Privacy: the camera starts only after you press "开启摄像头". Video is processed in the browser by Google's MediaPipe hand tracker, vendored in `vendor/mediapipe/` (about 22 MB, loaded only when you open the level). Nothing is recorded, stored, or uploaded. A live preview with a red badge is shown whenever the camera is on, and the camera turns off when you leave, win, or switch away from the page.

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

It verifies that every JS file parses, all text has Chinese and English, the milestone years run backwards, the puzzle build order has no cycles, every image shown in the game is credited, and the vendored hand-tracker files are present. It also runs the property-based tests in `tools/test.mjs` (also runnable on their own with `node tools/test.mjs`): the unlock rule, the pinch gesture state machine, cursor mapping and smoothing, and the random scatter (including a chi-square uniformity test).

End-to-end tests are in `tests/e2e/` (see its README); they run in Playwright and cover the scatter, unlock, gesture flow with scripted hand landmarks, camera errors, the gallery, and a smoke test of the vendored model.

## How Kiro is used

- **Spec**: `.kiro/specs/jinci-hall-game/` holds the requirements (EARS acceptance criteria), the design (architecture, support graph, correctness properties), and the task list.
- **Spec-driven feature**: `.kiro/specs/gesture-bonus-level/` was written before any code: requirements, a review round with four decisions (one chance per browser, pinch gesture, no mouse fallback, vendored library), a design, and then 37 tasks implemented in order. The design's correctness properties became the property tests, which were checked by injecting bugs and confirming each was caught.
- **Spec for a mid-stream request**: `.kiro/specs/jinci-gallery/` was written when the gallery was requested in the middle of the gesture-level work. Because the request was concrete, requirements, design, and tasks were written together and implemented directly, with review on the pull request.
- **Hook**: `.kiro/hooks/check-on-save.json` runs `node tools/check.mjs` (including the property tests) whenever a `js/*.js` file or `index.html` is saved.
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
js/scatter.js       random scatter layout (pure)
js/gallery.js       seasonal photo viewer; js/gallery-data.js lists the photos
assets/gallery/     24 seasonal photos (Wikimedia Commons, CC BY / CC BY-SA)
js/bonus/           hidden level: progress, gesture maths, tracker, input, level flow
vendor/mediapipe/   vendored hand tracker (Apache-2.0)
tests/e2e/          Playwright end-to-end tests
assets/photos/      images used in the game scenes
research/           sources, full image catalogue, download tools
tools/serve.mjs     local static server
tools/check.mjs     content and code checks (run by the Kiro hook)
tools/test.mjs      property-based tests, no dependencies
.kiro/              spec, hook, steering
```

## Sources and licences

- Code: MIT (see `LICENSE`).
- Photos keep their own licences (CC BY / CC BY-SA from Wikimedia Commons, or public domain); see `NOTICE.md`. The in-game credits list each one; `assets/photos/credits.json` holds the full data.
- History sources are listed in [research/SOURCES.md](research/SOURCES.md). The full catalogue of 79 Commons images is in [research/IMAGES.md](research/IMAGES.md).
