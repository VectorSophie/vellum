# Vellum — Phase 4 Spec: Capture (export, song links, presets)

**Status:** for review · **Date:** 2026-06-14 · **Phase:** 4 of 5 (… Voice → Look → **Capture** → Music)

## Context

Voices (Phase 2) and look (Phase 3) are customizable, but creations are ephemeral. Capture lets the user **keep and share** them. Two pieces already exist to build on:
- The original's **MP4 export** machinery is intact and wired — `bt_export` button → `#export`/`#exporting`/`#download` panels, `_recorder` (mediabunny/Mp4Muxer), aspect/fps selects, `bt_download`. It survived the rebrand.
- **Lyric-URL encoding** — `_checkLyricsFromURL` already restores lyrics from the URL (`decompressFromUrl`), and `_getShareUrl` builds an encoded lyric string.

So Capture is mostly: verify export, and extend the existing URL/state plumbing to round-trip the *whole* creation + save presets.

## Goal

1. **Working MP4 export** (verify the existing flow end-to-end; fix if broken).
2. **Song link** — one URL that restores the full creation: lyrics + voicebank + look (font/palette/effect/테마 자동).
3. **Presets** — save/load/delete named bundles of {lyrics, voice, look} locally.

## Non-goals
- Server-side gallery / POST sharing (the original's server POST is gone; links are client-side only).
- Cloud sync, accounts. Tempo/key/melody → Phase 5.

## Design

### 1. Export (verify + polish)
The flow exists: menu → **동영상으로 내보내기** → choose aspect (16:9/9:16/1:1) + fps → **START** records the canvas+audio → **STOP** → **DOWNLOAD (MP4)**. Phase 4: run it, confirm the MP4 downloads and plays; fix any breakage (e.g. mediabunny init, canvas/audio capture). Strings already Korean.

### 2. Song link (`capture.js`)
- `serialize()` → `{ l: lyrics, v: voicebankId, k: {font,palette,effect,themeAuto} }` → compact string (reuse the engine's `compressToUrl`/`decompressFromUrl`, or `encodeURIComponent(JSON)`).
- A **링크 복사 (Copy link)** button (in the menu, where Share used to be) → builds `…/#<serialized>` and copies to clipboard, with the existing "복사되었습니다" toast.
- On load, **restore** runs after voicebank + look are ready: set lyrics (existing path), select the voice, apply the look. Extend `_checkLyricsFromURL` → `_restoreFromURL` to parse the richer payload (back-compatible: a plain hangul hash still works as lyrics-only).

### 3. Presets
- A **PRESETS** section in the menu: a text field + **저장**, and a list of saved presets each with **불러오기 / 삭제**.
- Stored in `localStorage` (`vellum.presets` = `{name: serialized}`), reusing `serialize()`/`deserialize()`.

## Integration points
- New `js/capture.js`: `serialize()`, `deserialize(str)`, `Vellum.applySong(song)` (sets lyrics+voice+look), preset CRUD. Loaded before `app.js`.
- `app.js`: replace `_checkLyricsFromURL` body with `_restoreFromURL` (richer payload, still accepts plain hangul); add 링크 복사 + PRESETS UI in the menu controller next to LOOK; hook the copy button to `serialize()` + clipboard + toast.
- Reuse: voice switch (`_switchVoicebank`), look setters (`Vellum.setFont/Palette/Effect`), `_updateHiraganas`, the `#copy` toast.

## Verification
1. Write a song, pick voice **Adachi** + font **Gaegu** + palette **네온** → **링크 복사** → open the URL in a new tab → lyrics, Adachi voice, Gaegu, 네온 all restored.
2. Plain `…/#사랑해` still loads as lyrics-only (back-compat).
3. **Export**: 동영상으로 내보내기 → START/STOP → DOWNLOAD → an MP4 of the song plays.
4. **Presets**: 저장 "test" → change voice/look/lyrics → 불러오기 "test" restores; 삭제 removes; survives reload.
5. Console clean.
