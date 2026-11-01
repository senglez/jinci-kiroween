# Design: 晋祠美景 Seasonal Photo Gallery

## Photo selection

Source: every image in Wikimedia Commons `Category:Jin Temple` and its sub-categories two levels deep (428 files, metadata in `research/jinci_all.json`, fetched with `research/tools/commons_meta.py`). Images were grouped by the month of `DateTimeOriginal`, reviewed on contact sheets, and 6 per season were picked for variety (halls, bridge, archway, stage, pagoda, gardens, trees). Inscription close-ups, statues, and duplicates were left out. Winter and autumn have the most material (December 2013/2019, October 2008); summer has the least, so it uses the June 2025 and July 2011/2016 sets.

Files are resized to at most 1280 px on the long side (JPEG quality 80) and stored in `assets/gallery/`, named `<season>-<n>.jpg`.

## Data

`js/gallery-data.js` (generated, like `js/credits.js`):

```js
export const SEASONS = [{ id: 'spring', name: { zh: '春', en: 'Spring' } }, …];
export const GALLERY = [
  { file: 'assets/gallery/spring-1.jpg', season: 'spring', date: '2024-05-22',
    caption: { zh: '…', en: '…' }, author: '…', license: 'CC BY-SA 4.0', source: 'https://commons…' },
  …
];
```

`GALLERY` is already in season order. Each entry is also added to `assets/photos/credits.json` so the credits dialog lists it.

## Paging logic (`js/gallery.js`)

Pure helpers, testable in Node:

```js
export const wrap = (i, n) => ((i % n) + n) % n;                     // Req 2.3
export const firstOfSeason = (items, season) => items.findIndex((p) => p.season === season);
export function seasonForMonth(month) { … }                           // 1–12 → id, Req 1.2
```

`GalleryViewer` (DOM):

- `open()` → index = first photo of `seasonForMonth(new Date().getMonth() + 1)`; show dialog; remember the opener; focus the next button.
- `show(i)` → set `<img>` src, caption, season label, counter, credit link; mark the active tab; preload `wrap(i−1)` and `wrap(i+1)` with `new Image()`; add `.loading` until the image's `load` event fires.
- Controls: prev/next buttons, ←/→ keys, horizontal swipe ≥ 40 px (pointer events), tabs, close button, Escape, click on the backdrop.
- `close()` → hide; return focus to the opener.
- Images are only assigned a `src` when shown or preloaded, so nothing downloads before the viewer opens (Req 4.4).

## UI

- `#btn-gallery` in `.controls`, a text button "晋祠美景" like the other controls.
- `#gallery` modal, wide box: tabs row, photo area (`object-fit: contain`, max height 70 vh), caption, credit line, counter, prev/next buttons styled like the lantern buttons.
- While `body.bonus` is set, `#btn-gallery` is hidden (Req 1.5).

## Testing

- `tools/test.mjs`: properties for `wrap` (always in range, next-then-prev returns to start) and `seasonForMonth` (every month maps to the season defined in the glossary).
- `tools/check.mjs`: every gallery file exists, is credited, has a bilingual caption, and each season has ≥ 5 photos.
- `tests/e2e/gallery.js` (Playwright): no gallery request before opening; open → opens on the current season; next ×24 wraps to the start; prev from the first goes to the last; arrow keys; tab jump; swipe; Escape closes and returns focus; button hidden in bonus mode; portrait screenshot shows the whole photo.
