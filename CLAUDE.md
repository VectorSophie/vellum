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

## What was changed from the original aidn.jp source

- `js/common.js` — stripped Google Analytics, aidn.jp redirects, www/daniwell.com rewrites
- `js/app.js` — removed `console.log` suppressor that only ran on `aidn.jp`
- `index.html` — rewritten so all paths point to local files
- `service-worker.js` — replaced with a minimal SW that caches the local asset list
- `server.js` — new Node.js static server (no original equivalent)
