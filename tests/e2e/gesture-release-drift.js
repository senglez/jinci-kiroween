async (page) => {
  // Spec: gesture-bonus-level, task 12.4 — Requirements 6.4, 6.4a, 6.4b.
  // Reproduces the real-webcam report "能拿起来，但是不能放入": when a real hand opens its
  // fingers, the index usually lifts more than the thumb drops, so the point between them
  // drifts while the release is still being confirmed. This test opens the fingers over
  // 6 frames while the pinch point drifts ~140 px in a random direction.
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
  const ORDER = ['platform', 'walls', 'columns', 'lowerBrackets', 'lowerRoof', 'upperBrackets', 'plaque', 'upperRoof', 'ridge'];

  await pg.setViewportSize({ width: 1280, height: 800 });
  await pg.goto('https://jinci.test/index.html');
  await pg.evaluate(() => localStorage.setItem('jinci-bonus-v1', JSON.stringify({ firstCompletionMs: 60000, unlocked: true })));
  await pg.reload();
  await pg.waitForTimeout(500);
  await pg.evaluate(() => {
    window.__jinciBonus.useFakeTracker();
    const B = window.__jinciBonus;
    let t = performance.now();
    let cur = { X: 640, Y: 400 };
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const toCam = (X, Y) => {
      const r = document.querySelector('#stage').getBoundingClientRect();
      return { x: 1 - (((X - r.left) / r.width) * 0.7 + 0.15), y: ((Y - r.top) / r.height) * 0.7 + 0.15 };
    };
    // Hand whose pinch point is at screen (X, Y) with thumb–index half-gap `half` (palm length 0.15).
    const hand = (X, Y, half) => {
      const { x, y } = toCam(X, Y);
      const lm = Array.from({ length: 21 }, () => ({ x, y: y + 0.1, z: 0 }));
      lm[0] = { x, y: y + 0.2, z: 0 };
      lm[9] = { x, y: y + 0.05, z: 0 };
      lm[4] = { x: x - half, y, z: 0 };
      lm[8] = { x: x + half, y, z: 0 };
      return lm;
    };
    const frame = async (lm) => { t += 33; B.feed(lm, t); await new Promise((r) => requestAnimationFrame(r)); };
    window.__d = {
      async at(X, Y, half, n) { cur = { X, Y }; for (let i = 0; i < n; i++) await frame(hand(X, Y, half)); },
      async moveTo(X, Y, half) {
        const s = { ...cur };
        for (let i = 1; i <= 20; i++) await frame(hand(s.X + (X - s.X) * i / 20, s.Y + (Y - s.Y) * i / 20, half));
        await this.at(X, Y, half, 10);
      },
      // realistic release: gap widens over 6 frames while the pinch point drifts ~140 px
      async openWithDrift() {
        const a = rnd() * Math.PI * 2;
        const dx = Math.cos(a) * 140;
        const dy = Math.sin(a) * 140;
        const s = { ...cur };
        const halves = [0.015, 0.025, 0.03, 0.04, 0.05, 0.07];
        for (let k = 1; k <= 6; k++) await frame(hand(s.X + dx * k / 6, s.Y + dy * k / 6, halves[k - 1]));
        await this.at(s.X + dx, s.Y + dy, 0.07, 6);
      },
      center(sel) { const r = document.querySelector(sel).getBoundingClientRect(); return { X: r.x + r.width / 2, Y: r.y + r.height / 2 }; },
      async build(id) {
        const a = this.center(`.loose .piece[data-id=${id}] > g`);
        await this.moveTo(a.X, a.Y, 0.07);
        await this.at(a.X, a.Y, 0.01, 5); // pinch
        const held = B.state().holding;
        const g = this.center(`.ghost[data-id=${id}]`);
        await this.moveTo(g.X, g.Y, 0.01);
        const ready = {
          cursor: document.querySelector('#ghost-hand').classList.contains('ready'),
          outline: document.querySelector(`.ghost[data-id=${id}]`).classList.contains('in-range'),
        };
        await this.openWithDrift();
        await new Promise((r) => setTimeout(r, 450));
        return { held, ready, placed: window.__jinciPuzzle.placed.has(id) };
      },
    };
  });

  await pg.click('#btn-bonus');
  await pg.click('#btn-camera-on');
  await pg.waitForFunction(() => !document.querySelector('#tutorial').hidden, null, { timeout: 10000 });
  await pg.click('#btn-tut-skip');
  await pg.waitForFunction(() => window.__jinciPuzzle?.enabled, null, { timeout: 15000 });

  const results = {};
  for (const id of ORDER) results[id] = await pg.evaluate((pid) => window.__d.build(pid), id);
  const failed = Object.entries(results).filter(([, r]) => !r.placed).map(([id]) => id);
  await pg.screenshot({ path: '/projects/sandbox/.kiro/artifacts/screenshots/61-drift-result.jpg', type: 'jpeg' });
  await pg.evaluate(() => localStorage.clear());
  await pg.close();
  assert(Object.values(results).every((r) => r.held), 'every piece should be picked up: ' + JSON.stringify(results));
  assert(failed.length === 0, `pieces not placed after a drifting release: ${failed.join(', ')}`);
  assert(Object.values(results).every((r) => r.ready.cursor && r.ready.outline), 'ready-to-drop highlight before release: ' + JSON.stringify(results));
  return { ok: true, placed: ORDER.length };
}
