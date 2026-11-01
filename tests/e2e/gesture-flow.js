async (page) => {
  // Spec task 10.4 — Requirements 2.2, 3.4, 4.2, 5.4, 6.1, 6.2, 6.4, 6.6, 7.1, 7.3, 7.5.
  // A real hand cannot be automated, so scripted MediaPipe-style landmarks are fed through
  // window.__jinciBonus.feed(), which runs the same GestureInput code as the camera does.
  const ROOT = '/projects/sandbox/repo-jinci';
  const TYPES = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', jpg: 'image/jpeg', png: 'image/png', wasm: 'application/wasm', task: 'application/octet-stream' };
  const pg = await page.context().newPage(); // fresh page: no fake clock from other tests
  await pg.route('https://jinci.test/**', async (route) => {
    let p = route.request().url().replace('https://jinci.test', '').split('?')[0];
    if (p === '/') p = '/index.html';
    const ext = p.split('.').pop();
    try { await route.fulfill({ path: ROOT + decodeURIComponent(p), contentType: TYPES[ext] || 'application/octet-stream' }); } catch { await route.fulfill({ status: 404, body: 'nf' }); }
  });
  const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
  const shot = (n) => pg.screenshot({ path: `/projects/sandbox/.kiro/artifacts/screenshots/${n}.jpg`, type: 'jpeg' });
  const state = () => pg.evaluate(() => ({ ...window.__jinciBonus.state(), placed: [...window.__jinciPuzzle?.placed ?? []], attempts: window.__jinciPuzzle?.attempts, toast: document.querySelector('#toast').textContent }));
  const ORDER = ['platform', 'walls', 'columns', 'lowerBrackets', 'lowerRoof', 'upperBrackets', 'plaque', 'upperRoof', 'ridge'];
  const log = {};

  await pg.setViewportSize({ width: 1280, height: 800 });
  await pg.goto('https://jinci.test/index.html');
  await pg.evaluate(() => localStorage.setItem('jinci-bonus-v1', JSON.stringify({ firstCompletionMs: 60000, unlocked: true })));
  await pg.reload();
  await pg.waitForTimeout(600);
  assert(await pg.isVisible('#btn-bonus'), 'title entrance visible when unlocked');

  // In-page driver: converts screen points to camera landmarks and feeds frames.
  await pg.evaluate(() => {
    window.__jinciBonus.useFakeTracker();
    const B = window.__jinciBonus;
    let t = performance.now();
    let cur = null;
    let pinched = false;
    const toCam = (X, Y) => {
      const r = document.querySelector('#stage').getBoundingClientRect();
      const ux = (X - r.left) / r.width;
      const uy = (Y - r.top) / r.height;
      return { x: 1 - (ux * 0.7 + 0.15), y: uy * 0.7 + 0.15 };
    };
    const hand = (X, Y) => {
      const { x, y } = toCam(X, Y);
      const lm = Array.from({ length: 21 }, () => ({ x, y: y + 0.1, z: 0 }));
      const half = pinched ? 0.01 : 0.06; // ratio 0.13 when pinched, 0.8 when open (palm = 0.15)
      lm[0] = { x, y: y + 0.2, z: 0 };
      lm[9] = { x, y: y + 0.05, z: 0 };
      lm[4] = { x: x - half, y, z: 0 };
      lm[8] = { x: x + half, y, z: 0 };
      return lm;
    };
    const frame = async (lm) => { t += 33; B.feed(lm, t); await new Promise((r) => requestAnimationFrame(r)); };
    window.__h = {
      async at(X, Y, n = 12) { cur = { X, Y }; for (let i = 0; i < n; i++) await frame(hand(X, Y)); },
      async moveTo(X, Y, steps = 18) {
        const s = cur ?? { X, Y };
        for (let i = 1; i <= steps; i++) { cur = { X: s.X + (X - s.X) * i / steps, Y: s.Y + (Y - s.Y) * i / steps }; await frame(hand(cur.X, cur.Y)); }
        await this.at(X, Y, 10);
      },
      async pinch() { pinched = true; await this.at(cur.X, cur.Y, 5); },
      async open() { pinched = false; await this.at(cur.X, cur.Y, 5); },
      async lose(ms) { for (let i = 0; i < Math.ceil(ms / 33); i++) await frame(null); },
      center(sel) { const r = document.querySelector(sel).getBoundingClientRect(); return { X: r.x + r.width / 2, Y: r.y + r.height / 2 }; },
      async carry(id) {
        const a = this.center(`.loose .piece[data-id=${id}] > g`);
        await this.moveTo(a.X, a.Y);
        await this.pinch();
        const held = window.__jinciBonus.state().holding;
        const b = this.center(`.ghost[data-id=${id}]`);
        await this.moveTo(b.X, b.Y, 24);
        await this.open();
        return held;
      },
    };
  });
  const h = (code, arg) => pg.evaluate(code, arg);

  // privacy first: no camera until consent (Req 2.1, 2.2)
  await pg.click('#btn-bonus');
  await pg.waitForTimeout(300);
  let s = await state();
  assert(s.active && s.screen === 'privacy' && !s.cameraOn, 'privacy screen shown, camera still off');
  await shot('40-bonus-privacy');
  await pg.click('#btn-camera-on');
  await pg.waitForFunction(() => !document.querySelector('#tutorial').hidden, null, { timeout: 10000 });
  s = await state();
  assert(s.cameraOn && s.tutorialStep === 0, 'camera on, tutorial at step 1');
  assert(await pg.isVisible('#cam-wrap'), 'camera preview visible (Req 2.4)');
  assert(await pg.isVisible('#hand-status'), '"看不到你的手" shown before a hand appears (Req 5.4)');

  // tutorial: hand → pinch → release (Req 4.2)
  await h(() => window.__h.at(640, 330));
  assert((await state()).tutorialStep === 1, 'hand seen');
  assert(!(await pg.isVisible('#hand-status')), 'no-hand status hidden once the hand is seen');
  await shot('41-bonus-tutorial');
  await h(() => window.__h.pinch());
  assert((await state()).tutorialStep === 2, 'pinch seen');
  await h(() => window.__h.open());
  await pg.waitForFunction(() => window.__jinciPuzzle?.enabled && window.__jinciBonus.state().roundStarted, null, { timeout: 15000 });
  log.afterTutorial = await state();
  assert(await pg.isHidden('#tutorial'), 'tutorial closed');
  await shot('42-bonus-scattered');

  // mouse cannot move pieces in the hidden level (Req 3.4)
  const m = await h(() => window.__h.center('.loose .piece[data-id=platform] > g'));
  const g = await h(() => window.__h.center('.ghost[data-id=platform]'));
  await pg.mouse.move(m.X, m.Y); await pg.mouse.down();
  for (let i = 1; i <= 10; i++) await pg.mouse.move(m.X + (g.X - m.X) * i / 10, m.Y + (g.Y - m.Y) * i / 10);
  await pg.mouse.up();
  await pg.waitForTimeout(300);
  assert((await state()).placed.length === 0, 'mouse drag must not place pieces');

  // pinch over empty sky grabs nothing (Req 6.2)
  await h(() => window.__h.moveTo(150, 120));
  await h(() => window.__h.pinch());
  assert((await state()).holding === null, 'empty grab holds nothing');
  await h(() => window.__h.open());

  // out-of-order drop is rejected with the normal message (Req 6.4)
  const heldRoof = await h(() => window.__h.carry('upperRoof'));
  assert(heldRoof === 'upperRoof', 'grabbed the upper roof');
  await pg.waitForTimeout(200);
  s = await state();
  assert(!s.placed.includes('upperRoof') && s.attempts === 1 && s.toast.includes('上檐斗拱'), 'rejected drop names the missing support: ' + s.toast);
  await pg.waitForTimeout(600);

  // hand lost for > 1 s while holding → piece goes back, no attempt counted (Req 6.6)
  await h(async () => {
    const a = window.__h.center('.loose .piece[data-id=platform] > g');
    await window.__h.moveTo(a.X, a.Y);
    await window.__h.pinch();
    await window.__h.moveTo(a.X, a.Y - 200);
  });
  assert((await state()).holding === 'platform', 'holding platform before losing the hand');
  await h(() => window.__h.lose(600));
  assert((await state()).holding === 'platform', 'still holding after 0.6 s without a hand');
  await h(() => window.__h.lose(700));
  s = await state();
  assert(s.holding === null && s.attempts === 1 && s.toast.includes('手不见了'), 'piece released after > 1 s without a hand');
  await pg.waitForTimeout(700);
  await h(() => window.__h.open());

  // full build with gestures (Req 6.1, 6.4)
  for (const id of ORDER) {
    const held = await h((pid) => window.__h.carry(pid), id);
    assert(held === id, `grabbed ${id} (got ${held})`);
    await pg.waitForTimeout(450);
    const placed = (await state()).placed;
    assert(placed.includes(id), `${id} placed by gesture; placed = ${placed.join(',')}`);
    if (id === 'lowerRoof') await shot('43-bonus-midway');
  }
  await pg.waitForFunction(() => !document.querySelector('#bonus-win').hidden, null, { timeout: 10000 });
  s = await state();
  assert(!s.cameraOn && (await pg.isHidden('#cam-wrap')), 'camera off at the win (Req 7.3)');
  log.win = await pg.evaluate(() => ({ title: document.querySelector('#bonus-win-title').textContent, time: document.querySelector('#bonus-win-time').textContent, attempts: document.querySelector('#bonus-win-moves').textContent }));
  assert(log.win.title.includes('鬼手匠师'), 'bonus win title');
  await shot('44-bonus-win');

  // play again → asks for the camera again; Escape during play stops it (Req 7.4, 7.5, 2.5)
  await pg.click('#btn-bonus-again');
  await pg.waitForTimeout(200);
  s = await state();
  assert(s.screen === 'privacy' && !s.cameraOn, 'replay asks for consent again');
  await pg.click('#btn-camera-on');
  await pg.waitForFunction(() => window.__jinciBonus.state().cameraOn, null, { timeout: 10000 });
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(900);
  s = await state();
  assert(!s.active && !s.cameraOn, 'Escape leaves and stops the camera');
  assert(await pg.evaluate(() => document.querySelector('#scene-title').classList.contains('active') && !document.body.classList.contains('bonus')), 'back on the title screen, bonus theme removed');
  assert(await pg.evaluate(() => window.__jinciPuzzle.inputMode === 'pointer'), 'pointer input restored');

  // page hidden while playing → camera stops, consent asked again (Req 2.5)
  await pg.click('#btn-bonus');
  await pg.click('#btn-camera-on');
  await pg.waitForFunction(() => window.__jinciBonus.state().cameraOn, null, { timeout: 10000 });
  await pg.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  s = await state();
  assert(!s.cameraOn && s.screen === 'privacy' && (await pg.isVisible('#privacy-hidden-note')), 'hidden page stops the camera and asks again');
  await pg.click('#bonus-panel [data-screen=privacy] .js-bonus-back');
  await pg.waitForTimeout(800);
  assert(!(await state()).active, 'back from privacy leaves the level');

  await pg.evaluate(() => localStorage.clear());
  await pg.close();
  return { ok: true, ...log };
}
