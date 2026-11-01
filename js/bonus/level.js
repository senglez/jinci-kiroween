// Hidden level flow: privacy → loading → tutorial → play → win, with exit at any time.
// Spec: gesture-bonus-level, Requirements 2, 3, 4, 7.

import { HandTracker } from './tracker.js';
import { GestureInput } from './input.js';
import { GRAB_RATIO, OPENING_RATIO, RELEASE_RATIO } from './gesture.js';

const $ = (sel) => document.querySelector(sel);
const DEBUG = new URLSearchParams(location.search).has('debug');
const STEPS = ['hand', 'pinch', 'release'];

export class BonusLevel {
  // ctx: { t, UI, sound, embers, toast, show, ensurePuzzle, startRound, goTitle, fmt, elapsedMs }
  constructor(ctx) {
    this.ctx = ctx;
    this.tracker = new HandTracker($('#cam'));
    this.input = null;
    this.active = false;
    this.roundStarted = false;
    this.tutorialStep = -1;
    this.screen = null;

    $('#btn-camera-on').addEventListener('click', () => this.startCamera());
    document.querySelectorAll('.js-bonus-back').forEach((b) => b.addEventListener('click', () => this.exit()));
    $('#btn-exit-bonus').addEventListener('click', () => this.exit());
    $('#btn-tut-skip').addEventListener('click', () => this.finishTutorial());
    $('#btn-bonus-again').addEventListener('click', () => { $('#bonus-win').hidden = true; this.enter(); });
    $('#btn-bonus-title').addEventListener('click', () => this.exit());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.active) this.exit(); // Req 7.5
    });
    // Stop the camera whenever the page is hidden; ask again when it comes back (Req 2.5).
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.active && this.tracker.isOn()) this.pauseForHidden();
    });
    window.addEventListener('pagehide', () => this.tracker.stop());

    // Test seam for automated play-tests (like window.__jinciPuzzle). Not used by the game itself.
    window.__jinciBonus = {
      level: this,
      useFakeTracker: () => this.useFakeTracker(),
      feed: (landmarks, t) => this.fake?.emit({ landmarks, t: t ?? performance.now() }),
      state: () => ({
        active: this.active, screen: this.screen, cameraOn: this.tracker.isOn(),
        roundStarted: this.roundStarted, tutorialStep: this.tutorialStep, holding: this.input?.holding ?? null,
      }),
    };
  }

  // ---------- screens ----------

  showPanel(screen) {
    this.screen = screen;
    $('#bonus-panel').hidden = false;
    document.querySelectorAll('#bonus-panel [data-screen]').forEach((s) => { s.hidden = s.dataset.screen !== screen; });
    $(`#bonus-panel [data-screen="${screen}"] button`)?.focus();
  }

  hidePanel() {
    $('#bonus-panel').hidden = true;
    this.screen = null;
  }

  enter() {
    this.active = true;
    this.roundStarted = false;
    document.body.classList.add('bonus');
    $('#win').hidden = true;
    $('#privacy-hidden-note').hidden = true;
    this.showPanel('privacy'); // no camera request until the player agrees (Req 2.2)
  }

  showError(code) {
    const { t, UI } = this.ctx;
    $('#bonus-error-text').textContent = t(UI[`err_${code}`] ?? UI.err_loadfailed);
    this.showPanel('error'); // only "返回" is offered (Req 3.2, 3.3)
  }

  // ---------- camera ----------

  async startCamera() {
    const { t, UI } = this.ctx;
    this.showPanel('loading');
    $('#bonus-loading-text').textContent = t(UI.loadingCamera);
    try {
      await this.tracker.start((frame) => this.onFrame(frame), (stage) => {
        $('#bonus-loading-text').textContent = t(stage === 'model' ? UI.loadingModel : UI.loadingCamera);
      });
    } catch (e) {
      this.tracker.stop();
      if (this.active) this.showError(e.code ?? 'loadfailed');
      return;
    }
    if (!this.active) { this.tracker.stop(); return; } // player left while loading
    this.hidePanel();
    $('#cam-wrap').hidden = false;

    const puzzle = this.ctx.ensurePuzzle();
    puzzle.setInputMode('gesture'); // mouse, touch, keyboard can no longer move pieces (Req 3.4)
    this.input ??= new GestureInput({
      puzzle,
      stage: $('#stage'),
      cursor: $('#ghost-hand'),
      listener: {
        onHand: (seen) => this.onHand(seen),
        onGesture: (g) => this.onGesture(g),
        onLost: () => this.ctx.toast(t(UI.handLost), true),
      },
    });
    this.input.reset();
    this.onHand(false);

    if (this.roundStarted) return; // resuming after the page was hidden: keep the puzzle as it is
    await this.ctx.show('game');
    puzzle.assemble();
    this.ctx.prepareHud({ bonus: true });
    this.startTutorial();
  }

  pauseForHidden() {
    this.tracker.stop();
    this.input?.reset();
    $('#cam-wrap').hidden = true;
    $('#hand-status').hidden = true;
    $('#privacy-hidden-note').hidden = false;
    this.showPanel('privacy');
  }

  onFrame(frame) {
    if (!this.active || !this.input) return;
    this.input.handle(frame);
    if (DEBUG) this.renderDebug(frame);
  }

  // ?debug: live numbers for tuning on real hardware (Req 6.9)
  renderDebug(frame) {
    if (!this.debugEl) {
      this.debugEl = document.createElement('pre');
      this.debugEl.className = 'gesture-debug';
      document.body.appendChild(this.debugEl);
    }
    const d = this.input.debug ?? {};
    const puzzle = this.ctx.ensurePuzzle(false);
    const dist = puzzle?.heldDistance();
    const f = (v, n = 2) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(n) : '–');
    this.debugEl.textContent = [
      `hand      ${frame.landmarks ? 'yes' : 'no'}`,
      `ratio     ${f(d.ratio)}   grab<${GRAB_RATIO} open>${OPENING_RATIO.toFixed(3)} release>${RELEASE_RATIO}`,
      `state     ${d.pinched ? 'PINCHED' : 'open'}${d.frozen ? '  (frozen at anchor)' : ''}`,
      `holding   ${this.input.holding ?? '–'}`,
      `distance  ${f(dist, 0)} / snap ${puzzle?.snapDistance() ?? '–'}${puzzle?.isInRange() ? '  READY' : ''}`,
      `fps       ${f(this.tracker.fps, 0)}`,
    ].join('\n');
  }

  onHand(seen) {
    $('#hand-status').hidden = seen || !this.tracker.isOn();
    if (seen && this.tutorialStep === 0) this.advanceTutorial();
  }

  onGesture(g) {
    if ((g === 'grab' && this.tutorialStep === 1) || (g === 'release' && this.tutorialStep === 2)) this.advanceTutorial();
  }

  // ---------- tutorial (Req 4) ----------

  startTutorial() {
    this.tutorialStep = 0;
    $('#tutorial').hidden = false;
    this.renderTutorial();
    if (this.input?.handVisible) this.advanceTutorial();
  }

  renderTutorial() {
    document.querySelectorAll('#tutorial li').forEach((li) => {
      const i = STEPS.indexOf(li.dataset.step);
      li.classList.toggle('done', i < this.tutorialStep);
      li.classList.toggle('current', i === this.tutorialStep);
    });
  }

  advanceTutorial() {
    this.tutorialStep++;
    this.renderTutorial();
    this.ctx.sound.bell(392 + this.tutorialStep * 60, 0.12);
    if (this.tutorialStep >= STEPS.length) setTimeout(() => this.finishTutorial(), 500);
  }

  async finishTutorial() {
    if (this.tutorialStep < 0 || this.roundStarted || !this.active) return;
    this.tutorialStep = -1;
    $('#tutorial').hidden = true;
    this.ctx.toast(this.ctx.t(this.ctx.UI.tutDone));
    this.roundStarted = true;
    this.input?.reset();
    await this.ctx.startRound({ bonus: true }); // assembled hall → ghost-wind scatter (Req 7.1)
  }

  // ---------- end ----------

  win(attempts) {
    this.tracker.stop(); // camera off before the celebration (Req 7.3)
    this.input?.reset();
    $('#cam-wrap').hidden = true;
    $('#hand-status').hidden = true;
    const { sound, embers, fmt, elapsedMs } = this.ctx;
    $('#bonus-win-time').textContent = fmt(elapsedMs());
    $('#bonus-win-moves').textContent = attempts;
    sound.fanfare();
    embers.celebrate();
    setTimeout(() => {
      if (!this.active) return;
      $('#bonus-win').hidden = false;
      $('#btn-bonus-again').focus();
    }, 1600);
  }

  cleanup() {
    this.tracker.stop();
    this.input?.reset();
    this.ctx.ensurePuzzle(false)?.setInputMode('pointer');
    ['#cam-wrap', '#hand-status', '#tutorial', '#bonus-win'].forEach((s) => { $(s).hidden = true; });
    this.debugEl?.remove();
    this.debugEl = null;
    this.hidePanel();
    $('#ghost-hand').classList.remove('visible', 'pinched', 'hover');
    document.body.classList.remove('bonus');
    this.active = false;
    this.roundStarted = false;
    this.tutorialStep = -1;
  }

  exit() {
    if (!this.active) return;
    this.cleanup();
    this.ctx.goTitle();
  }

  // ---------- test seam ----------

  useFakeTracker() {
    const fake = {
      on: false,
      listener: null,
      async start(onFrame) { this.on = true; this.listener = onFrame; },
      stop() { this.on = false; },
      isOn() { return this.on; },
      emit(frame) { if (this.on) this.listener(frame); },
    };
    this.tracker.stop();
    this.tracker = fake;
    this.fake = fake;
  }
}
