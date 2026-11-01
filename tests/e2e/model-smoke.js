async (page) => {
  // Spec task 10.1 — Requirement 8.2, 8.4: vendored files load and run; nothing is fetched from other hosts.
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
  // Google Fonts are part of the main game (not the hidden level), so they are allowed here.
  const ALLOWED = ['https://jinci.test/', 'https://fonts.googleapis.com/', 'https://fonts.gstatic.com/', 'data:', 'blob:'];
  const foreign = [];
  const vendorHits = [];
  const onReq = (r) => {
    const u = r.url();
    if (!ALLOWED.some((a) => u.startsWith(a))) foreign.push(u);
    if (u.includes('/vendor/mediapipe/')) vendorHits.push(u.replace('https://jinci.test', ''));
  };
  page.on('request', onReq);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('https://jinci.test/index.html');
  await page.waitForTimeout(800);
  const beforeOpen = vendorHits.length; // Req 8.2: nothing loaded until the hidden level asks for it

  const result = await page.evaluate(async () => {
    const t0 = performance.now();
    const { preloadLandmarker } = await import('/js/bonus/tracker.js');
    const lm = await preloadLandmarker();
    const loadMs = performance.now() - t0;
    const c = document.createElement('canvas');
    c.width = 640; c.height = 480;
    const g = c.getContext('2d');
    g.fillStyle = '#777'; g.fillRect(0, 0, 640, 480);
    const runs = [];
    for (let i = 0; i < 10; i++) {
      const s = performance.now();
      const r = lm.detectForVideo(c, performance.now());
      runs.push(performance.now() - s);
      if (i === 0) var hands = r.landmarks.length;
    }
    return { loadMs: Math.round(loadMs), hands, msPerFrame: Math.round(runs.slice(2).reduce((a, b) => a + b, 0) / (runs.length - 2)) };
  });
  page.off('request', onReq);
  assert(beforeOpen === 0, 'vendor files were requested before the hidden level opened');
  assert(result.hands === 0, 'blank image should contain no hand');
  assert(foreign.length === 0, 'requests to other hosts: ' + foreign.join(', '));
  const files = [...new Set(vendorHits)].sort();
  for (const f of ['/vendor/mediapipe/vision_bundle.mjs', '/vendor/mediapipe/wasm/vision_wasm_internal.js', '/vendor/mediapipe/wasm/vision_wasm_internal.wasm', '/vendor/mediapipe/hand_landmarker.task']) {
    assert(files.includes(f), 'not loaded: ' + f);
  }
  return { ok: true, ...result, filesLoaded: files, foreignRequests: foreign.length };
}
