// Scene flow: title → first-person time travel (2026 → 1023) → today's hall → puzzle → success.

import { MILESTONES, PIECES, UI } from './data.js';
import { CREDITS } from './credits.js';
import { Warp } from './warp.js';
import { Embers, spawnBats } from './fx.js';
import { Sound } from './audio.js';
import { Puzzle } from './puzzle.js';
import { createProgressStore } from './bonus/progress.js';
import { BonusLevel } from './bonus/level.js';
import { GalleryViewer } from './gallery.js';
import { GALLERY, SEASONS } from './gallery-data.js';
import { buildMarkers, clampIndex, flightDirection, markState, nextAuto, TimelineViewer } from './timeline.js';

const $ = (sel) => document.querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// localStorage can be missing or throw (e.g. some private windows); never let that break the game.
const storage = (() => {
  try {
    const s = window.localStorage;
    s.getItem('jinci-lang');
    return s;
  } catch {
    return null;
  }
})();
const progressStore = createProgressStore(storage);

// English first (most judges and players read English); ?lang=zh or the toggle switches to Chinese.
const urlLang = new URLSearchParams(location.search).get('lang');
let lang = ['zh', 'en'].includes(urlLang) ? urlLang : storage?.getItem('jinci-lang') === 'zh' ? 'zh' : 'en';
const t = (entry) => entry[lang] ?? entry.zh;

const sound = new Sound();
const embers = new Embers($('#embers'));
const warp = new Warp($('#warp'));
spawnBats($('#bats'));

// ---------- i18n ----------
let currentMilestone = null;
function renderTexts() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = t(UI.pageTitle);
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(UI[node.dataset.i18n]);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((node) => {
    node.setAttribute('aria-label', t(UI[node.dataset.i18nAria]));
  });
  $('#btn-lang').textContent = lang === 'zh' ? 'EN' : '中文';
  if (currentMilestone) fillCard(currentMilestone);
  renderCredits();
  gallery?.renderTexts();
  travelMarkers.forEach((b, i) => b.setAttribute('aria-label', markerLabel(MILESTONES[i])));
  tlViewer?.renderTexts();
}

// ---------- 晋祠美景 gallery ----------
let gallery = null;
function setupGallery() {
  gallery = new GalleryViewer({
    items: GALLERY,
    seasons: SEASONS,
    t: (entry) => t(entry),
    labels: { prev: UI.galleryPrev, next: UI.galleryNext, close: UI.close },
    els: {
      dialog: $('#gallery'), img: $('#gallery-img'), caption: $('#gallery-caption'), season: $('#gallery-season'),
      counter: $('#gallery-counter'), credit: $('#gallery-credit'), prev: $('#btn-gallery-prev'),
      next: $('#btn-gallery-next'), close: $('#btn-gallery-close'), tabs: $('#gallery-tabs'), frame: $('#gallery-frame'),
    },
  });
  $('#btn-gallery').addEventListener('click', (e) => gallery.open(e.currentTarget));
  window.__jinciGallery = gallery; // for automated play-tests
}
$('#btn-lang').addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  try { storage?.setItem('jinci-lang', lang); } catch { /* storage blocked */ }
  renderTexts();
});

$('#btn-sound').addEventListener('click', () => {
  const on = !sound.enabled;
  sound.setEnabled(on);
  $('#btn-sound').setAttribute('aria-pressed', String(on));
  $('#btn-sound').style.opacity = on ? 1 : 0.5;
});

// ---------- scenes ----------
async function show(id) {
  const next = $(`#scene-${id}`);
  const current = document.querySelector('.scene.active');
  if (current && current !== next) {
    current.classList.remove('visible');
    await sleep(reducedMotion ? 0 : 700);
    current.classList.remove('active');
  }
  next.classList.add('active');
  next.getBoundingClientRect(); // force layout so the fade-in transition runs
  next.classList.add('visible');
}

async function flash() {
  $('#flash').classList.add('on');
  await sleep(450);
  $('#flash').classList.remove('on');
}

// ---------- time travel (Req 2, 9) ----------
// A small controller: automatic advancing, plus jumps from the timeline, card clicks, and
// arrow keys. Every flight carries a token; a newer jump cancels older flights and waits.
const LAST = MILESTONES.length - 1;
const tl = { index: 0, visited: new Set(), auto: true, token: 0, year: MILESTONES[0].year, active: false, done: null };
let lastMilestoneIndex = 0; // most recently shown milestone, for the timeline viewer
let skipAll = false;
let cancelWait = null;

function wait(ms) {
  cancelWait?.();
  return new Promise((resolve) => {
    const h = setTimeout(() => { cancelWait = null; resolve(true); }, ms);
    cancelWait = () => { clearTimeout(h); cancelWait = null; resolve(false); };
  });
}

const markerLabel = (m) => t(m.era);
const travelMarkers = buildMarkers($('#tl-markers'), MILESTONES, (i) => userJump(i), markerLabel);

function fillCard(m) {
  $('#card-era').textContent = t(m.era);
  $('#card-text').textContent = t(m.text);
  $('#card-figure').hidden = false;
  $('#card-img').src = m.photo;
  $('#card-img').alt = t(m.photoCaption);
  $('#card-caption').textContent = t(m.photoCaption);
}

function animateYear(from, to, ms, token) {
  const yearEl = $('#year');
  const span = MILESTONES[0].year - MILESTONES[LAST].year;
  const t0 = performance.now();
  return new Promise((resolve) => {
    const step = (now) => {
      if (token !== tl.token) { resolve(false); return; } // a newer jump took over (Req 9.4)
      const k = skipAll ? 1 : Math.min(1, (now - t0) / ms);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const y = Math.round(from + (to - from) * eased);
      tl.year = y;
      yearEl.textContent = y;
      warp.age = (MILESTONES[0].year - y) / span;
      if (k < 1) requestAnimationFrame(step); else resolve(!skipAll);
    };
    requestAnimationFrame(step);
  });
}

function showCard(i) {
  const m = MILESTONES[i];
  tl.index = i;
  tl.visited.add(i);
  lastMilestoneIndex = i;
  currentMilestone = m;
  fillCard(m);
  warp.targetSpeed = 0.35;
  $('#year').classList.add('small');
  $('#card').classList.add('show');
  markState(travelMarkers, i, tl.visited);
  sound.bell(i === LAST ? 147 : 220, 0.2);
}

// Fly to milestone i. Resolves true if it arrived and its card is showing.
async function goTo(i, ms) {
  const token = ++tl.token;
  cancelWait?.();
  const dir = flightDirection(tl.index, i);
  tl.index = i;
  markState(travelMarkers, i, tl.visited);
  $('#card').classList.remove('show');
  if (tl.year !== MILESTONES[i].year) {
    $('#year').classList.remove('small');
    warp.targetSpeed = (reducedMotion ? 1 : 5) * (dir || 1); // negative = towards the present
    sound.whoosh();
    if (!(await animateYear(tl.year, MILESTONES[i].year, reducedMotion ? 400 : ms, token))) return false;
  }
  if (token !== tl.token || skipAll) return false;
  showCard(i);
  return true;
}

async function autoLoop() {
  let token = tl.token;
  while (tl.active && tl.auto && token === tl.token) {
    if (!(await wait(5200)) || token !== tl.token || !tl.auto) return;
    const next = nextAuto(tl.index, MILESTONES.length);
    if (next === null) { finishTravel(); return; }
    if (!(await goTo(next, 1700))) return;
    token = tl.token;
  }
}

function setAuto(on) {
  tl.auto = on;
  $('#btn-continue').hidden = on;
}

// Timeline marker or arrow key: pause, then fly there in ~1 s (Req 9.2, 9.3)
function userJump(i) {
  if (!tl.active) return;
  setAuto(false);
  goTo(clampIndex(i, MILESTONES.length), 1000);
}

function finishTravel() {
  tl.done?.();
  tl.done = null;
}

$('#btn-skip').addEventListener('click', () => { skipAll = true; cancelWait?.(); finishTravel(); });
$('#btn-continue').addEventListener('click', () => {
  if (!tl.active) return;
  setAuto(true);
  if (tl.index === LAST) finishTravel(); else autoLoop(); // Req 9.3, 9.5
});
// Clicking the card moves on, as before (Req 2.5), keeping the current auto/paused mode.
$('#card').addEventListener('click', async () => {
  if (!tl.active) return;
  const next = nextAuto(tl.index, MILESTONES.length);
  if (next === null) { finishTravel(); return; }
  if (await goTo(next, tl.auto ? 1700 : 1000) && tl.auto) autoLoop();
});
document.addEventListener('keydown', (e) => {
  if (!tl.active || !$('#credits').hidden) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); userJump(tl.index - 1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); userJump(tl.index + 1); }
});

async function travel() {
  skipAll = false;
  Object.assign(tl, { index: 0, visited: new Set(), year: MILESTONES[0].year, active: true });
  tl.token++;
  setAuto(true);
  document.body.classList.add('traveling');
  $('#year').textContent = MILESTONES[0].year;
  $('#year').classList.remove('small');
  markState(travelMarkers, 0, tl.visited);
  await show('travel');
  $('#warp').classList.add('on');
  warp.start();
  const ended = new Promise((r) => { tl.done = r; });
  warp.age = 0;
  showCard(0);
  autoLoop();
  await ended;
  tl.active = false;
  tl.token++;
  cancelWait?.();
  setAuto(true);
  currentMilestone = null;
  $('#card').classList.remove('show');
  $('#year').textContent = MILESTONES[LAST].year;
  warp.targetSpeed = 8;
  sound.whoosh();
  await sleep(skipAll ? 300 : 1100);
  await flash();
  warp.stop();
  $('#warp').classList.remove('on');
  document.body.classList.remove('traveling');
}

// ---------- timeline viewer (Req 9.6, 9.7) ----------
let tlViewer = null;
function setupTimeline() {
  tlViewer = new TimelineViewer({
    milestones: MILESTONES,
    t: (entry) => t(entry),
    labelFor: markerLabel,
    onShow: (i) => { lastMilestoneIndex = i; },
    els: {
      dialog: $('#timeline-viewer'), markers: $('#tlv-markers'), era: $('#tlv-era'), text: $('#tlv-text'),
      img: $('#tlv-img'), caption: $('#tlv-caption'), prev: $('#btn-tlv-prev'), next: $('#btn-tlv-next'), close: $('#btn-tlv-close'),
    },
  });
  $('#btn-timeline').addEventListener('click', (e) => tlViewer.open(lastMilestoneIndex, e.currentTarget));
  window.__jinciTimeline = { tl, viewer: tlViewer, warp }; // for automated play-tests
}

// ---------- reveal + puzzle ----------
let puzzle = null;
let timer = null;
let startedAt = 0;

function toast(msg, warn = false, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('warn', warn);
  el.classList.add('show');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => el.classList.remove('show'), ms);
}

function showFact(piece) {
  $('#fact-title').textContent = t(piece.name);
  $('#fact-text').textContent = t(piece.fact);
  $('#fact').classList.add('show');
  clearTimeout(showFact.h);
  showFact.h = setTimeout(() => $('#fact').classList.remove('show'), 6500);
}

const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

async function reveal() {
  const scene = $('#scene-reveal');
  scene.classList.remove('haunt');
  await show('reveal');
  sound.bell(196, 0.25);
  await sleep(reducedMotion ? 1500 : 4800);
  scene.classList.add('haunt');
  sound.wind();
  await sleep(1600);
}

let mode = 'main'; // 'main' or 'bonus'
let finishedAt = 0;
let lastCompletion = null; // { progress, justUnlocked } from the latest main-game win

function ensurePuzzle(create = true) {
  if (!puzzle && create) {
    puzzle = new Puzzle($('#stage'), {
      pieces: PIECES,
      sound,
      embers,
      onPlaced: (piece, n) => {
        $('#progress').textContent = `${n} / ${PIECES.length}`;
        showFact(piece);
        if (n === PIECES.length) {
          // Completion time is taken when the 9th piece goes in (Req 1.5) and shown in the dialog.
          finishedAt = performance.now();
          clearInterval(timer);
          $('#timer').textContent = fmt(finishedAt - startedAt);
          lastCompletion = mode === 'main' ? progressStore.complete(finishedAt - startedAt) : null;
        }
      },
      onRejected: (piece, missing) => {
        if (missing) {
          const names = missing.map((id) => t(PIECES.find((p) => p.id === id).name));
          toast(lang === 'zh'
            ? `「${t(piece.name)}」还不能放：要先搭好「${names.join('、')}」`
            : `${t(piece.name)} can't go up yet. Build ${names.join(' and ')} first.`, true);
        } else {
          toast(t(UI.wrong), true, 1600);
        }
      },
      onWin: (attempts) => (mode === 'bonus' ? bonus.win(attempts) : win(attempts)),
    });
    window.__jinciPuzzle = puzzle; // handy for debugging and automated play-tests
  }
  return puzzle;
}

function prepareHud({ bonus: isBonus }) {
  mode = isBonus ? 'bonus' : 'main';
  $('#hud-goal').dataset.i18n = isBonus ? 'bonusGoal' : 'goal';
  $('#hud-goal').textContent = t(isBonus ? UI.bonusGoal : UI.goal);
  $('#progress').textContent = `0 / ${PIECES.length}`;
  $('#timer').textContent = '00:00';
  clearInterval(timer);
}

// One round: assembled hall → ghost-wind scatter → timer runs. Shared by both modes.
async function startRound({ bonus: isBonus }) {
  await show('game');
  const p = ensurePuzzle();
  p.assemble();
  prepareHud({ bonus: isBonus });
  embers.setDensity(18);
  await sleep(1400);
  toast(t(UI.scatter), false, 2600);
  sound.wind();
  await p.scatter();
  toast(t(isBonus ? UI.bonusGoal : UI.goal), false, 3200);
  startedAt = performance.now();
  timer = setInterval(() => { $('#timer').textContent = fmt(performance.now() - startedAt); }, 500);
}

const playPuzzle = () => startRound({ bonus: false });

$('#btn-hint').addEventListener('click', () => {
  const p = puzzle?.hint();
  if (p) toast(`${t(UI.hintText)}${t(p.name)}`);
});

function win(attempts) {
  $('#win-time').textContent = fmt(finishedAt - startedAt);
  $('#win-moves').textContent = attempts;
  sound.fanfare();
  embers.celebrate();
  // Hidden level: only shown once unlocked, never hinted otherwise (Req 1.1, 1.2, 1.4).
  const reveal = $('#unlock-reveal');
  const unlocked = progressStore.isUnlocked();
  reveal.hidden = !unlocked;
  reveal.classList.toggle('just', !!lastCompletion?.justUnlocked);
  updateBonusEntrance();
  setTimeout(() => {
    $('#win').hidden = false;
    $('#btn-again').focus();
    if (lastCompletion?.justUnlocked) {
      sound.bell(165, 0.3);
      const r = reveal.getBoundingClientRect();
      embers.burst(r.left + r.width / 2, r.top + r.height / 2, 60, [150, 160, 170]);
    }
  }, 1600);
}

$('#btn-again').addEventListener('click', async () => {
  $('#win').hidden = true;
  await run();
});

// ---------- hidden level ----------
function updateBonusEntrance() {
  $('#btn-bonus').hidden = !progressStore.isUnlocked();
}

async function goTitle() {
  clearInterval(timer);
  mode = 'main';
  $('#win').hidden = true;
  embers.setDensity(0);
  updateBonusEntrance();
  await show('title');
}

const bonus = new BonusLevel({
  t: (entry) => t(entry),
  UI,
  sound,
  embers,
  toast,
  show,
  ensurePuzzle,
  prepareHud,
  startRound,
  goTitle,
  fmt,
  elapsedMs: () => finishedAt - startedAt,
});

document.querySelectorAll('.js-enter-bonus').forEach((b) => b.addEventListener('click', () => {
  sound.init();
  bonus.enter();
}));
updateBonusEntrance();

// ---------- credits ----------
function renderCredits() {
  const list = $('#credits-list');
  list.innerHTML = '';
  for (const c of CREDITS) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = c.source;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = c.title.replace(/^File:/, '');
    li.append(a, ` — ${c.author} · ${c.license}`);
    list.appendChild(li);
  }
}
function openCredits() { $('#credits').hidden = false; $('#btn-close-credits').focus(); }
$('#btn-credits').addEventListener('click', openCredits);
document.querySelectorAll('.js-open-credits').forEach((b) => b.addEventListener('click', openCredits));
$('#btn-close-credits').addEventListener('click', () => { $('#credits').hidden = true; });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $('#credits').hidden = true;
});

// ---------- start ----------
async function run() {
  embers.setDensity(0);
  await travel();
  await reveal();
  await playPuzzle();
}

$('#btn-start').addEventListener('click', () => {
  sound.init();
  sound.bell(262, 0.2);
  run();
});

setupGallery();
setupTimeline();
renderTexts();
$('#scene-title').classList.add('visible');
