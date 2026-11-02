async (page) => {
  // Main spec task 10.4 — Requirement 9 (timeline navigation).
  const ROOT = '/projects/sandbox/repo-jinci';
  const TYPES = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', wasm: 'application/wasm', task: 'application/octet-stream' };
  const pg = await page.context().newPage();
  await pg.bringToFront(); // background tabs throttle animation frames, which would distort timings
  await pg.route('https://jinci.test/**', async (route) => {
    let p = route.request().url().replace('https://jinci.test', '').split('?')[0];
    if (p === '/') p = '/index.html';
    const ext = p.split('.').pop();
    try { await route.fulfill({ path: ROOT + decodeURIComponent(p), contentType: TYPES[ext] || 'application/octet-stream' }); } catch { await route.fulfill({ status: 404, body: 'nf' }); }
  });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e)));
  const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
  const st = () => pg.evaluate(() => {
    const { tl } = window.__jinciTimeline;
    return {
      index: tl.index, auto: tl.auto, active: tl.active,
      shown: document.querySelector('#card').classList.contains('show'),
      era: document.querySelector('#card-era').textContent,
      year: document.querySelector('#year').textContent,
      current: document.querySelector('#tl-markers .tl-marker.current')?.dataset.index,
      visited: document.querySelectorAll('#tl-markers .tl-marker.visited').length,
      cont: !document.querySelector('#btn-continue').hidden,
    };
  });
  const arrived = (i) => pg.waitForFunction((k) => {
    const { tl } = window.__jinciTimeline;
    return tl.index === k && document.querySelector('#card').classList.contains('show');
  }, i, { timeout: 8000 });
  const log = {};

  await pg.setViewportSize({ width: 1280, height: 800 });
  await pg.goto('https://jinci.test/index.html');
  await pg.evaluate(() => localStorage.clear());
  await pg.reload();
  await pg.waitForTimeout(500);
  const ERAS = await pg.evaluate(async () => (await import('/js/data.js')).MILESTONES.map((m) => m.era.zh));
  assert(await pg.isVisible('#btn-timeline'), 'timeline button on the title screen (Req 9.6)');

  // record every era the card shows, to prove a cancelled flight never shows its card (Req 9.4)
  await pg.evaluate(() => {
    window.__eraLog = [];
    new MutationObserver(() => window.__eraLog.push(document.querySelector('#card-era').textContent))
      .observe(document.querySelector('#card-era'), { childList: true, characterData: true, subtree: true });
  });

  await pg.click('#btn-start');
  await arrived(0);
  let s = await st();
  assert(s.current === '0' && s.auto && !s.cont, 'starts at 2026, auto, no 继续 ' + JSON.stringify(s));
  assert((await pg.$$('#tl-markers .tl-marker')).length === 10, '10 markers (Req 9.1)');
  assert(!(await pg.isVisible('#btn-timeline')), 'timeline button hidden during travel (Req 9.6)');

  // jump forward into the past: about 1 s, pauses auto (Req 9.2, 9.3)
  await pg.evaluate(() => {
    const m = document.querySelector('#tl-markers .tl-marker[data-index="5"]');
    m.addEventListener('click', () => { window.__clickAt = performance.now(); }, { once: true, capture: true });
    new MutationObserver((_, obs) => {
      if (document.querySelector('#card').classList.contains('show') && window.__clickAt) { window.__flightMs = performance.now() - window.__clickAt; obs.disconnect(); }
    }).observe(document.querySelector('#card'), { attributes: true });
  });
  await pg.click('#tl-markers .tl-marker[data-index="5"]');
  await arrived(5);
  log.flightMs = Math.round(await pg.evaluate(() => window.__flightMs));
  s = await st();
  assert(s.era === ERAS[5] && s.year === '1875' && !s.auto && s.cont, 'jumped to 1875, paused ' + JSON.stringify(s));
  assert(log.flightMs < 1800, 'flight took ' + log.flightMs + ' ms');
  await pg.screenshot({ path: '/projects/sandbox/.kiro/artifacts/screenshots/90-timeline-jump.jpg', type: 'jpeg' });

  // paused: stays put
  await pg.waitForTimeout(6200);
  assert((await st()).index === 5, 'stays on 1875 while paused');

  // jump back towards the present: tunnel flows backwards
  await pg.click('#tl-markers .tl-marker[data-index="2"]');
  await pg.waitForTimeout(250);
  log.reverseSpeed = await pg.evaluate(() => window.__jinciTimeline.warp.targetSpeed);
  assert(log.reverseSpeed < 0, 'tunnel flows backwards towards the present: ' + log.reverseSpeed);
  await arrived(2);
  assert((await st()).era === ERAS[2], 'arrived at 1961');

  // rapid double jump: only the last target's card shows (Req 9.4)
  await pg.evaluate(() => { window.__eraLog = []; });
  await pg.click('#tl-markers .tl-marker[data-index="8"]');
  await pg.waitForTimeout(200);
  await pg.click('#tl-markers .tl-marker[data-index="1"]');
  await arrived(1);
  await pg.waitForTimeout(1500);
  log.eraLog = await pg.evaluate(() => window.__eraLog);
  s = await st();
  assert(s.index === 1 && s.era === ERAS[1], 'ended on 1993 ' + JSON.stringify(s));
  assert(!log.eraLog.includes(ERAS[8]), 'cancelled flight to 1102 never showed its card: ' + log.eraLog.join(' | '));

  // arrow keys
  await pg.keyboard.press('ArrowRight');
  await arrived(2);
  await pg.keyboard.press('ArrowLeft');
  await arrived(1);
  await pg.keyboard.press('ArrowLeft');
  await arrived(0);
  await pg.keyboard.press('ArrowLeft'); // already at 2026: clamps
  await pg.waitForTimeout(400);
  assert((await st()).index === 0, 'ArrowLeft at 2026 stays');

  // card click moves on and stays paused (Req 2.5, 9.3)
  await pg.click('#card');
  await arrived(1);
  s = await st();
  assert(!s.auto && s.cont, 'card click keeps paused mode');

  // 继续 resumes automatic advancing
  await pg.click('#btn-continue');
  s = await st();
  assert(s.auto && !s.cont, '继续 resumes auto');
  await arrived(2); // after ~5.2 s + 1.7 s
  assert((await st()).auto, 'still auto after advancing');

  // visited markers
  log.visited = await pg.evaluate(() => [...document.querySelectorAll('#tl-markers .tl-marker.visited')].map((b) => +b.dataset.index));
  assert(log.visited.join() === '0,1,2,5', 'visited = shown milestones only (not the cancelled 1102): ' + log.visited);

  // jump to the last milestone, 继续 ends the travel (Req 9.5)
  await pg.click('#tl-markers .tl-marker[data-index="9"]');
  await arrived(9);
  await pg.click('#btn-continue');
  await pg.waitForFunction(() => document.querySelector('#scene-reveal').classList.contains('active'), null, { timeout: 8000 });
  assert(!(await pg.evaluate(() => document.body.classList.contains('traveling'))), 'traveling class removed');

  // viewer (Req 9.6, 9.7)
  await pg.waitForTimeout(600);
  assert(await pg.isVisible('#btn-timeline'), 'timeline button back after travel');
  await pg.click('#btn-timeline');
  let v = await pg.evaluate(() => ({ era: document.querySelector('#tlv-era').textContent, next: document.querySelector('#btn-tlv-next').disabled, prev: document.querySelector('#btn-tlv-prev').disabled, cur: document.querySelector('#tlv-markers .current')?.dataset.index }));
  assert(v.era === ERAS[9] && v.next && !v.prev && v.cur === '9', 'viewer opens on the last shown milestone, next disabled ' + JSON.stringify(v));
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: '/projects/sandbox/.kiro/artifacts/screenshots/91-timeline-viewer.jpg', type: 'jpeg' });
  await pg.click('#btn-tlv-prev');
  await pg.keyboard.press('ArrowLeft');
  v = await pg.evaluate(() => document.querySelector('#tlv-era').textContent);
  assert(v === ERAS[7], 'prev + ArrowLeft → 1118: ' + v);
  await pg.click('#tlv-markers .tl-marker[data-index="0"]');
  v = await pg.evaluate(() => ({ era: document.querySelector('#tlv-era').textContent, prev: document.querySelector('#btn-tlv-prev').disabled }));
  assert(v.era === ERAS[0] && v.prev, 'marker → 2026, prev disabled (no wrap)');
  await pg.keyboard.press('ArrowLeft');
  assert((await pg.evaluate(() => document.querySelector('#tlv-era').textContent)) === ERAS[0], 'no wrap-around');
  await pg.keyboard.press('Escape');
  v = await pg.evaluate(() => ({ open: !document.querySelector('#timeline-viewer').hidden, focus: document.activeElement?.id }));
  assert(!v.open && v.focus === 'btn-timeline', 'Escape closes, focus returns ' + JSON.stringify(v));

  // English labels
  await pg.click('#btn-lang');
  await pg.click('#btn-timeline');
  v = await pg.evaluate(() => ({ title: document.querySelector('#tlv-title').textContent, next: document.querySelector('#btn-tlv-next').textContent, era: document.querySelector('#tlv-era').textContent }));
  assert(v.title === 'Timeline' && v.next.includes('Earlier') && /[A-Za-z]/.test(v.era), 'English ' + JSON.stringify(v));
  await pg.keyboard.press('Escape');
  await pg.click('#btn-lang');

  // hidden in the bonus level
  await pg.evaluate(() => document.body.classList.add('bonus'));
  assert(!(await pg.isVisible('#btn-timeline')), 'hidden in bonus mode');
  await pg.evaluate(() => document.body.classList.remove('bonus'));

  // phone layout: travel bar visible and inside the screen
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.evaluate(() => localStorage.clear());
  await pg.reload();
  await pg.waitForTimeout(500);
  await pg.click('#btn-start');
  await arrived(0);
  await pg.click('#tl-markers .tl-marker[data-index="4"]');
  await arrived(4);
  await pg.waitForTimeout(500);
  log.phoneBar = await pg.evaluate(() => { const r = document.querySelector('.tl-bar').getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom].map(Math.round); });
  assert(log.phoneBar[0] >= 0 && log.phoneBar[1] <= 390, 'bar fits the phone width ' + log.phoneBar);
  await pg.screenshot({ path: '/projects/sandbox/.kiro/artifacts/screenshots/92-timeline-phone.jpg', type: 'jpeg' });

  assert(errors.length === 0, 'page errors: ' + errors.join('; '));
  await pg.close();
  return { ok: true, ...log };
}
