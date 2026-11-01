async (page) => {
  // Spec: gesture-bonus-level, task 14.4 — Requirements 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9.
  // Scripted two-hand frames are fed through window.__jinciBonus.feedHands(), the same path as the camera.
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
  const state = () => pg.evaluate(() => ({ ...window.__jinciBonus.state(), placed: window.__jinciPuzzle?.placed.size ?? 0, halo: !document.querySelector('#prayer-halo').hidden, win: !document.querySelector('#bonus-win').hidden }));
  const log = {};

  await pg.setViewportSize({ width: 1280, height: 800 });
  await pg.goto('https://jinci.test/index.html');
  await pg.evaluate(() => localStorage.setItem('jinci-bonus-v1', JSON.stringify({ firstCompletionMs: 60000, unlocked: true })));
  await pg.reload();
  await pg.waitForTimeout(500);
  await pg.evaluate(() => {
    window.__jinciBonus.useFakeTracker();
    const B = window.__jinciBonus;
    let t = performance.now();
    const S = 0.15; // palm length
    // One upright hand; side = -1 left, +1 right; `gap` pushes the hands apart (in palm lengths)
    const hand = (cx, cy, side, gap = 0) => {
      const dx = side * gap * S / 2;
      const h = Array.from({ length: 21 }, () => ({ x: cx + dx, y: cy, z: 0 }));
      h[0] = { x: cx + dx + side * 0.15 * S, y: cy + S, z: 0 };
      h[9] = { x: cx + dx + side * 0.1 * S, y: cy, z: 0 };
      h[12] = { x: cx + dx + side * 0.05 * S, y: cy - 0.8 * S, z: 0 };
      h[8] = { x: cx + dx + side * 0.07 * S, y: cy - 0.7 * S, z: 0 };
      h[4] = { x: cx + dx + side * 0.2 * S, y: cy + 0.1 * S, z: 0 };
      return h;
    };
    const pinchHand = (cx, cy, pinched) => {
      const h = Array.from({ length: 21 }, () => ({ x: cx, y: cy + 0.1, z: 0 }));
      const half = pinched ? 0.01 : 0.07;
      h[0] = { x: cx, y: cy + 0.2, z: 0 }; h[9] = { x: cx, y: cy + 0.05, z: 0 };
      h[4] = { x: cx - half, y: cy, z: 0 }; h[8] = { x: cx + half, y: cy, z: 0 };
      return h;
    };
    const step = async (hands, dt = 33) => { t += dt; B.feedHands(hands, t); await new Promise((r) => requestAnimationFrame(r)); };
    window.__p = {
      async pray(ms, gap = 0) { for (let e = 0; e < ms; e += 33) await step([hand(0.5, 0.45, -1, gap), hand(0.5, 0.45, 1, gap)]); },
      async dropout(ms) { await step([], ms); }, // one frame after a gap of `ms`
      async none(ms) { for (let e = 0; e < ms; e += 33) await step([]); },
      async pinchAt(cx, cy, pinched, n = 8, extra = null) { for (let i = 0; i < n; i++) await step(extra ? [pinchHand(cx, cy, pinched), extra] : [pinchHand(cx, cy, pinched)]); },
      hand,
    };
  });

  await pg.click('#btn-bonus');
  await pg.click('#btn-camera-on');
  await pg.waitForFunction(() => !document.querySelector('#tutorial').hidden, null, { timeout: 10000 });

  // A. no effect during the tutorial (Req 10.8)
  await pg.evaluate(() => window.__p.pray(5600));
  let s = await state();
  assert(s.tutorialStep >= 0 && !s.halo && s.placed === 0 && !s.win, 'tutorial: palms together must do nothing ' + JSON.stringify(s));
  await pg.evaluate(() => window.__p.none(600));
  await pg.click('#btn-tut-skip');
  await pg.waitForFunction(() => window.__jinciPuzzle?.enabled, null, { timeout: 15000 });

  // B. hands near but apart: never counts
  await pg.evaluate(() => window.__p.pray(6000, 2.5));
  s = await state();
  assert(!s.halo && s.placed === 0, 'hands 2.5 palms apart must not count');

  // C. halo appears only after 1 s; 4 s then a 0.6 s break resets the count (Req 10.4, 10.5)
  await pg.evaluate(() => window.__p.pray(800));
  assert(!(await state()).halo, 'halo hidden before 1 s');
  await pg.evaluate(() => window.__p.pray(400));
  s = await state();
  assert(s.halo, 'halo shown after 1.2 s');
  await pg.screenshot({ path: '/projects/sandbox/.kiro/artifacts/screenshots/64-prayer-halo.jpg', type: 'jpeg' });
  await pg.evaluate(() => window.__p.pray(2800)); // 4.0 s total
  await pg.evaluate(() => window.__p.dropout(600));
  await pg.evaluate(() => window.__p.pray(2000));
  s = await state();
  assert(s.placed === 0 && !s.win, 'a 0.6 s break must restart the 5 s count');

  // D. short dropouts (0.3 s) do not break the hold (Req 10.4)
  await pg.evaluate(() => window.__p.none(700));
  await pg.evaluate(async () => {
    await window.__p.pray(2000);
    await window.__p.dropout(300);
    await window.__p.pray(1500);
    await window.__p.dropout(300);
    await window.__p.pray(1800);
  });
  await pg.waitForFunction(() => window.__jinciPuzzle.placed.size === 9, null, { timeout: 10000 });
  await pg.waitForFunction(() => !document.querySelector('#bonus-win').hidden, null, { timeout: 10000 });
  await pg.waitForTimeout(800);
  s = await state();
  log.win = await pg.evaluate(() => ({ title: document.querySelector('#bonus-win-title').textContent, text: document.querySelector('#bonus-win-text').textContent }));
  assert(log.win.title.includes('心诚则灵'), '合十 win title: ' + log.win.title);
  assert(!s.cameraOn, 'camera off after the egg (Req 10.7)');
  await pg.screenshot({ path: '/projects/sandbox/.kiro/artifacts/screenshots/65-prayer-win.jpg', type: 'jpeg' });

  // E. normal title comes back on a normal replay; a second hand does not steal the pinch (Req 10.9)
  await pg.click('#btn-bonus-again');
  await pg.click('#btn-camera-on');
  await pg.waitForFunction(() => !document.querySelector('#tutorial').hidden, null, { timeout: 10000 });
  await pg.click('#btn-tut-skip');
  await pg.waitForFunction(() => window.__jinciPuzzle?.enabled, null, { timeout: 15000 });
  const target = await pg.evaluate(() => {
    const r = document.querySelector('#stage').getBoundingClientRect();
    const b = document.querySelector('.loose .piece[data-id=platform] > g').getBoundingClientRect();
    const X = b.x + b.width / 2;
    const Y = b.y + b.height / 2;
    return { cx: 1 - (((X - r.left) / r.width) * 0.7 + 0.15), cy: ((Y - r.top) / r.height) * 0.7 + 0.15 };
  });
  const intruder = await pg.evaluate(() => window.__p.hand(0.2, 0.2, 1)); // a second hand far from the cursor
  await pg.evaluate(({ cx, cy }) => window.__p.pinchAt(cx, cy, false, 14), target);
  await pg.evaluate(({ cx, cy, intruder }) => window.__p.pinchAt(cx, cy, true, 6, intruder), { ...target, intruder });
  s = await state();
  assert(s.holding === 'platform', 'still grabbed the piece under the cursor with a second hand in view: ' + JSON.stringify(s));

  // F. pose while holding: the piece goes back, nothing is moved (Req 10.6)
  await pg.evaluate(() => window.__p.pray(300));
  s = await state();
  assert(s.holding === null && s.placed === 0, 'starting the pose cancels the held piece');

  await pg.keyboard.press('Escape');
  await pg.evaluate(() => localStorage.clear());
  await pg.close();
  return { ok: true, ...log };
}
