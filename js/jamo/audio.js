// audio.js — placeholder Web Audio synth for v1.
//
// Deliberately synthetic. Real voicebank samples are a later, separate step.
// Three sounds, mirroring the jamo interaction:
//   - consonant: a soft, short filtered-noise puff (unvoiced)
//   - vowel:     a clearer pitched tone (voiced, pitch from a small scale)
//   - completion: a warmer sustained tone when a CV syllable is sealed
//
// No visual or recognition deps. AudioContext is created lazily on the first
// call after a user gesture (autoplay policy).

import { isConsonant, isVowel } from './compose.js';

// Pentatonic-ish pitches (Hz) for the 10 vowels, so output is musical.
const VOWEL_PITCH = {
  'ㅏ': 261.63, 'ㅑ': 293.66, 'ㅓ': 329.63, 'ㅕ': 349.23, 'ㅗ': 392.0,
  'ㅛ': 440.0, 'ㅜ': 493.88, 'ㅠ': 523.25, 'ㅡ': 587.33, 'ㅣ': 659.25,
};

export class JamoAudio {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._noiseBuffer = null;
  }

  _ensure() {
    if (this._ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this._ctx = new Ctx();
    this._master = this._ctx.createGain();
    this._master.gain.value = 0.6;
    this._master.connect(this._ctx.destination);

    // One second of white noise, reused for consonant puffs.
    const sr = this._ctx.sampleRate;
    const buf = this._ctx.createBuffer(1, sr, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuffer = buf;
  }

  // Call from a user-gesture handler to unlock audio.
  resume() {
    this._ensure();
    if (this._ctx.state === 'suspended') this._ctx.resume();
  }

  // Fire the immediate per-jamo sound.
  onJamo(jamo) {
    this._ensure();
    if (isConsonant(jamo)) this._puff();
    else if (isVowel(jamo)) this._tone(VOWEL_PITCH[jamo] || 330, 0.35, 0.22, 'triangle');
  }

  // Fire the completion sound when a CV block is sealed.
  onSyllable() {
    this._ensure();
    this._tone(196.0, 0.9, 0.18, 'sine'); // warm low G, longer tail
  }

  // Short filtered-noise burst (unvoiced consonant).
  _puff() {
    const t = this._ctx.currentTime;
    const src = this._ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const bp = this._ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.8;
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    src.connect(bp).connect(g).connect(this._master);
    src.start(t);
    src.stop(t + 0.16);
  }

  // Pitched tone with soft attack/decay (voiced).
  _tone(freq, dur, peak, type) {
    const t = this._ctx.currentTime;
    const osc = this._ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this._master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}
