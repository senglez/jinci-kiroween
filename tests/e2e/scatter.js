async (page) => {
  // Spec task 10.2 — Requirement 9.2, 9.3, 9.5
  const ROOT = '/projects/sandbox/repo-jinci';
  const TYPES = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', jpg: 'image/jpeg', png: 'image/png', wasm: 'application/wasm', task: 'application/octet-stream' };
  await page.unroute('**');
  await page.route('https://jinci.test/**', async (route) => {
    let p = route.request().url().replace('https://jinci.test', '').split('?')[0];
    if (p === '/') p = '/index.html';
    const ext = p.split('.').pop();
    try { await route.fulfill({ path: ROOT + decodeURIComponent(p), contentType: TYPES[ext] || 'application/octet-stream' }); } catch { await route.fulfill({ status: 404, body: 'nf' }); }
  });
  const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };

  const insideCells = () => page.evaluate(() => {
    const P = window.__jinciPuzzle;
    const cells = [...document.querySelectorAll('#stage .tray-cell')].map((c) => c.getBoundingClientRect());
    const bad = [];
    for (const [id, info] of Object.entries(P.lastLayout.pieces)) {
      if (P.placed.has(id)) continue;
      const b = document.querySelector(`.loose .piece[data-id=${id}] > g`).getBoundingClientRect();
      const c = cells[info.slot];
      const tol = 0.5;
      if (b.left < c.left - tol || b.right > c.right + tol || b.top < c.top - tol || b.bottom > c.bottom + tol) {
        bad.push({ id, slot: info.slot, piece: [b.left, b.top, b.right, b.bottom].map(Math.round), cell: [c.left, c.top, c.right, c.bottom].map(Math.round) });
      }
    }
    return bad;
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('https://jinci.test/index.html?lang=zh');
  await page.evaluate(() => localStorage.clear());
  await page.click('#btn-start');
  await page.waitForTimeout(800);
  await page.click('#btn-skip');
  await page.waitForFunction(() => window.__jinciPuzzle?.enabled, null, { timeout: 30000 });
  await page.waitForTimeout(300);

  const orders = [];
  const report = {};
  orders.push(await page.evaluate(() => window.__jinciPuzzle.lastLayout.order));
  report.landscape1 = await insideCells();
  assert(report.landscape1.length === 0, 'landscape scatter 1 outside cell: ' + JSON.stringify(report.landscape1));

  for (let i = 0; i < 4; i++) {
    await page.evaluate(async () => { const P = window.__jinciPuzzle; P.assemble(); await P.scatter(); });
    orders.push(await page.evaluate(() => window.__jinciPuzzle.lastLayout.order));
    const bad = await insideCells();
    assert(bad.length === 0, `landscape scatter ${i + 2} outside cell: ` + JSON.stringify(bad));
  }
  for (let i = 1; i < orders.length; i++) assert(orders[i].join() !== orders[i - 1].join(), `scatter ${i + 1} repeated scatter ${i}`);
  report.distinctOrders = new Set(orders.map((o) => o.join())).size;

  // portrait: same cell numbers, still inside (Req 9.5)
  const before = await page.evaluate(() => Object.fromEntries(Object.entries(window.__jinciPuzzle.lastLayout.pieces).map(([k, v]) => [k, v.slot])));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  const layoutName = await page.evaluate(() => window.__jinciPuzzle.layoutName);
  assert(layoutName === 'portrait', 'expected portrait tray, got ' + layoutName);
  const after = await page.evaluate(() => Object.fromEntries([...window.__jinciPuzzle.state].map(([k, v]) => [k, v.traySlot])));
  const moved = Object.keys(before).filter((id) => before[id] !== after[id]);
  assert(moved.length === 0, 'slots changed on relayout: ' + moved.join(', '));
  report.portrait = await insideCells();
  assert(report.portrait.length === 0, 'portrait outside cell: ' + JSON.stringify(report.portrait));

  await page.evaluate(async () => { const P = window.__jinciPuzzle; P.assemble(); await P.scatter(); });
  const bad = await insideCells();
  assert(bad.length === 0, 'portrait rescatter outside cell: ' + JSON.stringify(bad));
  await page.screenshot({ path: '/projects/sandbox/.kiro/artifacts/screenshots/30-scatter-portrait.jpg', type: 'jpeg' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/projects/sandbox/.kiro/artifacts/screenshots/31-scatter-landscape.jpg', type: 'jpeg' });
  return { ok: true, scatters: orders.length + 1, ...report };
}
