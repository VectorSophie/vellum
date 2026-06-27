# Spike: offline jamo recognition (replace Google Input Tools?) — NO-GO

**Date:** 2026-06-28 · **Type:** read-only investigation · **Decision:** do not adopt now.

## Question

Vellum's handwriting recognition (`web/vellum/js/recognize.js`) POSTs whole syllables to
Google Input Tools — an external, undocumented endpoint. Can the `jamo-pipeline` branch's
offline, template-based recognizer replace it and remove that dependency?

## What jamo-pipeline actually is

A standalone, dependency-free per-**jamo** recognizer (`js/jamo/` on `origin/jamo-pipeline`):

- **`recognizer.js` + `templates.js`** — a $1-style combined-path matcher: flatten a drawn
  jamo's strokes into one path, normalize (uniform scale, aspect-preserved), resample to 24
  points, compare to idealized templates (direction-forgiving). Clean, well-built, claims
  100% self-recognition. **This is the reusable asset.**
- **`segment.js`** — live cursive segmentation that splits a written syllable into jamo.
- **`integrate.js`** — overlays tetohira's canvas, flies composed blocks into the 3D scene,
  uses a placeholder synth (predates Vellum's `hangul.js` kana mapping).

## Why NO-GO

1. **CV-only — no 받침.** `segment.js` commits at most consonant+vowel per syllable; the next
   consonant starts a new syllable. So 안/갈/한국 can't be recognized as written. This directly
   **regresses the Phase 3 coda work** — a non-starter.
2. **Only the 24 basic jamo.** No doubled consonants (ㄲㄸㅃㅆㅉ) or compound vowels
   (ㅐㅔㅚㅟㅢ/ㅘㅝ…). Real Korean needs them.
3. **Adopting it forces a choice we already rejected:** either switch to a per-jamo input UX
   (draw letters one by one — less natural than writing whole syllable blocks), or lean on the
   unproven cursive segmenter (which is itself CV-only).

The robustness worry is also milder than feared: if Google's endpoint fails, recognition is a
silent no-op (no character appears) — the app does **not** crash.

## Recommendation

- **Keep `recognizer.js`/`templates.js` in the back pocket** — genuinely good, reusable.
- If offline recognition is ever wanted, it's **its own project** (a future spec), not part of
  this push: extend templates to ~40 jamo, make the segmenter handle CVC (받침), tune
  thresholds, and decide UX. Multi-day, with real recognition-accuracy risk.
- Cheaper hedge for a launch, if desired: have `recognize.js` show a friendly message on
  network/timeout failure instead of silently doing nothing. Small, optional.
