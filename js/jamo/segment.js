// segment.js — incremental jamo segmentation engine.
//
// Live, per-stroke segmentation: the user writes a syllable cursively (jamo
// flow together, gaps fall between syllables). As each stroke lands we decide
// whether it extends the jamo in progress or starts a new one, firing per-jamo
// feedback as we go. The idle gap ends the syllable.
//
// Korean structure drives the decision: a CV syllable is consonant-then-vowel,
// the vowel sits to the right (ㅏㅓㅣ…) or below (ㅗㅜㅡ…) the consonant, and
// vowels grow by attached branches (ㅣ→ㅏ→ㅑ). So:
//   - consonant phase: a stroke clearly to the right/below — that does NOT keep
//     the cluster a valid consonant — commits the consonant and starts the
//     vowel. (Guarded so wide consonants like ㅂ keep building.)
//   - if what's drawn so far is already a vowel (no leading consonant), further
//     strokes grow that vowel.
//   - vowel phase: strokes extend the vowel.
//
// CV-only: at most a consonant + a vowel per syllable. Callbacks:
//   onJamo(char)            — a jamo was committed (fire its sound)
//   onSyllable(block)       — a CV block just completed (fire completion sound)
//   onDisplay(string)       — current syllable display (live, incl. tentative)

import { recognize } from './recognizer.js';
import { isConsonant, isVowel, composeList } from './compose.js';

const EXT_MARGIN = 0.06; // how much worse an extended consonant may score and still glue

function bbox(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function flatten(strokes) {
  const out = [];
  for (const s of strokes) for (const p of s) out.push(p);
  return out;
}

export class IncrementalSegmenter {
  constructor(opts = {}) {
    this.onJamo = opts.onJamo || (() => {});
    this.onSyllable = opts.onSyllable || (() => {});
    this.onDisplay = opts.onDisplay || (() => {});
    this._reset();
  }

  _reset() {
    this._syllable = []; // committed jamo chars for the current syllable
    this._cur = [];      // strokes of the jamo currently being formed
    this._phase = 'consonant';
  }

  // Process one completed stroke (array of [x, y] points).
  pushStroke(stroke) {
    if (this._cur.length === 0) {
      this._cur = [stroke];
      this._emitDisplay();
      return;
    }

    const sB = bbox(stroke);
    const curB = bbox(flatten(this._cur));

    if (this._phase === 'consonant') {
      const rCur = recognize(this._cur);
      if (rCur && isVowel(rCur.char)) {
        // No leading consonant yet — we're drawing a vowel; grow it.
        this._cur.push(stroke);
      } else {
        const rightOf = sB.minX > curB.cx; // stroke sits to the right of cluster
        const below = sB.minY > curB.cy;   // or below it
        const rExt = recognize(this._cur.concat([stroke]));
        const extendKeepsConsonant = rExt && isConsonant(rExt.char) &&
          rExt.score <= (rCur ? rCur.score : 1) + EXT_MARGIN;
        if ((rightOf || below) && !extendKeepsConsonant) {
          this._commitCur();           // finalize the consonant
          this._cur = [stroke];
          this._phase = 'vowel';
        } else {
          this._cur.push(stroke);      // still building the consonant
        }
      }
    } else {
      // Vowel phase: strokes grow the vowel.
      this._cur.push(stroke);
    }

    this._emitDisplay();
  }

  // Idle gap: end of syllable. Commit whatever is in progress and reset.
  idle() {
    if (this._cur.length > 0) this._commitCur();
    this._reset();
  }

  // Finalize the in-progress jamo: recognize, record, fire callbacks.
  _commitCur() {
    const r = recognize(this._cur);
    this._cur = [];
    if (!r) return;
    this._syllable.push(r.char);
    this.onJamo(r.char);
    // CV complete? (consonant followed by vowel)
    if (this._syllable.length === 2 && isConsonant(this._syllable[0]) && isVowel(this._syllable[1])) {
      this.onSyllable(composeList(this._syllable));
    }
  }

  // Live display: committed jamo plus the tentative current jamo.
  _emitDisplay() {
    let list = this._syllable;
    if (this._cur.length > 0) {
      const tent = recognize(this._cur);
      if (tent) list = this._syllable.concat([tent.char]);
    }
    this.onDisplay(composeList(list));
  }

  // Test/diagnostic: run a whole syllable's strokes then idle, return result.
  feedSyllable(strokes) {
    this._reset();
    for (const s of strokes) this.pushStroke(s);
    const committed = this._syllable.slice();
    if (this._cur.length > 0) {
      const r = recognize(this._cur);
      if (r) committed.push(r.char);
    }
    return { jamo: committed, block: composeList(committed) };
  }
}
