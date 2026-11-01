// Turns hand-tracker frames into puzzle drags with a ghost-hand cursor.
// Spec: gesture-bonus-level, Requirements 5 and 6.

import { mapToUnit, OneEuro, OPENING_RATIO, PinchMachine, pinchPoint, pinchRatio } from './gesture.js';

export const HAND_LOST_MS = 1000;
const RESET_FILTER_AFTER_MS = 300; // after a gap, jump to the hand instead of gliding there

export class GestureInput {
  // puzzle: Puzzle; stage: the puzzle <svg>; cursor: the #ghost-hand element.
  // listener: { onHand(seen), onGesture('grab' | 'release'), onLost() } – all optional.
  constructor({ puzzle, stage, cursor, listener = {} }) {
    Object.assign(this, { puzzle, stage, cursor, listener });
    this.machine = new PinchMachine();
    this.fx = new OneEuro();
    this.fy = new OneEuro();
    this.lastSeen = null;
    this.handVisible = false;
    this.holding = null;
    this.pos = null;
  }

  reset() {
    if (this.holding) this.puzzle.cancelDrag();
    this.holding = null;
    this.machine.reset();
    this.fx.reset();
    this.fy.reset();
    this.lastSeen = null;
    this.setHand(false);
  }

  setHand(seen) {
    if (seen === this.handVisible) return;
    this.handVisible = seen;
    this.cursor.classList.toggle('visible', seen);
    this.listener.onHand?.(seen);
  }

  handle({ landmarks, t }) {
    if (!landmarks) {
      this.noHand(t);
      return;
    }
    if (this.lastSeen === null || t - this.lastSeen > RESET_FILTER_AFTER_MS) {
      this.fx.reset();
      this.fy.reset();
    }
    this.lastSeen = t;
    this.setHand(true);

    // cursor position on screen
    const unit = mapToUnit(pinchPoint(landmarks));
    const r = this.stage.getBoundingClientRect();
    const x = this.fx.filter(r.left + unit.x * r.width, t / 1000);
    const y = this.fy.filter(r.top + unit.y * r.height, t / 1000);
    this.pos = { x, y };
    this.cursor.style.transform = `translate(${x}px, ${y}px)`;

    const ratio = pinchRatio(landmarks);
    const event = this.machine.update(ratio);
    const opening = ratio > OPENING_RATIO;
    this.debug = { ratio, pinched: this.machine.pinched, frozen: !!this.holding && opening };
    if (this.holding) {
      // Follow the hand only while the pinch is firm; once it starts opening, the piece
      // stays at the anchor, and that is where it will be dropped (Req 6.4a).
      if (!opening) this.anchor = { x, y };
      this.puzzle.dragTo(this.anchor.x, this.anchor.y);
    }
    const hover = this.holding ? null : this.puzzle.pieceAt(x, y);

    if (event) this.listener.onGesture?.(event);
    if (event === 'grab' && hover && this.puzzle.beginDrag(hover, x, y)) {
      this.holding = hover; // grabbing empty space does nothing (Req 6.2)
      this.anchor = { x, y };
    } else if (event === 'release' && this.holding) {
      this.holding = null;
      this.puzzle.endDrag(); // normal drop rules at the anchor position (Req 6.4)
    }
    // the drop may have been rejected and the puzzle cancelled the drag itself
    if (this.holding && !this.puzzle.isDragging()) this.holding = null;

    this.cursor.classList.toggle('pinched', this.machine.pinched);
    this.cursor.classList.toggle('hover', !this.holding && !!hover);
    this.cursor.classList.toggle('ready', !!this.holding && this.puzzle.isInRange()); // Req 6.4b
  }

  noHand(t) {
    this.setHand(false);
    if (this.holding && this.lastSeen !== null && t - this.lastSeen > HAND_LOST_MS) {
      this.puzzle.cancelDrag(); // back to the tray, no attempt counted (Req 6.6)
      this.holding = null;
      this.machine.reset();
      this.listener.onLost?.();
    }
  }
}
