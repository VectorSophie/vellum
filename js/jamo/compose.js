// compose.js — CV-only Hangul syllable composition.
//
// Pure logic + a small stateful composer. No DOM, no audio, no visual deps.
// The composer accepts recognized jamo one at a time and emits the current
// display string (a lone jamo, or a composed CV syllable block).
//
// CV-only (v1): every consonant starts a fresh syllable; a vowel seals the
// pending consonant into a block. No codas, so there is never any lookahead
// or retroactive edit — each input maps to exactly one emitted string.

// Choseong (initial-consonant) index in the Hangul composition table.
// Only the 14 basic consonants are mapped for v1.
const CHOSEONG = {
  'ㄱ': 0, 'ㄴ': 2, 'ㄷ': 3, 'ㄹ': 5, 'ㅁ': 6, 'ㅂ': 7, 'ㅅ': 9,
  'ㅇ': 11, 'ㅈ': 12, 'ㅊ': 14, 'ㅋ': 15, 'ㅌ': 16, 'ㅍ': 17, 'ㅎ': 18,
};

// Jungseong (medial-vowel) index. Only the 10 basic vowels for v1.
const JUNGSEONG = {
  'ㅏ': 0, 'ㅑ': 2, 'ㅓ': 4, 'ㅕ': 6, 'ㅗ': 8, 'ㅛ': 12,
  'ㅜ': 13, 'ㅠ': 17, 'ㅡ': 18, 'ㅣ': 20,
};

const HANGUL_BASE = 0xac00;
const JUNG_COUNT = 21;
const JONG_COUNT = 28; // includes "no final" at index 0

export function isConsonant(jamo) {
  return Object.prototype.hasOwnProperty.call(CHOSEONG, jamo);
}

export function isVowel(jamo) {
  return Object.prototype.hasOwnProperty.call(JUNGSEONG, jamo);
}

// Compose a CV syllable block from a consonant + vowel. Returns the composed
// character, or null if either jamo is not in the v1 set.
export function composeCV(consonant, vowel) {
  const cho = CHOSEONG[consonant];
  const jung = JUNGSEONG[vowel];
  if (cho === undefined || jung === undefined) return null;
  return String.fromCharCode(HANGUL_BASE + (cho * JUNG_COUNT + jung) * JONG_COUNT);
}

// Stateful CV composer. Feed it jamo; it returns the current display string.
export class Composer {
  constructor() {
    this._pendingConsonant = null; // consonant awaiting a vowel, or null
  }

  // Accept one recognized jamo. Returns { display, syllable }:
  //   display  — the string to show now (lone jamo or composed block)
  //   syllable — the composed block if one was just sealed, else null
  accept(jamo) {
    if (isVowel(jamo)) {
      if (this._pendingConsonant) {
        const block = composeCV(this._pendingConsonant, jamo);
        this._pendingConsonant = null;
        return { display: block, syllable: block };
      }
      // Bare vowel with no pending consonant: show it alone.
      return { display: jamo, syllable: null };
    }

    if (isConsonant(jamo)) {
      // A consonant always starts a fresh syllable (CV-only).
      this._pendingConsonant = jamo;
      return { display: jamo, syllable: null };
    }

    // Unknown jamo: ignore, keep current pending state.
    return { display: null, syllable: null };
  }

  reset() {
    this._pendingConsonant = null;
  }
}
