// 晋祠美景: seasonal photo viewer with previous / next paging.
// Spec: .kiro/specs/jinci-gallery

// ---------- pure helpers (tested in tools/test.mjs) ----------

export const wrap = (i, n) => ((i % n) + n) % n;

export const firstOfSeason = (items, season) => items.findIndex((p) => p.season === season);

export function seasonForMonth(month) {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

// ---------- viewer ----------

const SWIPE_PX = 40;

export class GalleryViewer {
  // els: { dialog, img, caption, season, counter, credit, prev, next, close, tabs, frame }
  constructor({ items, seasons, els, t, labels }) {
    Object.assign(this, { items, seasons, els, t, labels });
    this.index = 0;
    this.opener = null;
    this.buildTabs();
    els.prev.addEventListener('click', () => this.step(-1));
    els.next.addEventListener('click', () => this.step(1));
    els.close.addEventListener('click', () => this.close());
    els.dialog.addEventListener('click', (e) => { if (e.target === els.dialog) this.close(); });
    // Keys are caught on the whole document while the viewer is open (focus may be on
    // <body> after a swipe), and never reach the game behind it (Req 1.4).
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;
      if (e.key === 'Tab') { this.trapTab(e); return; }
      const actions = { ArrowLeft: () => this.step(-1), ArrowRight: () => this.step(1), Escape: () => this.close() };
      const isButtonKey = (e.key === 'Enter' || e.key === ' ') && els.dialog.contains(document.activeElement);
      if (!isButtonKey) e.stopPropagation(); // Enter/Space still activate the focused gallery button
      if (actions[e.key]) { e.preventDefault(); actions[e.key](); }
    }, true);
    let startX = null;
    els.frame.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    els.frame.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) >= SWIPE_PX) this.step(dx < 0 ? 1 : -1);
    });
    els.frame.addEventListener('pointercancel', () => { startX = null; });
    els.img.addEventListener('load', () => els.frame.classList.remove('loading'));
    els.img.addEventListener('error', () => els.frame.classList.remove('loading'));
  }

  // keep Tab inside the dialog while it is open
  trapTab(e) {
    const f = [...this.els.dialog.querySelectorAll('button, a[href]')].filter((x) => x.offsetParent);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    const inside = this.els.dialog.contains(document.activeElement);
    if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
    if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus(); }
  }

  buildTabs() {
    this.tabButtons = this.seasons.map((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gallery-tab';
      b.dataset.season = s.id;
      b.addEventListener('click', () => this.show(firstOfSeason(this.items, s.id)));
      this.els.tabs.appendChild(b);
      return b;
    });
  }

  isOpen() {
    return !this.els.dialog.hidden;
  }

  open(opener = document.activeElement) {
    this.opener = opener;
    const start = firstOfSeason(this.items, seasonForMonth(new Date().getMonth() + 1));
    this.els.dialog.hidden = false;
    this.show(start >= 0 ? start : 0);
    this.els.next.focus();
  }

  close() {
    if (!this.isOpen()) return;
    this.els.dialog.hidden = true;
    this.opener?.focus?.();
  }

  step(delta) {
    this.show(this.index + delta);
  }

  show(i) {
    const n = this.items.length;
    this.index = wrap(i, n);
    const p = this.items[this.index];
    const { els, t } = this;
    const url = new URL(p.file, document.baseURI).href;
    if (els.img.src !== url) {
      els.frame.classList.add('loading');
      els.img.src = p.file;
    }
    els.img.alt = t(p.caption);
    els.caption.textContent = t(p.caption);
    const season = this.seasons.find((s) => s.id === p.season);
    els.season.textContent = `${t(season.name)} · ${p.date}`;
    els.counter.textContent = `${this.index + 1} / ${n}`;
    els.credit.textContent = `${p.author} · ${p.license}`;
    els.credit.href = p.source;
    this.tabButtons.forEach((b) => {
      const on = b.dataset.season === p.season;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    // warm the cache for the neighbours so paging feels instant
    for (const j of [this.index - 1, this.index + 1]) new Image().src = this.items[wrap(j, n)].file;
  }

  // Re-render labels after a language switch.
  renderTexts() {
    this.tabButtons.forEach((b) => {
      const s = this.seasons.find((x) => x.id === b.dataset.season);
      const count = this.items.filter((p) => p.season === s.id).length;
      b.textContent = `${this.t(s.name)} ${count}`;
    });
    this.els.prev.setAttribute('aria-label', this.t(this.labels.prev));
    this.els.next.setAttribute('aria-label', this.t(this.labels.next));
    this.els.close.setAttribute('aria-label', this.t(this.labels.close));
    if (this.isOpen()) this.show(this.index);
  }
}
