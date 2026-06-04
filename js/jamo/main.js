// main.js — wire the incremental jamo pipeline with a bare, throwaway display.
//
// Flow:  canvas strokes -> StrokeCapture (per-stroke + idle)
//        -> IncrementalSegmenter (live jamo segmentation)
//        -> audio (per jamo + on syllable completion) + display.
//
// The display here is intentionally minimal DOM. Later ("A"), the same
// recognized-jamo / composed-syllable stream feeds the tetohira visual stack
// instead — nothing in the modules below changes for that.

import { StrokeCapture } from './strokes.js';
import { recognize, rank } from './recognizer.js';
import { IncrementalSegmenter } from './segment.js';
import { JamoAudio } from './audio.js';

const canvas = document.getElementById('draw');
const elSyllable = document.getElementById('syllable');
const elLast = document.getElementById('last-jamo');
const elLog = document.getElementById('log');

function sizeCanvas() {
  const r = canvas.getBoundingClientRect();
  canvas.width = r.width;
  canvas.height = r.height;
}
sizeCanvas();
window.addEventListener('resize', sizeCanvas);

const audio = new JamoAudio();

function log(msg) {
  if (!elLog) return;
  const p = document.createElement('div');
  p.textContent = msg;
  elLog.prepend(p);
  while (elLog.childElementCount > 12) elLog.lastChild.remove();
}

const segmenter = new IncrementalSegmenter({
  onJamo: (char) => {
    audio.onJamo(char);
    elLast.textContent = char;
    log('jamo ' + char);
  },
  onSyllable: (block) => {
    audio.onSyllable(block);
    log('  → ' + block);
  },
  onDisplay: (str) => { elSyllable.textContent = str; },
});

// Record raw strokes per syllable for offline tuning / fixtures.
const samples = [];   // [{ strokes, jamo, block }]
let curStrokes = [];  // strokes accumulated in the current syllable

const capture = new StrokeCapture(canvas, {
  idleMs: 600,
  onStrokeStart: () => audio.resume(),
  onStroke: (stroke) => {
    curStrokes.push(stroke);
    segmenter.pushStroke(stroke);
  },
  onIdle: () => {
    segmenter.idle();
    if (curStrokes.length) {
      // Re-derive the final result for the record without disturbing live state.
      const probe = new IncrementalSegmenter();
      const res = probe.feedSyllable(curStrokes);
      samples.push({ strokes: curStrokes, jamo: res.jamo, block: res.block });
      curStrokes = [];
    }
  },
});

// --- sample export tooling ---
async function copySamples() {
  const json = JSON.stringify(samples);
  try { await navigator.clipboard.writeText(json); } catch { /* may be blocked */ }
  flash('copy', 'copied ' + samples.length);
}
async function saveSamples() {
  try {
    const res = await fetch('/save-samples', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(samples),
    });
    const out = await res.json();
    flash('save', out.ok ? 'saved → ' + out.file : 'save failed');
  } catch { flash('save', 'save failed'); }
}
function flash(id, text) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const orig = btn.dataset.label || btn.textContent;
  btn.dataset.label = orig;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = btn.dataset.label; }, 1600);
}
document.getElementById('copy')?.addEventListener('click', copySamples);
document.getElementById('save')?.addEventListener('click', saveSamples);
document.getElementById('clearbtn')?.addEventListener('click', () => {
  samples.length = 0; curStrokes = []; elLog.textContent = '';
  elSyllable.textContent = ''; segmenter.idle();
});

// Expose for the Playwright harness and offline tuning.
window.__jamo = {
  recognize,
  rank,
  segmenter,
  feedSyllable: (strokes) => new IncrementalSegmenter().feedSyllable(strokes),
  state: () => ({ syllable: elSyllable.textContent, last: elLast.textContent }),
  samples,
  dump: () => JSON.stringify(samples),
};
