// Drag-and-drop reassembly of the hall. Each part must snap onto its own ghost
// outline, and only after the parts that structurally carry it are in place.

import { buildPart, buildLanterns, el, PAINT_ORDER, STAGE } from './hall.js';
import { scatterLayout } from './scatter.js';

// How close (stage units) a dropped piece must be to its home to snap in. A hand in the
// air is less precise than a mouse, so gesture input gets a wider radius (Req 6.8).
export const SNAP_DISTANCE = { pointer: 90, gesture: 160 };
const CELL_MARGIN = 10; // gap between a loose piece and its cell border
const MAX_JITTER = 24; // largest random offset inside a cell
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
    this.rng = Math.random; // replaceable in tests (Req 9.6)
    this.lastLayout = null;
    this.inputMode = 'pointer';
    this.drag = null;
    this.animTokens = new Map();
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
      wrap.insertBefore(el('rect', { class: 'hit' }), part);
      this.nodes[piece.id] = wrap;
      this.state.set(piece.id, { cx: 0, cy: 0, w: 0, h: 0, dx: 0, dy: 0, s: 1, rot: 0 });
      this.bindPiece(piece, wrap);
    }
    this.measure();
  }

  // Bounding boxes can only be measured while the SVG is rendered. If the puzzle was
  // built inside a hidden scene every box is 0×0, so measure again before it is used.
  measure() {
    for (const piece of this.pieces) {
      const st = this.state.get(piece.id);
      if (st.w > 0) continue;
      const wrap = this.nodes[piece.id];
      const box = wrap.querySelector(`.part-${piece.id}`).getBBox();
      if (!box.width) continue; // still hidden; try again later
      Object.assign(st, { cx: box.x + box.width / 2, cy: box.y + box.height / 2, w: box.width, h: box.height });
      const hit = wrap.querySelector('.hit');
      for (const [k, v] of Object.entries({ x: box.x - 30, y: box.y - 30, width: box.width + 60, height: box.height + 60 })) hit.setAttribute(k, v);
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
    // A newer animation of the same piece cancels this one, so a return-to-tray
    // tween cannot fight a drag that started while it was running.
    const token = {};
    this.animTokens.set(id, token);
    return new Promise((resolve) => {
      const step = (now) => {
        if (this.animTokens.get(id) !== token) { resolve(); return; }
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

  // Inner box of tray cell `slot`, in stage units (the drawn cell minus a margin).
  cellBox(slot) {
    const { tray } = this;
    const cellW = tray.w / tray.cols;
    const x = (slot % tray.cols) * cellW + 20 + CELL_MARGIN;
    const y = tray.top + Math.floor(slot / tray.cols) * tray.rowH + 8 + CELL_MARGIN;
    return { x, y, w: cellW - 40 - 2 * CELL_MARGIN, h: tray.rowH - 16 - 2 * CELL_MARGIN };
  }

  trayTarget(id) {
    const st = this.state.get(id);
    const box = this.cellBox(st.traySlot);
    // Size of the piece's bounding box once tilted by st.rot, at scale 1.
    const a = Math.abs(st.rot) * Math.PI / 180;
    const rw = st.w * Math.cos(a) + st.h * Math.sin(a);
    const rh = st.w * Math.sin(a) + st.h * Math.cos(a);
    const s = Math.min(box.w / rw, box.h / rh, 0.9);
    // Random offset inside the room left over in the cell (Req 9.3).
    const jitter = st.jitter ?? { x: 0, y: 0 };
    const roomX = Math.min((box.w - rw * s) / 2, MAX_JITTER);
    const roomY = Math.min((box.h - rh * s) / 2, MAX_JITTER);
    const cx = box.x + box.w / 2 + jitter.x * roomX;
    const cy = box.y + box.h / 2 + jitter.y * roomY;
    return { dx: cx - st.cx, dy: cy - st.cy, s, rot: st.rot };
  }

  // Blow the assembled hall apart into the tray (the "ghost wind").
  async scatter() {
    this.measure();
    this.placed.clear();
    this.attempts = 0;
    this.lanterns.classList.remove('lit', 'hung');
    const layout = scatterLayout(this.pieces.map((p) => p.id), this.lastLayout?.order, this.rng);
    this.lastLayout = layout;
    for (const [id, p] of Object.entries(layout.pieces)) {
      const st = this.state.get(id);
      st.traySlot = p.slot;
      st.rot = p.tilt;
      st.jitter = p.jitter;
      this.looseLayer.appendChild(this.nodes[id]);
      this.nodes[id].classList.remove('placed');
    }
    // a little upward lift first, as if the wind picks the timbers up
    const later = (i, ms) => new Promise((r) => setTimeout(r, i * ms));
    await Promise.all(layout.launch.map((id, i) => later(i, 70).then(() => {
      const { lift, tilt } = layout.pieces[id];
      return this.animate(id, { dx: lift.dx, dy: lift.dy, s: 1.04, rot: tilt }, 450);
    })));
    await Promise.all(layout.launch.map((id, i) => later(i, 90)
      .then(() => this.animate(id, this.trayTarget(id), 900))));
    this.enabled = true;
  }

  toStageXY(clientX, clientY) {
    const pt = this.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(this.svg.getScreenCTM().inverse());
  }

  // ---------- drag API, shared by pointer and gesture input ----------

  // 'pointer' (mouse, touch, keyboard) or 'gesture' (hidden level: only GestureInput may drag).
  setInputMode(mode) {
    if (this.drag) this.cancelDrag();
    this.inputMode = mode;
    this.svg.classList.toggle('gesture-mode', mode === 'gesture');
  }

  // Unplaced loose piece under a screen point, or null.
  pieceAt(clientX, clientY) {
    if (!this.enabled) return null;
    const hit = document.elementFromPoint(clientX, clientY);
    const node = hit?.closest?.('.piece');
    if (!node || node.parentNode !== this.looseLayer) return null;
    const { id } = node.dataset;
    return this.placed.has(id) ? null : id;
  }

  isDragging() {
    return !!this.drag;
  }

  beginDrag(id, clientX, clientY) {
    if (!this.enabled || this.drag || this.placed.has(id)) return false;
    const p = this.toStageXY(clientX, clientY);
    const st = this.state.get(id);
    this.drag = { id, ox: st.cx + st.dx - p.x, oy: st.cy + st.dy - p.y };
    const node = this.nodes[id];
    this.looseLayer.appendChild(node); // bring to front
    node.classList.add('dragging');
    this.ghosts[id].classList.add('wanted');
    this.animate(id, { s: 1, rot: 0 }, 220); // also stops any return-to-tray animation
    this.sound.knock();
    return true;
  }

  dragTo(clientX, clientY) {
    if (!this.drag) return;
    const { id } = this.drag;
    const p = this.toStageXY(clientX, clientY);
    const st = this.state.get(id);
    // shrink the grab offset over time so the piece centres under the finger / cursor
    this.drag.ox *= 0.9;
    this.drag.oy *= 0.9;
    st.dx = p.x + this.drag.ox - st.cx;
    st.dy = p.y + this.drag.oy - st.cy;
    this.apply(id);
    this.ghosts[id].classList.toggle('in-range', this.isInRange()); // "ready to drop" (Req 6.4b)
  }

  snapDistance() {
    return SNAP_DISTANCE[this.inputMode] ?? SNAP_DISTANCE.pointer;
  }

  // Distance (stage units) from the held piece to its home, or null when nothing is held.
  heldDistance() {
    if (!this.drag) return null;
    const st = this.state.get(this.drag.id);
    return Math.hypot(st.dx, st.dy);
  }

  isInRange() {
    const d = this.heldDistance();
    return d !== null && d < this.snapDistance();
  }

  finishDrag() {
    const { id } = this.drag;
    this.drag = null;
    this.nodes[id].classList.remove('dragging');
    this.ghosts[id].classList.remove('wanted', 'in-range');
    return id;
  }

  // Drop the held piece under the normal rules (snap, supports, messages, attempts).
  endDrag() {
    if (!this.drag) return;
    const id = this.finishDrag();
    this.drop(this.pieces.find((p) => p.id === id));
  }

  // Put the held piece back in its tray cell without counting an attempt (hand lost, mode change).
  cancelDrag() {
    if (!this.drag) return;
    const id = this.finishDrag();
    this.animate(id, this.trayTarget(id), 500);
  }

  bindPiece(piece, node) {
    let pointerId = null;
    // Move/up are tracked on window: re-parenting the node to bring it to the
    // front would otherwise drop pointer capture in some browsers.
    const move = (e) => {
      if (e.pointerId === pointerId) this.dragTo(e.clientX, e.clientY);
    };
    const end = (e) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (this.drag?.id === piece.id) this.endDrag();
    };
    node.addEventListener('pointerdown', (e) => {
      if (this.inputMode !== 'pointer' || pointerId !== null) return;
      if (!this.beginDrag(piece.id, e.clientX, e.clientY)) return;
      e.preventDefault();
      pointerId = e.pointerId;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });
    node.addEventListener('keydown', (e) => {
      if (this.inputMode !== 'pointer' || !this.enabled || this.placed.has(piece.id)) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.tryPlace(piece);
      }
    });
  }

  drop(piece) {
    const st = this.state.get(piece.id);
    const near = Math.hypot(st.dx, st.dy) < this.snapDistance();
    if (near) {
      this.tryPlace(piece);
      return;
    }
    // dropped onto some other part's outline?
    const x = st.cx + st.dx;
    const y = st.cy + st.dy;
    const wrongSlot = this.pieces.find((p) => p.id !== piece.id && !this.placed.has(p.id)
      && Math.hypot(this.state.get(p.id).cx - x, this.state.get(p.id).cy - y) < this.snapDistance());
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
    this.measure();
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
