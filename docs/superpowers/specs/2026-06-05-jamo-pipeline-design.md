# Jamo Recognition Pipeline — v1 Design

**Date:** 2026-06-05
**Status:** Approved (architecture), implementing

## Goal

Replace tetohira's hiragana interaction with a Korean jamo interaction, preserving the tetohira flow: draw one unit → recognize it → fire audio → show it. Forward-only, immediate, one-to-one.

## Core decisions (confirmed with user)

1. **Atomic unit = jamo.** User draws individual jamo (ㄱ, ㅏ, …), not full syllable blocks. Each drawn jamo fires audio immediately.
2. **Composition is silent, in the display layer.** Drawn jamo compose into Hangul syllable blocks (ㄱ + ㅏ → 가).
3. **CV-only for v1.** Consonant + vowel only. No codas. Each new consonant always starts a fresh syllable. This avoids lookahead latency and retroactive display edits — both of which break tetohira's immediacy. Codas are a later addition.
4. **Recognizer = stroke-template matcher.** Same approach as tetohira's `o.list`. Build a jamo template library; do not invent a new recognition paradigm.
5. **Audio = placeholder synth.** Web Audio synthesized tones for v1 (consonant = soft puff, vowel = full tone, optional completion sound). Real voicebank is a later, separate step.
6. **Display = bare/throwaway for v1.** Plain DOM rendering of the current syllable. No Three.js, no particles.

## Architecture

**Hard rule: the recognition/audio core has zero dependency on any visual layer.** It emits events; a downstream consumer decides how to render. This is the coupling that sank v1 and v2 — structurally prevented here.

- **Do not modify `index.html` / `js/app.js`.** The tetohira visual stack stays intact for later reuse ("A later": wire pipeline output into `TextManager`).
- v1 is a **standalone page** (`jamo.html`) loading only the pipeline — no Three.js, no `app.js`.
- Served by the existing `server.js` (static, any file).

### Modules (plain ES modules, each independently testable)

| Module | Responsibility | Depends on |
|---|---|---|
| `js/jamo/strokes.js` | Capture mouse/touch strokes on a canvas; group into a stroke-set; emit on idle timeout | nothing (DOM only) |
| `js/jamo/templates.js` | Jamo stroke-template library (24 basic jamo: 14 consonants + 10 vowels) | nothing (data) |
| `js/jamo/recognizer.js` | Match a stroke-set against templates → best jamo + confidence | templates.js |
| `js/jamo/compose.js` | CV composition + Hangul Unicode assembly (`0xAC00 + (cho*21+jung)*28`) | nothing (pure) |
| `js/jamo/audio.js` | Placeholder Web Audio synth; play per-jamo + completion | nothing (Web Audio) |
| `js/jamo/main.js` | Wire modules; bare display | all above |

### Data flow

```
canvas strokes → strokes.js (idle flush) → recognizer.js → jamo + confidence
   → audio.js (fire immediately)
   → compose.js (accumulate CV → syllable) → bare display
```

`compose.js` emits the current syllable string; `main.js` renders it. Later (A), the same emission feeds `TextManager`.

## v1 jamo set

- **Consonants (14):** ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ
- **Vowels (10):** ㅏ ㅑ ㅓ ㅕ ㅗ ㅛ ㅜ ㅠ ㅡ ㅣ

## Verification

Headless Playwright (node scripts): simulate canvas strokes programmatically, assert on recognized jamo / composed syllable in the DOM, screenshot. Build and verify each module before moving to the next.

## Out of scope for v1

Codas, compound vowels (ㅘ ㅙ …), doubled consonants (ㄲ ㄸ …), real voicebank, any tetohira visual integration, settings UI.
