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

// Chinese first; ?lang=en or the toggle switches to English.
let lang = new URLSearchParams(location.search).get('lang') || storage?.getItem('jinci-lang') || 'zh';
const t = (entry) => entry[lang] ?? entry.zh;

const sound = new Sound();
const embers = new Embers($('#embers'));
const warp = new Warp($('#warp'));
spawnBats($('#bats'));

// ---------- i18n ----------
let currentMilestone = null;
function renderTexts() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(UI[node.dataset.i18n]);
  });
  $('#btn-lang').textContent = lang === 'zh' ? 'EN' : '中文';
  if (currentMilestone) fillCard(currentMilestone);
  renderCredits();
  gallery?.renderTexts();
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

// ---------- time travel ----------
let skip = null;
function skippable(ms) {
  return Promise.race([sleep(ms), new Promise((r) => { skip = r; })]);
}
let skipAll = false;
$('#btn-skip').addEventListener('click', () => { skipAll = true; skip?.(); });
$('#card').addEventListener('click', () => skip?.());

function fillCard(m) {
  $('#card-era').textContent = t(m.era);
  $('#card-text').textContent = t(m.text);
  const fig = $('#card-figure');
  if (m.photo) {
    fig.hidden = false;
    $('#card-img').src = m.photo;
    $('#card-img').alt = t(m.photoCaption);
    $('#card-caption').textContent = t(m.photoCaption);
  } else {
    fig.hidden = true;
  }
}

function animateYear(from, to, ms) {
  const yearEl = $('#year');
  const span = MILESTONES[0].year - MILESTONES[MILESTONES.length - 1].year;
  const t0 = performance.now();
  return new Promise((resolve) => {
    const step = (now) => {
      const k = skipAll ? 1 : Math.min(1, (now - t0) / ms);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const y = Math.round(from + (to - from) * eased);
      yearEl.textContent = y;
      warp.age = (MILESTONES[0].year - y) / span;
      if (k < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
}

async function travel() {
  skipAll = false;
  await show('travel');
  $('#warp').classList.add('on');
  warp.start();
  const card = $('#card');
  const yearEl = $('#year');
  let year = MILESTONES[0].year;
  for (const [i, m] of MILESTONES.entries()) {
    if (skipAll) break;
    yearEl.classList.remove('small');
    if (i > 0) {
      warp.targetSpeed = reducedMotion ? 1 : 5;
      sound.whoosh();
      await animateYear(year, m.year, reducedMotion ? 600 : 1700);
    }
    year = m.year;
    if (skipAll) break;
    warp.targetSpeed = 0.35;
    yearEl.classList.add('small');
    sound.bell(i === MILESTONES.length - 1 ? 147 : 220, 0.2);
    currentMilestone = m;
    fillCard(m);
    card.classList.add('show');
    await skippable(5200); // every milestone has a photo
    card.classList.remove('show');
    await sleep(350);
  }
  currentMilestone = null;
  card.classList.remove('show');
  yearEl.textContent = MILESTONES[MILESTONES.length - 1].year;
  warp.targetSpeed = 8;
  sound.whoosh();
  await sleep(skipAll ? 300 : 1100);
  await flash();
  warp.stop();
  $('#warp').classList.remove('on');
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
renderTexts();
$('#scene-title').classList.add('visible');
