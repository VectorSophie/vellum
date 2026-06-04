// main.js — wire the jamo pipeline together with a bare, throwaway display.
//
// Flow:  canvas strokes -> StrokeCapture (idle flush) -> recognize()
//        -> audio.onJamo (immediate) -> Composer -> display
//        -> audio.onSyllable when a CV block seals.
//
// The display here is intentionally minimal DOM. Later ("A"), the same
// recognized-jamo / composed-syllable stream feeds the tetohira visual stack
// instead — nothing in the modules below changes for that.

import { StrokeCapture } from './strokes.js';
import { recognize } from './recognizer.js';
import { Composer } from './compose.js';
import { JamoAudio } from './audio.js';

const canvas = document.getElementById('draw');
const elSyllable = document.getElementById('syllable');
const elLast = document.getElementById('last-jamo');
const elLog = document.getElementById('log');

// Size the canvas to its CSS box.
function sizeCanvas() {
  const r = canvas.getBoundingClientRect();
  canvas.width = r.width;
  canvas.height = r.height;
}
sizeCanvas();
window.addEventListener('resize', sizeCanvas);

const composer = new Composer();
const audio = new JamoAudio();

function log(msg) {
  if (!elLog) return;
  const p = document.createElement('div');
  p.textContent = msg;
  elLog.prepend(p);
  while (elLog.childElementCount > 12) elLog.lastChild.remove();
}

const capture = new StrokeCapture(canvas, {
  idleMs: 600,
  onStrokeStart: () => audio.resume(), // unlock audio on first gesture
  onFlush: (strokes) => {
    const result = recognize(strokes);
    if (!result) {
      log('· unrecognized (' + strokes.length + ' stroke(s))');
      return;
    }
    const { char, confidence } = result;
    audio.onJamo(char);
    elLast.textContent = char;

    const { display, syllable } = composer.accept(char);
    if (display) elSyllable.textContent = display;
    if (syllable) audio.onSyllable(syllable);

    log(char + '  (' + (confidence * 100).toFixed(0) + '%)' + (syllable ? '  → ' + syllable : ''));
  },
});

// Expose for the Playwright harness: simulate a flush without real pointer
// events, and read current state.
window.__jamo = {
  recognize,
  feed(strokes) { capture.onFlush(strokes); },
  state() { return { syllable: elSyllable.textContent, last: elLast.textContent }; },
};
