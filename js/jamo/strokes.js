// strokes.js — capture drawn strokes on a canvas and emit raw stroke events.
//
// Two events, no recognition logic of its own:
//   onStroke(stroke) — fired immediately on each pen-up, with the completed
//                      stroke (array of [x, y] points). Drives live, per-stroke
//                      incremental recognition.
//   onIdle()         — fired after idleMs with no drawing. This is the rhythm
//                      gap that ends a syllable, the same forward-only cadence
//                      as tetohira (you pause between syllables).
//
// Draws ink on the canvas purely as input feedback. Ink is cleared on idle.

export class StrokeCapture {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.idleMs = opts.idleMs ?? 600;
    this.onStroke = opts.onStroke || (() => {});
    this.onIdle = opts.onIdle || (() => {});
    this.onStrokeStart = opts.onStrokeStart || (() => {});

    this._current = null;   // stroke in progress
    this._drawing = false;
    this._idleTimer = null;
    this._anyThisSyllable = false; // have we drawn since the last idle?

    this._onDown = this._down.bind(this);
    this._onMove = this._move.bind(this);
    this._onUp = this._up.bind(this);

    canvas.addEventListener('pointerdown', this._onDown);
    canvas.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);

    this._setupInk();
  }

  _setupInk() {
    this.ctx.lineWidth = 8;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#1c120a';
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  _down(e) {
    e.preventDefault();
    if (this._idleTimer) { clearTimeout(this._idleTimer); this._idleTimer = null; }
    if (!this._anyThisSyllable) this.onStrokeStart();
    this._drawing = true;
    this._current = [this._pos(e)];
    this.ctx.beginPath();
    this.ctx.moveTo(this._current[0][0], this._current[0][1]);
  }

  _move(e) {
    if (!this._drawing) return;
    const p = this._pos(e);
    this._current.push(p);
    this.ctx.lineTo(p[0], p[1]);
    this.ctx.stroke();
  }

  _up() {
    if (!this._drawing) return;
    this._drawing = false;
    const stroke = this._current;
    this._current = null;
    if (!stroke || stroke.length === 0) return;
    this._anyThisSyllable = true;
    this.onStroke(stroke);
    this._idleTimer = setTimeout(() => this._idle(), this.idleMs);
  }

  _idle() {
    this._idleTimer = null;
    if (!this._anyThisSyllable) return;
    this._anyThisSyllable = false;
    this.clearInk();
    this.onIdle();
  }

  clearInk() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._onDown);
    this.canvas.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    if (this._idleTimer) clearTimeout(this._idleTimer);
  }
}
