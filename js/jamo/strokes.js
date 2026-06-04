// strokes.js — capture drawn strokes on a canvas and flush them per jamo.
//
// A "jamo" is one or more strokes drawn close together in time. After the pen
// lifts and no new stroke begins within IDLE_MS, the accumulated stroke-set is
// flushed to onFlush(strokes) — this is the rhythm gap that separates jamo,
// the same forward-only cadence as tetohira.
//
// No recognition/audio/compose deps. Emits raw [x, y] point arrays; draws ink
// on the canvas purely as input feedback.

export class StrokeCapture {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.idleMs = opts.idleMs ?? 600;
    this.onFlush = opts.onFlush || (() => {});
    this.onStrokeStart = opts.onStrokeStart || (() => {});

    this._strokes = [];     // accumulated strokes for the current jamo
    this._current = null;   // stroke in progress
    this._drawing = false;
    this._idleTimer = null;

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
    if (this._strokes.length === 0) this.onStrokeStart();
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
    if (this._current && this._current.length > 0) this._strokes.push(this._current);
    this._current = null;
    this._idleTimer = setTimeout(() => this._flush(), this.idleMs);
  }

  _flush() {
    this._idleTimer = null;
    if (this._strokes.length === 0) return;
    const strokes = this._strokes;
    this._strokes = [];
    this.clearInk();
    this.onFlush(strokes);
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
