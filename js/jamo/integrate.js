// integrate.js — adapter that drives the tetohira visual stack with the Korean
// jamo pipeline. ZERO edits to app.js: it reaches the live tetohira instance
// at window.app.Context.main and calls _three.drawHiragana() to fly composed
// syllable blocks into the existing 3D scene.
//
// Input is taken on a transparent overlay canvas above tetohira's #draw
// (z-index 3, below the UI at 22). The overlay captures the pen so tetohira's
// own hiragana recognizer never fires; our StrokeCapture + IncrementalSegmenter
// own recognition. The overlay only captures while the MAIN scene is active so
// the start screen and menu keep working.
//
// Per user choice: a completed syllable BLOCK flies into the scene (not loose
// jamo). Audio is our placeholder synth (tetohira's voice samples are keyed to
// hiragana and don't map to Korean yet).

import { StrokeCapture } from './strokes.js';
import { IncrementalSegmenter } from './segment.js';
import { JamoAudio } from './audio.js';

const MAIN_SCENE = 2; // window.app.SceneId.MAIN

function whenReady(cb) {
  const t = setInterval(() => {
    const m = window.app && window.app.Context && window.app.Context.main;
    if (m && m._three && typeof m._three.drawHiragana === 'function') {
      clearInterval(t);
      cb(m);
    }
  }, 100);
}

// Bounding-box position of a syllable's strokes, in canvas-pixel coords — the
// same {x:center, y:center, w, h} shape tetohira's own _optimize() produces, so
// the block flies in from where it was drawn.
function bboxPos(strokes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const st of strokes) {
    for (const [x, y] of st) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const w = maxX - minX;
  const h = maxY - minY;
  return { x: minX + w / 2, y: minY + h / 2, w, h };
}

whenReady((main) => {
  const three = main._three;

  // Transparent input overlay above #draw (z-index 2), below UI (22).
  const overlay = document.createElement('canvas');
  overlay.id = 'jamo-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', top: '0', left: '0', zIndex: '3',
    touchAction: 'none', pointerEvents: 'none',
  });
  document.body.appendChild(overlay);
  const sizeOverlay = () => { overlay.width = window.innerWidth; overlay.height = window.innerHeight; };
  sizeOverlay();
  window.addEventListener('resize', sizeOverlay);

  const audio = new JamoAudio();
  let curStrokes = [];
  let lastBlock = null;

  const segmenter = new IncrementalSegmenter({
    onJamo: (char) => audio.onJamo(char),
    onSyllable: (block) => audio.onSyllable(block),
    onBlock: (block) => {
      lastBlock = block;
      const pos = bboxPos(curStrokes);
      try { three.drawHiragana(block, pos, { type: 0 }); } catch (e) { /* visual only */ }
    },
  });

  new StrokeCapture(overlay, {
    idleMs: 600,
    onStrokeStart: () => audio.resume(),
    onStroke: (stroke) => { curStrokes.push(stroke); segmenter.pushStroke(stroke); },
    onIdle: () => { segmenter.idle(); curStrokes = []; },
  });

  // Only capture input while the MAIN scene is active (keep start/menu usable).
  setInterval(() => {
    const active = window.app.Context.sceneId === MAIN_SCENE;
    overlay.style.pointerEvents = active ? 'auto' : 'none';
  }, 150);

  // Test hook for the Playwright harness.
  window.__vellum = {
    three,
    segmenter,
    lastBlock: () => lastBlock,
    feed(strokes) {
      curStrokes = strokes.slice();
      for (const s of strokes) segmenter.pushStroke(s);
      segmenter.idle();
      curStrokes = [];
      return lastBlock;
    },
  };
});
