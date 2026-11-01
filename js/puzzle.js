// Drag-and-drop reassembly of the hall. Each part must snap onto its own ghost
// outline, and only after the parts that structurally carry it are in place.

import { buildPart, buildLanterns, el, PAINT_ORDER, STAGE } from './hall.js';

const SNAP_DISTANCE = 90; // stage units
const VIEW_TOP = 80; // nothing is drawn above the chiwen tips (~y 96)
// Landscape: 3×3 tray under the hall. Portrait phones: 2 columns of taller cells
// so the pieces are big enough to grab with a finger.
const TRAY_LAYOUTS = {
  landscape: { top: 930, rows: 3, cols: 3, rowH: 160, w: STAGE.w },
  portrait: { top: 930, rows: 5, cols: 2, rowH: 300, w: STAGE.w },
};
const pickLayout = () => (window.innerHeight > window.innerWidth * 1.2 ? 'portrait' : 'landscape');

const ease = (t) => 1 - Math.pow(1 - t, 3);

export function missingSupports(piece, placed) {
  return piece.needs.filter((id) => !placed.has(id));
}

export class Puzzle {
  constructor(svg, { pieces, sound, embers, onPlaced, onRejected, onWin }) {
    this.svg = svg;
    this.pieces = pieces;
    this.sound = sound;
    this.embers = embers;
    this.onPlaced = onPlaced;
    this.onRejected = onRejected;
    this.onWin = onWin;
    this.placed = new Set();
    this.state = new Map();
    this.attempts = 0;
    this.enabled = false;
    this.build();
  }

  build() {
    const svg = this.svg;
    svg.innerHTML = '';
    svg.appendChild(el('defs', {}, [
      el('filter', { id: 'glow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, [
        el('feGaussianBlur', { stdDeviation: '6', result: 'b' }),
        el('feMerge', {}, [el('feMergeNode', { in: 'b' }), el('feMergeNode', { in: 'SourceGraphic' })]),
      ]),
    ]));
    this.trayLayer = svg.appendChild(el('g', { class: 'tray' }));
    this.layoutTray();
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.relayout(), 200);
    });
    this.ghostLayer = svg.appendChild(el('g', { class: 'ghosts' }));
    this.placedLayers = {};
    for (const id of PAINT_ORDER) this.placedLayers[id] = svg.appendChild(el('g', { class: `slot slot-${id}` }));
    this.lanterns = svg.appendChild(buildLanterns());
    this.looseLayer = svg.appendChild(el('g', { class: 'loose' }));

    this.ghosts = {};
    this.nodes = {};
    for (const piece of this.pieces) {
      const ghost = buildPart(piece.id);
      ghost.classList.add('ghost');
      ghost.dataset.id = piece.id;
      this.ghostLayer.appendChild(ghost);
      this.ghosts[piece.id] = ghost;

      const wrap = el('g', { class: 'piece', tabindex: '0', role: 'button', 'data-id': piece.id });
      const part = buildPart(piece.id);
      wrap.appendChild(part);
      this.placedLayers[piece.id].appendChild(wrap);
      const box = part.getBBox();
      wrap.insertBefore(el('rect', {
        x: box.x - 30, y: box.y - 30, width: box.width + 60, height: box.height + 60, class: 'hit',
      }), part);
      this.nodes[piece.id] = wrap;
      this.state.set(piece.id, { cx: box.x + box.width / 2, cy: box.y + box.height / 2, w: box.width, h: box.height, dx: 0, dy: 0, s: 1, rot: 0 });
      this.bindPiece(piece, wrap);
    }
  }

  apply(id) {
    const st = this.state.get(id);
    this.nodes[id].setAttribute('transform',
      `translate(${st.cx + st.dx} ${st.cy + st.dy}) rotate(${st.rot}) scale(${st.s}) translate(${-st.cx} ${-st.cy})`);
  }

  animate(id, to, ms = 600) {
    const st = this.state.get(id);
    const from = { dx: st.dx, dy: st.dy, s: st.s, rot: st.rot };
    const t0 = performance.now();
    return new Promise((resolve) => {
      const step = (now) => {
        const k = ease(Math.min(1, (now - t0) / ms));
        for (const key of Object.keys(to)) st[key] = from[key] + (to[key] - from[key]) * k;
        this.apply(id);
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  layoutTray() {
    this.layoutName = pickLayout();
    const tray = TRAY_LAYOUTS[this.layoutName];
    this.tray = tray;
    this.svg.setAttribute('viewBox', `0 ${VIEW_TOP} ${STAGE.w} ${tray.top + tray.rows * tray.rowH + 10 - VIEW_TOP}`);
    this.trayLayer.innerHTML = '';
    for (let r = 0; r < tray.rows; r++) {
      for (let c = 0; c < tray.cols; c++) {
        this.trayLayer.appendChild(el('rect', {
          x: c * (tray.w / tray.cols) + 20, y: tray.top + r * tray.rowH + 8,
          width: tray.w / tray.cols - 40, height: tray.rowH - 16, rx: 22, class: 'tray-cell',
        }));
      }
    }
  }

  // Orientation changed: rebuild the tray and slide loose pieces into the new cells.
  relayout() {
    if (pickLayout() === this.layoutName) return;
    this.layoutTray();
    for (const piece of this.pieces) {
      if (!this.placed.has(piece.id) && this.nodes[piece.id].parentNode === this.looseLayer) {
        this.animate(piece.id, this.trayTarget(piece.id), 400);
      }
    }
  }

  trayTarget(id) {
    const st = this.state.get(id);
    const slot = st.traySlot;
    const { tray } = this;
    const cellW = tray.w / tray.cols;
    const cx = (slot % tray.cols) * cellW + cellW / 2;
    const cy = tray.top + Math.floor(slot / tray.cols) * tray.rowH + tray.rowH / 2;
    const s = Math.min((cellW - 90) / st.w, (tray.rowH - 50) / st.h, 0.9);
    return { dx: cx - st.cx, dy: cy - st.cy, s, rot: st.rot };
  }

  // Blow the assembled hall apart into the tray (the "ghost wind").
  async scatter() {
    this.placed.clear();
    this.attempts = 0;
    this.lanterns.classList.remove('lit', 'hung');
    const order = this.pieces.map((p) => p.id).sort(() => Math.random() - 0.5);
    order.forEach((id, i) => {
      const st = this.state.get(id);
      st.traySlot = i;
      st.rot = (Math.random() - 0.5) * 16;
      this.looseLayer.appendChild(this.nodes[id]);
      this.nodes[id].classList.remove('placed');
    });
    // a little upward lift first, as if the wind picks the timbers up
    await Promise.all(order.map((id, i) => new Promise((r) => setTimeout(r, i * 70))
      .then(() => this.animate(id, { dy: -40 - Math.random() * 60, s: 1.04, rot: this.state.get(id).rot, dx: (Math.random() - 0.5) * 80 }, 450))));
    await Promise.all(order.map((id, i) => new Promise((r) => setTimeout(r, i * 90))
      .then(() => this.animate(id, this.trayTarget(id), 900))));
    this.enabled = true;
  }

  toStage(evt) {
    const pt = this.svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(this.svg.getScreenCTM().inverse());
  }

  bindPiece(piece, node) {
    let drag = null;
    // Move/up are tracked on window: re-parenting the node to bring it to the
    // front would otherwise drop pointer capture in some browsers.
    const move = (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const p = this.toStage(e);
      const st = this.state.get(piece.id);
      // shrink the offset as the piece grows so it stays under the finger
      drag.ox *= 0.9;
      drag.oy *= 0.9;
      st.dx = p.x + drag.ox - st.cx;
      st.dy = p.y + drag.oy - st.cy;
      this.apply(piece.id);
    };
    const end = (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      drag = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      node.classList.remove('dragging');
      this.ghosts[piece.id].classList.remove('wanted');
      this.drop(piece);
    };
    node.addEventListener('pointerdown', (e) => {
      if (!this.enabled || drag || this.placed.has(piece.id)) return;
      e.preventDefault();
      const p = this.toStage(e);
      const st = this.state.get(piece.id);
      drag = { pointerId: e.pointerId, ox: st.cx + st.dx - p.x, oy: st.cy + st.dy - p.y };
      this.looseLayer.appendChild(node); // bring to front
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      node.classList.add('dragging');
      this.ghosts[piece.id].classList.add('wanted');
      this.animate(piece.id, { s: 1, rot: 0 }, 220); // position stays under pointer control
      this.sound.knock();
    });
    node.addEventListener('keydown', (e) => {
      if (!this.enabled || this.placed.has(piece.id)) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.tryPlace(piece);
      }
    });
  }

  drop(piece) {
    const st = this.state.get(piece.id);
    const near = Math.hypot(st.dx, st.dy) < SNAP_DISTANCE;
    if (near) {
      this.tryPlace(piece);
      return;
    }
    // dropped onto some other part's outline?
    const x = st.cx + st.dx;
    const y = st.cy + st.dy;
    const wrongSlot = this.pieces.find((p) => p.id !== piece.id && !this.placed.has(p.id)
      && Math.hypot(this.state.get(p.id).cx - x, this.state.get(p.id).cy - y) < SNAP_DISTANCE);
    if (wrongSlot) {
      this.attempts++;
      this.sound.buzz();
      this.onRejected?.(piece, null);
    }
    this.animate(piece.id, this.trayTarget(piece.id), 500);
  }

  tryPlace(piece) {
    const missing = missingSupports(piece, this.placed);
    this.attempts++;
    if (missing.length) {
      this.sound.buzz();
      this.nodes[piece.id].classList.add('shake');
      setTimeout(() => this.nodes[piece.id].classList.remove('shake'), 500);
      this.onRejected?.(piece, missing);
      this.animate(piece.id, this.trayTarget(piece.id), 500);
      return false;
    }
    this.animate(piece.id, { dx: 0, dy: 0, s: 1, rot: 0 }, 260).then(() => {
      this.placedLayers[piece.id].appendChild(this.nodes[piece.id]);
      this.nodes[piece.id].classList.add('placed');
      this.ghosts[piece.id].classList.add('filled');
      this.sparkAt(piece.id);
    });
    this.placed.add(piece.id);
    if (piece.id === 'lowerBrackets') this.lanterns.classList.add('hung');
    this.sound.knock();
    this.sound.bell(330 + this.placed.size * 30, 0.12);
    this.onPlaced?.(piece, this.placed.size);
    if (this.placed.size === this.pieces.length) {
      this.enabled = false;
      setTimeout(() => {
        this.lanterns.classList.add('lit');
        this.onWin?.(this.attempts);
      }, 700);
    }
    return true;
  }

  sparkAt(id) {
    const st = this.state.get(id);
    const m = this.svg.getScreenCTM();
    const rect = this.embers.canvas.getBoundingClientRect();
    this.embers.burst(m.a * st.cx + m.e - rect.left, m.d * st.cy + m.f - rect.top, 30);
  }

  // Suggest a piece that can be placed right now.
  hint() {
    const next = this.pieces.find((p) => !this.placed.has(p.id) && !missingSupports(p, this.placed).length);
    if (!next) return null;
    const node = this.nodes[next.id];
    const ghost = this.ghosts[next.id];
    node.classList.add('hinted');
    ghost.classList.add('wanted');
    setTimeout(() => { node.classList.remove('hinted'); ghost.classList.remove('wanted'); }, 2200);
    return next;
  }

  // Reset to the fully assembled hall (used for the intro reveal and replays).
  assemble() {
    this.enabled = false;
    this.lanterns.classList.add('hung');
    for (const piece of this.pieces) {
      const st = this.state.get(piece.id);
      Object.assign(st, { dx: 0, dy: 0, s: 1, rot: 0 });
      this.placedLayers[piece.id].appendChild(this.nodes[piece.id]);
      this.nodes[piece.id].classList.add('placed');
      this.ghosts[piece.id].classList.remove('filled');
      this.apply(piece.id);
    }
  }
}
