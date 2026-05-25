# tetohira-clone

A fully self-hosted clone of [aidn.jp/tetohira](https://aidn.jp/tetohira/) for study and use as a base for similar projects.

## Running locally

```
node server.js
```

Then open `http://localhost:3000` in a browser.

> **Why a server?** The Web Audio API and Service Worker require HTTP — `file://` won't work.

---

## How it works — architecture overview

### Input layer: DrawManager
- A full-screen `<canvas id="draw">` captures mouse/touch strokes.
- On stroke-end, the stroke points are fed into a **hiragana dictionary recognizer** (stroke-path matching against `o.list` — a bundled array of hiragana stroke templates).
- The matched hiragana character is sent to both the audio system and the visual system.

### Audio layer: AudioManager (`data/bgm.mp3` + `data/s/hiragana.json`)
- **BGM**: `data/bgm.mp3` plays as a looping background track at 120 BPM.
- **Voice samples**: `data/s/hiragana.json` holds 31 base64-encoded MP3 blobs keyed 1–31, each a single hiragana syllable sung by the vocal.
- **Sound effects**: `data/s/se.json` has 12 blobs keyed s0–s11 (strum/hit SFX).
- Recognized characters are scheduled as one-shot audio events aligned to the nearest beat.

### Visual layer: ThreeManager (Three.js WebGL)
- A `THREE.WebGLRenderer` renders into `<div id="view">`.
- **TextManager** (`X`): each recognized hiragana spawns 3D text sprites that fly in from camera Z and settle into a lyric strip.
- **GraphicsManager** (`$`): particle/background effects.
- **TitleManager** (`q`): the ξ•∀•ξ mascot text shown on the start screen.
- **EffectComposer** (from `lib.js`): post-processing passes. Occasional `RGBShift` and `Glitch` effects fire at random on character recognition.
- Shader uniforms: `colW/colB` (color), `noiseColor/noiseRate/noiseSize` (noise grain), `pixelSize` (pixelation), `roundsq` (vignette), `uvoff/seedX/seedY` (UV jitter).

### URL sharing / lyrics
- Lyrics are LZ-string compressed and embedded in the URL path (or `#hash`).
- `j.decompressFromUrl()` is a bundled LZ-string implementation — no external library needed.
- On load, `_checkLyricsFromURL()` restores lyrics from the URL and replays them.

### Video export
- `MediaRecorder` captures the WebGL canvas + Web Audio destination stream.
- Falls back to `mp4-muxer` (VideoEncoder API) or `mediabunny` depending on browser support.
- Max 30 seconds, selectable aspect ratio and frame rate.

---

## What was changed from the original

| File | Change |
|---|---|
| `js/common.js` | Stripped Google Analytics, aidn.jp redirects, and www/daniwell.com rewrites |
| `js/app.js` | Removed `console.log` suppressor that only ran on `aidn.jp` |
| `index.html` | Rewritten: all paths point to local files, removed service-worker scope dependency |
| `css/common.css` | Copied as-is from `shared/sp/css/` |
| `service-worker.js` | New minimal SW — just caches the local asset list |
| `server.js` | New Node.js static server with correct MIME types and COOP/COEP headers |

---

## Forking for your own project

### Replace audio content
1. **BGM**: swap `data/bgm.mp3` with your own backing track. The app expects 120 BPM by default — search `_bpm` in `app.js` to change it.
2. **Phoneme samples**: `data/s/hiragana.json` maps keys 1–31 to base64 MP3 blobs. You can replace these with any phoneme set (different language, different voice, synth, etc.). Key layout:
   - 1 = あ (a), 2 = い (i), 3 = う (u) … and so on through the 31 hiragana used.
3. **SFX**: `data/s/se.json` keys s0–s11 are the strum/hit sounds on character recognition.

### Replace the recognizer
The hiragana recognizer is a stroke-template matcher in `app.js` using `o.list`. To support a different script (Latin, Hangul, custom gestures), replace `o.list` with your own template set using the same format:  
`[charString, strokeCount, ... normalizedPoints]`

### Change visuals
- **Colors**: `ThreeManager.initialize` sets `scene.background = new THREE.Color(0xFAFAFA)`. Shader uniforms `colW` and `colB` set foreground/background particle colors.
- **Post-processing**: effect passes are added in `EffectManager` (class `W` in app.js). Add/remove passes there.
- **Text 3D style**: `TextManager` (class `X`) controls how recognized characters appear in 3D space — font, size, spread, animation curves.
- **Font**: loaded via Google Fonts (`Shippori Antique`). Change the `<link>` in `index.html` and the font-family in `css/app.css`.

### Change the share URL
Search for `aidn.jp/tetohira` in `index.html` and `app.js` to update the canonical URL for social sharing.

---

## Asset credits

All audio assets (voice of Kasane Teto, BGM) and original visual design are © daniwell / [aidn.jp](https://aidn.jp). These assets are included solely for local study. Replace them with your own work before distributing your fork.
