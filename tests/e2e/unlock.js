async (page) => {
  // Spec task 10.3 — Requirement 1.1–1.4: one chance per browser, remembered across reloads.
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
  const ORDER = ['platform', 'walls', 'columns', 'lowerBrackets', 'lowerRoof', 'upperBrackets', 'plaque', 'upperRoof', 'ridge'];
  const center = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
  const drag = async (id) => {
    const a = await center(`.loose .piece[data-id=${id}] > g`);
    const b = await center(`.ghost[data-id=${id}]`);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    for (let i = 1; i <= 15; i++) await page.mouse.move(a.x + (b.x - a.x) * i / 15, a.y + (b.y - a.y) * i / 15);
    await page.mouse.up(); await page.waitForTimeout(450);
  };
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('jinci-bonus-v1') || 'null'));
  const ui = () => page.evaluate(() => ({
    reveal: !document.querySelector('#unlock-reveal').hidden,
    revealJust: document.querySelector('#unlock-reveal').classList.contains('just'),
    titleEntrance: !document.querySelector('#btn-bonus').hidden,
    winTime: document.querySelector('#win-time').textContent,
  }));
  // Play one main round. slowMs > 0 jumps the clock forward before the last piece.
  const playRound = async (slowMs = 0) => {
    await page.click('#btn-start');
    await page.waitForTimeout(600);
    await page.click('#btn-skip');
    await page.waitForFunction(() => window.__jinciPuzzle?.enabled, null, { timeout: 30000 });
    for (const id of ORDER.slice(0, -1)) await drag(id);
    if (slowMs) await page.clock.fastForward(slowMs);
    await drag(ORDER[ORDER.length - 1]);
    await page.waitForFunction(() => !document.querySelector('#win').hidden, null, { timeout: 15000 });
    return ui();
  };
  const freshBrowser = async () => {
    await page.goto('https://jinci.test/index.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
  };

  await page.clock.install();
  await page.setViewportSize({ width: 1280, height: 800 });
  const log = {};

  // A. fast first win → unlock, and it survives a reload and a later slow run
  await freshBrowser();
  assert(!(await ui()).titleEntrance, 'A: entrance must be hidden before unlocking');
  log.aFast = await playRound();
  assert(log.aFast.reveal && log.aFast.revealJust, 'A: fast first win must reveal the unlock');
  assert(log.aFast.titleEntrance, 'A: title entrance should be enabled');
  log.aStored = await stored();
  assert(log.aStored?.unlocked === true && log.aStored.firstCompletionMs < 120000, 'A: stored unlock');
  await page.screenshot({ path: '/projects/sandbox/.kiro/artifacts/screenshots/32-unlock-reveal.jpg', type: 'jpeg' });
  await page.reload();
  await page.waitForTimeout(500);
  assert((await ui()).titleEntrance, 'A: entrance must survive a reload');
  await page.screenshot({ path: '/projects/sandbox/.kiro/artifacts/screenshots/33-title-entrance.jpg', type: 'jpeg' });
  log.aSlowLater = await playRound(130_000);
  assert(log.aSlowLater.reveal && !log.aSlowLater.revealJust, 'A: still unlocked after a slow later run, without replaying the reveal');
  assert(JSON.stringify(await stored()) === JSON.stringify(log.aStored), 'A: later runs must not change stored progress');

  // B. slow first win → locked forever, even after a fast second win and a reload
  await freshBrowser();
  log.bSlow = await playRound(130_000);
  assert(!log.bSlow.reveal && !log.bSlow.titleEntrance, 'B: slow first win must not reveal or hint');
  log.bStored = await stored();
  assert(log.bStored?.unlocked === false && log.bStored.firstCompletionMs >= 120000, 'B: stored as locked');
  await page.reload();
  await page.waitForTimeout(500);
  log.bFastLater = await playRound();
  assert(!log.bFastLater.reveal && !log.bFastLater.titleEntrance, 'B: fast second win must stay locked');
  assert(JSON.stringify(await stored()) === JSON.stringify(log.bStored), 'B: stored progress unchanged');

  // C. a hand-edited record cannot unlock (slow time with unlocked:true)
  await page.evaluate(() => localStorage.setItem('jinci-bonus-v1', JSON.stringify({ firstCompletionMs: 200000, unlocked: true })));
  await page.reload();
  await page.waitForTimeout(500);
  assert(!(await ui()).titleEntrance, 'C: edited record must not unlock');

  await page.evaluate(() => localStorage.clear());
  return { ok: true, ...log };
}
