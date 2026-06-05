# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-hosted clone of [aidn.jp/tetohira](https://aidn.jp/tetohira/) — a Japanese audiovisual toy where users draw hiragana on a canvas and Kasane Teto sings the syllables over a looping BGM. The repo exists as a study base and starting point for derivative projects.

## Running

```
node server.js
```

Then open `http://localhost:3000`. There is no build step — all JS is served as-is.

The server is required (not `file://`) because Web Audio API and Service Worker need HTTP. It sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers, which are required for `SharedArrayBuffer` (used by the video export path).

## Architecture

All application logic lives in three script files loaded in order:

- **`js/common.js`** — The `aidn` namespace: utility classes (`aidn.util`, `aidn.config`, `aidn.audio`, `aidn.WebAudio`, `aidn.AutoAudio`, `aidn.SceneManager`, etc.). This is shared aidn.jp infrastructure, cleaned of analytics and redirects.
- **`js/lib.js`** — Three.js EffectComposer and post-processing passes (RGBShift, Glitch, etc.) bundled locally.
- **`js/app.js`** — The entire application (~3000+ lines, minified). Contains all manager classes under single-letter names:
  - `DrawManager` — full-screen `<canvas id="draw">` capturing mouse/touch strokes; feeds recognized hiragana to audio and visual layers
  - `AudioManager` — BGM (`data/bgm.mp3`) + beat-aligned voice samples (`data/s/hiragana.json`, keys 1–31) + SFX (`data/s/se.json`, keys s0–s11)
  - `ThreeManager` — `THREE.WebGLRenderer` into `<div id="view">`
  - `TextManager` (`X`) — 3D hiragana sprites flying in from camera Z into a lyric strip
  - `GraphicsManager` (`$`) — particle/background effects
  - `TitleManager` (`q`) — start-screen mascot text
  - `EffectManager` (`W`) — EffectComposer post-processing passes; RGBShift and Glitch fire randomly on character recognition

**Hiragana recognizer**: stroke-template matching against `o.list` in `app.js` — an array of templates in the format `[charString, strokeCount, ...normalizedPoints]`.

**URL sharing**: lyrics are LZ-string compressed into the URL path or `#hash` via a bundled `j.decompressFromUrl()`.

**Video export**: `MediaRecorder` captures WebGL canvas + Web Audio destination stream; falls back to `mp4-muxer` (VideoEncoder API) or `mediabunny`.

## Key customization points

| Goal | Where |
|---|---|
| Change BPM | Search `_bpm` in `js/app.js` |
| Replace voice samples | `data/s/hiragana.json` — keys 1–31, base64 MP3 blobs |
| Replace SFX | `data/s/se.json` — keys s0–s11, base64 MP3 blobs |
| Replace BGM | `data/bgm.mp3` |
| Change recognizer | Replace `o.list` in `js/app.js` |
| Change background/particle colors | `colW`/`colB` shader uniforms in `ThreeManager.initialize` |
| Change post-processing | Add/remove passes in `EffectManager` (`W`) in `js/app.js` |
| Change 3D text style | `TextManager` (`X`) in `js/app.js` |
| Change font | `<link>` in `index.html` + font-family in `css/app.css` |
| Update share URL | Search `aidn.jp/tetohira` in `index.html` and `js/app.js` |

## Vellum: Korean jamo remix

The repo is being remixed into **Vellum** — the same toy driven by Korean hiragana→jamo instead of Japanese kana. The jamo work is a standalone pipeline that does **not** touch `index.html` or `js/app.js`; the tetohira stack stays pristine and is driven via an adapter.

Three entry points:
- `index.html` — pristine tetohira (unchanged).
- `jamo.html` — bare, isolated jamo pipeline (text-first dev surface, no visuals).
- `vellum.html` — the integrated experience: tetohira's 3D visuals driven by the jamo pipeline. Generated from `index.html` + an injected adapter module (keep the tetohira DOM intact when regenerating).

Pipeline modules (`js/jamo/`, ES modules — `js/jamo/package.json` sets `type:module`):
- `strokes.js` — pointer capture; emits `onStroke` (per pen-up) + `onIdle` (gap = syllable boundary).
- `recognizer.js` — **combined-path** matcher (strokes flattened to one normalized, resampled path; count-agnostic, direction-forgiving). Tolerates cursive stroke-count variation. `recognize()` / `rank()`.
- `templates.js` — canonical stroke templates for the 24 basic jamo.
- `compose.js` — CV-only Hangul composition + Unicode assembly (`0xAC00 + (cho*21+jung)*28`). Pure.
- `segment.js` — `IncrementalSegmenter`: live per-stroke segmentation using Korean CV structure (consonant→vowel, vowel sits right/below, vowels grow). Fires per-jamo on commit, block on idle.
- `audio.js` — placeholder Web Audio synth (real voicebank deferred).
- `main.js` — wires `jamo.html`; `integrate.js` — wires `vellum.html` to `app.Context.main._three.drawHiragana(block, pos, {type:0})`.

Key integration facts:
- The tetohira instance is reachable at `window.app.Context.main`; scene state at `window.app.Context.sceneId` (1=TOP, 2=MAIN); the visual dispatch is `_three.drawHiragana(char, {x,y,w,h}, {type:0})` (pos = drawn bbox center+size, matching tetohira's `_optimize`).
- `integrate.js` lays a transparent overlay canvas (z-index 3, above `#draw`=2, below UI=22) that captures the pen only while MAIN is active, so tetohira's own recognizer never fires and the start/menu stay usable.

Tests (Playwright, `playwright` is a devDependency):
- `node tools/jamo-e2e.mjs` — pipeline (recognition, composition, incremental).
- `node tools/vellum-e2e.mjs` — integrated experience (drives the real 3D scene).
- `tools/fixtures/` — real captured stroke samples (saved via the `save samples` button → `POST /save-samples` in `server.js`) for recognizer tuning.

Known gaps: cursive ㄷ can read as ㄴ; wide consonants (ㅂ/ㅍ) need tuning on real fixtures; Korean audio is placeholder; codas / compound vowels / doubled consonants are out of scope for v1.

## What was changed from the original aidn.jp source

- `js/common.js` — stripped Google Analytics, aidn.jp redirects, www/daniwell.com rewrites
- `js/app.js` — removed `console.log` suppressor that only ran on `aidn.jp`
- `index.html` — rewritten so all paths point to local files
- `service-worker.js` — replaced with a minimal SW that caches the local asset list
- `server.js` — new Node.js static server (no original equivalent)
