// templates.js — canonical stroke templates for the 24 basic jamo.
//
// Each template: { char, strokes } where strokes is an array of polylines and
// each polyline is an array of [x, y] points in a 0..1 box, y pointing DOWN
// (canvas convention). Shapes are idealized; the recognizer normalizes the
// group (uniform scale, aspect preserved) so only relative shape matters.
//
// Stroke pairing in the recognizer is order-independent, so the listed stroke
// order is for readability, not a matching constraint. Multiple entries may
// share a char (drawing variants) — none yet; that is a tuning lever.

export const TEMPLATES = [
  // ---- Consonants (14) ----
  { char: 'ㄱ', strokes: [[[0, 0], [1, 0], [1, 1]]] },
  { char: 'ㄴ', strokes: [[[0, 0], [0, 1], [1, 1]]] },
  { char: 'ㄷ', strokes: [[[0, 0], [1, 0]], [[0, 0], [0, 1], [1, 1]]] },
  { char: 'ㄹ', strokes: [[[0, 0], [1, 0], [1, 0.5], [0, 0.5], [0, 1], [1, 1]]] },
  { char: 'ㅁ', strokes: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
  { char: 'ㅂ', strokes: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]], [[0, 1], [1, 1]]] },
  { char: 'ㅅ', strokes: [[[0.5, 0], [0, 1]], [[0.5, 0], [1, 1]]] },
  { char: 'ㅇ', strokes: [[[0.5, 0], [0.85, 0.15], [1, 0.5], [0.85, 0.85], [0.5, 1], [0.15, 0.85], [0, 0.5], [0.15, 0.15], [0.5, 0]]] },
  { char: 'ㅈ', strokes: [[[0, 0], [1, 0]], [[0.5, 0], [0.1, 1]], [[0.5, 0], [0.9, 1]]] },
  { char: 'ㅊ', strokes: [[[0.4, 0], [0.6, 0]], [[0, 0.2], [1, 0.2]], [[0.5, 0.2], [0.1, 1]], [[0.5, 0.2], [0.9, 1]]] },
  { char: 'ㅋ', strokes: [[[0, 0], [1, 0], [1, 1]], [[0.4, 0.5], [1, 0.5]]] },
  { char: 'ㅌ', strokes: [[[0, 0], [1, 0]], [[0, 0], [0, 1], [1, 1]], [[0, 0.5], [1, 0.5]]] },
  { char: 'ㅍ', strokes: [[[0, 0], [1, 0]], [[0.25, 0], [0.25, 1]], [[0.75, 0], [0.75, 1]], [[0, 1], [1, 1]]] },
  { char: 'ㅎ', strokes: [[[0.3, 0], [0.7, 0]], [[0, 0.25], [1, 0.25]], [[0.5, 0.4], [0.85, 0.55], [0.7, 0.95], [0.3, 0.95], [0.15, 0.55], [0.5, 0.4]]] },

  // ---- Vowels (10) ----
  { char: 'ㅏ', strokes: [[[0.6, 0], [0.6, 1]], [[0.6, 0.5], [1, 0.5]]] },
  { char: 'ㅑ', strokes: [[[0.6, 0], [0.6, 1]], [[0.6, 0.33], [1, 0.33]], [[0.6, 0.66], [1, 0.66]]] },
  { char: 'ㅓ', strokes: [[[0.4, 0], [0.4, 1]], [[0, 0.5], [0.4, 0.5]]] },
  { char: 'ㅕ', strokes: [[[0.4, 0], [0.4, 1]], [[0, 0.33], [0.4, 0.33]], [[0, 0.66], [0.4, 0.66]]] },
  { char: 'ㅗ', strokes: [[[0.5, 0], [0.5, 1]], [[0, 1], [1, 1]]] },
  { char: 'ㅛ', strokes: [[[0.3, 0], [0.3, 1]], [[0.7, 0], [0.7, 1]], [[0, 1], [1, 1]]] },
  { char: 'ㅜ', strokes: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]] },
  { char: 'ㅠ', strokes: [[[0, 0], [1, 0]], [[0.3, 0], [0.3, 1]], [[0.7, 0], [0.7, 1]]] },
  { char: 'ㅡ', strokes: [[[0, 0.5], [1, 0.5]]] },
  { char: 'ㅣ', strokes: [[[0.5, 0], [0.5, 1]]] },
];
