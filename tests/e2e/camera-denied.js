async (page) => {
  // Spec task 10.5 — Requirement 3.2: without a usable camera, explain and offer only "返回".
  const ROOT = '/projects/sandbox/repo-jinci';
  const TYPES = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', jpg: 'image/jpeg', png: 'image/png', wasm: 'application/wasm', task: 'application/octet-stream' };
  const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
  const cases = [
    { name: 'denied', script: () => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('no', 'NotAllowedError')); }, expect: '没有允许' },
    { name: 'nocamera', script: () => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('no', 'NotFoundError')); }, expect: '没有找到' },
    { name: 'busy', script: () => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('no', 'NotReadableError')); }, expect: '占用' },
    { name: 'nocameraapi', script: () => { Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }); }, expect: '不支持摄像头' },
  ];
  const out = {};
  for (const c of cases) {
    const pg = await page.context().newPage();
    await pg.route('https://jinci.test/**', async (route) => {
      let p = route.request().url().replace('https://jinci.test', '').split('?')[0];
      if (p === '/') p = '/index.html';
      const ext = p.split('.').pop();
      try { await route.fulfill({ path: ROOT + decodeURIComponent(p), contentType: TYPES[ext] || 'application/octet-stream' }); } catch { await route.fulfill({ status: 404, body: 'nf' }); }
    });
    await pg.addInitScript(c.script);
    await pg.setViewportSize({ width: 1280, height: 800 });
    await pg.goto('https://jinci.test/index.html');
    await pg.evaluate(() => localStorage.setItem('jinci-bonus-v1', JSON.stringify({ firstCompletionMs: 60000, unlocked: true })));
    await pg.reload();
    await pg.waitForTimeout(500);
    await pg.click('#btn-bonus');
    await pg.click('#btn-camera-on');
    await pg.waitForFunction(() => window.__jinciBonus.state().screen === 'error', null, { timeout: 8000 });
    const r = await pg.evaluate(() => ({
      text: document.querySelector('#bonus-error-text').textContent,
      buttons: [...document.querySelectorAll('#bonus-panel [data-screen=error] button')].filter((b) => b.offsetParent).map((b) => b.textContent),
      cameraOn: window.__jinciBonus.state().cameraOn,
    }));
    assert(r.text.includes(c.expect), `${c.name}: message "${r.text}"`);
    assert(r.buttons.length === 1 && r.buttons[0] === '返回', `${c.name}: only 返回 offered, got ${r.buttons}`);
    assert(!r.cameraOn, `${c.name}: camera must stay off`);
    if (c.name === 'denied') await pg.screenshot({ path: '/projects/sandbox/.kiro/artifacts/screenshots/47-bonus-denied.jpg', type: 'jpeg' });
    await pg.click('#bonus-panel [data-screen=error] .js-bonus-back');
    await pg.waitForTimeout(800);
    assert(!(await pg.evaluate(() => window.__jinciBonus.state().active)), `${c.name}: 返回 leaves the level`);
    out[c.name] = r.text;
    await pg.evaluate(() => localStorage.clear());
    await pg.close();
  }
  return { ok: true, ...out };
}
