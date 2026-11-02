// Timeline navigation: pure helpers + the timeline viewer dialog.
// Spec: .kiro/specs/jinci-hall-game, Requirement 9.

// ---------- pure helpers (tested in tools/test.mjs) ----------

// NaN → first milestone; ±Infinity → last / first.
export const clampIndex = (i, n) => (Number.isNaN(i) ? 0 : Math.max(0, Math.min(n - 1, Math.trunc(i))));

// Milestones run from the present (index 0) into the past. Flying to a higher index goes
// further back in time (+1); to a lower index, towards the present (-1).
export const flightDirection = (from, to) => Math.sign(to - from);

export const nextAuto = (index, n) => (index + 1 < n ? index + 1 : null);

// ---------- markers (shared by the travel scene and the viewer) ----------

export function buildMarkers(container, milestones, onPick, labelFor) {
  container.innerHTML = '';
  return milestones.map((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tl-marker';
    b.dataset.index = String(i);
    b.innerHTML = '<span class="tl-dot" aria-hidden="true"></span><span class="tl-year"></span>';
    b.querySelector('.tl-year').textContent = m.year;
    b.setAttribute('aria-label', labelFor(m));
    b.addEventListener('click', (e) => { e.stopPropagation(); onPick(i); });
    container.appendChild(b);
    return b;
  });
}

export function markState(markers, current, visited = null) {
  markers.forEach((b, i) => {
    b.classList.toggle('current', i === current);
    b.classList.toggle('visited', !!visited?.has(i));
    if (i === current) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
}

// ---------- viewer ----------

export class TimelineViewer {
  // els: { dialog, markers, era, text, img, caption, prev, next, close }
  constructor({ milestones, els, t, labelFor, onShow }) {
    Object.assign(this, { milestones, els, t, labelFor, onShow });
    this.index = 0;
    this.opener = null;
    this.markers = buildMarkers(els.markers, milestones, (i) => this.show(i), labelFor);
    els.prev.addEventListener('click', () => this.show(this.index - 1));
    els.next.addEventListener('click', () => this.show(this.index + 1));
    els.close.addEventListener('click', () => this.close());
    els.dialog.addEventListener('click', (e) => { if (e.target === els.dialog) this.close(); });
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;
      const act = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (act) { e.preventDefault(); e.stopPropagation(); this.show(this.index + act); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(); }
    }, true);
  }

  isOpen() {
    return !this.els.dialog.hidden;
  }

  open(index, opener = document.activeElement) {
    this.opener = opener;
    this.els.dialog.hidden = false;
    this.show(index);
    (this.els.next.disabled ? this.els.prev : this.els.next).focus();
  }

  close() {
    if (!this.isOpen()) return;
    this.els.dialog.hidden = true;
    this.opener?.focus?.();
  }

  show(i) {
    const n = this.milestones.length;
    this.index = clampIndex(i, n); // no wrap-around (Req 9.7)
    const m = this.milestones[this.index];
    const { els, t } = this;
    els.era.textContent = t(m.era);
    els.text.textContent = t(m.text);
    els.img.src = m.photo;
    els.img.alt = t(m.photoCaption);
    els.caption.textContent = t(m.photoCaption);
    els.prev.disabled = this.index === 0;
    els.next.disabled = this.index === n - 1;
    markState(this.markers, this.index);
    this.onShow?.(this.index);
  }

  renderTexts() {
    this.markers.forEach((b, i) => b.setAttribute('aria-label', this.labelFor(this.milestones[i])));
    if (this.isOpen()) this.show(this.index);
  }
}
