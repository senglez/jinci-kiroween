async (page) => {
  // Spec: jinci-gallery, task 3.2 — Requirements 1.2, 1.3, 1.5, 2.2, 2.3, 2.4, 2.6, 4.3, 4.4
  const ROOT = '/projects/sandbox/repo-jinci';
  const TYPES = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', jpg: 'image/jpeg', png: 'image/png', wasm: 'application/wasm', task: 'application/octet-stream' };
  const pg = await page.context().newPage();
  await pg.route('https://jinci.test/**', async (route) => {
    let p = route.request().url().replace('https://jinci.test', '').split('?')[0];
    if (p === '/') p = '/index.html';
    const ext = p.split('.').pop();
    try { await route.fulfill({ path: ROOT + decodeURIComponent(p), contentType: TYPES[ext] || 'application/octet-stream' }); } catch { await route.fulfill({ status: 404, body: 'nf' }); }
  });
  const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
  const galleryHits = [];
  pg.on('request', (r) => { if (r.url().includes('/assets/gallery/')) galleryHits.push(r.url()); });
  const view = () => pg.evaluate(() => ({
    open: !document.querySelector('#gallery').hidden,
    counter: document.querySelector('#gallery-counter').textContent,
    season: document.querySelector('#gallery-season').textContent,
    caption: document.querySelector('#gallery-caption').textContent,
    src: document.querySelector('#gallery-img').getAttribute('src'),
    active: document.querySelector('.gallery-tab.active')?.dataset.season,
    focus: document.activeElement?.id,
    credit: document.querySelector('#gallery-credit').textContent,
  }));
  const log = {};

  await pg.setViewportSize({ width: 1280, height: 800 });
  await pg.goto('https://jinci.test/index.html');
  await pg.waitForTimeout(800);
  assert(galleryHits.length === 0, 'no gallery image before opening (Req 4.4)');
  assert(await pg.isVisible('#btn-gallery'), 'gallery button visible on the title screen (Req 1.1)');

  // opens on the current season (device date: Nov 2026 → autumn)
  const month = await pg.evaluate(() => new Date().getMonth() + 1);
  const expected = month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter';
  await pg.click('#btn-gallery');
  await pg.waitForFunction(() => !document.querySelector('#gallery-frame').classList.contains('loading'), null, { timeout: 10000 });
  let v = await view();
  assert(v.open && v.active === expected, `opens on ${expected}, got ${v.active}`);
  assert(v.focus === 'btn-gallery-next', 'focus moves into the viewer (Req 1.2)');
  assert(v.credit.includes('CC'), 'credit line shows licence');
  log.opened = v;
  await pg.screenshot({ path: '/projects/sandbox/.kiro/artifacts/screenshots/50-gallery-open.jpg', type: 'jpeg' });

  // tabs: jump to spring = photo 1
  await pg.click('.gallery-tab[data-season=spring]');
  v = await view();
  assert(v.counter === '1 / 24' && v.active === 'spring', 'spring tab → 1 / 24');

  // prev from first wraps to last (Req 2.3)
  await pg.click('#btn-gallery-prev');
  v = await view();
  assert(v.counter === '24 / 24' && v.active === 'winter', 'prev from first → 24 / 24 winter');

  // next ×24 visits every photo once, in season order, and returns to the start
  const seen = [];
  const seasonsSeen = [];
  for (let i = 0; i < 24; i++) {
    await pg.click('#btn-gallery-next');
    v = await view();
    seen.push(v.src);
    seasonsSeen.push(v.active);
  }
  assert(new Set(seen).size === 24, 'all 24 photos shown');
  assert(v.counter === '24 / 24', 'back where we started after 24 steps');
  const order = ['spring', 'summer', 'autumn', 'winter'];
  const idx = seasonsSeen.map((s) => order.indexOf(s));
  assert(idx.slice(0, 23).every((x, i) => x <= idx[i + 1]), 'spring → winter order');
  log.perSeason = Object.fromEntries(order.map((s) => [s, seasonsSeen.filter((x) => x === s).length]));

  // keyboard ← → (Req 2.2)
  await pg.keyboard.press('ArrowRight');
  assert((await view()).counter === '1 / 24', 'ArrowRight');
  await pg.keyboard.press('ArrowLeft');
  assert((await view()).counter === '24 / 24', 'ArrowLeft');

  // swipe left = next (Req 2.2)
  const box = await pg.locator('#gallery-frame').boundingBox();
  await pg.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
  await pg.mouse.down();
  await pg.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 5 });
  await pg.mouse.up();
  assert((await view()).counter === '1 / 24', 'swipe left goes to next');

  // the game behind ignores keys; Escape closes and returns focus (Req 1.3, 1.4)
  await pg.keyboard.press('Escape');
  v = await view();
  assert(!v.open && v.focus === 'btn-gallery', 'Escape closes, focus back on the button');

  // clicking the backdrop closes too
  await pg.click('#btn-gallery');
  await pg.mouse.click(8, 790);
  assert(!(await view()).open, 'backdrop click closes');

  // portrait: whole photo visible, not cropped (Req 4.3)
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.click('#btn-gallery');
  await pg.waitForFunction(() => !document.querySelector('#gallery-frame').classList.contains('loading'), null, { timeout: 10000 });
  const fit = await pg.evaluate(() => {
    const i = document.querySelector('#gallery-img').getBoundingClientRect();
    const f = document.querySelector('#gallery-frame').getBoundingClientRect();
    return { inside: i.left >= f.left - 1 && i.right <= f.right + 1 && i.top >= f.top - 1 && i.bottom <= f.bottom + 1, img: [i.width, i.height].map(Math.round), frame: [f.width, f.height].map(Math.round) };
  });
  assert(fit.inside, 'photo fits inside the frame on portrait: ' + JSON.stringify(fit));
  await pg.screenshot({ path: '/projects/sandbox/.kiro/artifacts/screenshots/51-gallery-portrait.jpg', type: 'jpeg' });
  await pg.keyboard.press('Escape');
  await pg.setViewportSize({ width: 1280, height: 800 });

  // English
  await pg.click('#btn-lang');
  await pg.click('#btn-gallery');
  v = await view();
  assert(/[A-Za-z]/.test(v.caption) && /Spring|Summer|Autumn|Winter/.test(v.season), 'English captions after language switch');
  log.english = { season: v.season, caption: v.caption };
  await pg.keyboard.press('Escape');
  await pg.click('#btn-lang');

  // hidden in the bonus level (Req 1.5)
  await pg.evaluate(() => document.body.classList.add('bonus'));
  assert(!(await pg.isVisible('#btn-gallery')), 'gallery button hidden in bonus mode');
  await pg.evaluate(() => document.body.classList.remove('bonus'));

  log.imagesLoaded = new Set(galleryHits).size;
  await pg.close();
  return { ok: true, ...log };
}
