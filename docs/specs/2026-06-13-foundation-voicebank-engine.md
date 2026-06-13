# Vellum — Phase 1 Spec: Voicebank Foundation

**Status:** for review · **Date:** 2026-06-13 · **Phase:** 1 of 5 (Foundation → Voice → Look → Capture → Music)

## Context

Vellum is the "freer tetohira": a customizable singing instrument where the user controls the **voice**, **fonts/look**, **music**, and **capture/share**. Today the Korean tetohira (M1–M5) sings with exactly one voice — Kasane Teto — whose samples are locked inside daniwell's proprietary audio codec. **Every freedom in the roadmap is blocked until voices are pluggable.** This phase builds that foundation and nothing else.

The key discovery that shapes this design: daniwell's `AudioManager` is **beat-synced** (BPM 130, quantizes every note to the beat grid and to `bgm.mp3`). That on-beat sync *is* the musical magic. We must **not** rebuild it. And we don't have to — `addOneShot(audioObj, id, vol)` accepts an `aidn.AutoAudio`, and `aidn.AutoAudio().load([url])` loads **standard audio files**. So any voicebank's samples can be fed into the existing engine and inherit all its scheduling.

## Goal

Make the singing voice a **swappable, manifest-driven module**, proven by shipping the engine with ≥2 selectable banks and a minimal picker — with zero regression to the existing beat-sync, animation, or Korean pipeline.

## Non-goals (later phases)
- Polished voice UI, per-voice pitch/vibrato, curated bank library → **Phase 2 (Voice)**
- Font picker, color/effect controls, full theming → **Phase 3 (Look)**
- MP4 export, share links, presets persistence → **Phase 4 (Capture)**
- Tempo/key/melody mapping, bgm swap → **Phase 5 (Music)**
- User-importable UTAU banks (oto.ini parsing/slicing) → post-curated, later
- Phoneme/CVVC synthesis (proper 받침 transitions). Phase 1 keeps the CV-kana model.

## Architecture

Keep daniwell's `AudioManager` (beat scheduler), `aidn.AutoAudio` (sample player), the visual/animation engine, and the `hangul → kana → index` pipeline **unchanged**. Insert one new layer between "a syllable needs a sample" and the engine:

```
recognize hangul → draw(hangul) → playHiragana(hangul)
   → toNumFromStr(hangul) → kana index            [unchanged]
   → _ids[index]  ← populated by → VoicebankManager (NEW)
   → audioMng.playOneShot(id, beat…)              [unchanged, beat-synced]
```

`_ids[index]` (kana index → registered one-shot ids) is the seam. Today it's filled by the codec loader. We make **who fills it** a function of the active voicebank.

### Components

1. **Voicebank manifest** (`banks/<id>/manifest.json`) — declarative description of a bank:
   ```json
   {
     "id": "teto",
     "name": "重音テト / Kasane Teto",
     "loader": "codec",            // "codec" = daniwell's data/s/{index}.json ; "standard" = plain audio files
     "base": "data/s/",
     "subs": 5,                     // sub-samples per kana (VOICE_SUB_NUM)
     "transpose": 0,                // semitones; used in Phase 2
     "theme": { "font": "Jua", "colors": [989213, 13967691], "mascot": "ξ•∀•ξ", "effects": "default" },
     "credits": { "vocal": "Kasane Teto", "url": "https://kasaneteto.jp/" }
   }
   ```
   A `standard` bank instead maps kana → files: `"samples": { "あ": ["a1.ogg","a2.ogg",…], "か": [...], … }` under `base`.

2. **VoicebankManager** (`js/voicebank.js`, new) — owns the active manifest and fills `_ids`:
   - `loadSampleForIndex(i)` → resolves the kana for index `i` (via existing `toStrFromNum`), loads its sub-samples through the right loader, `addOneShot`s each, records ids in `_ids[i]`. Lazy (on first use), mirroring today's behavior.
   - **codec loader:** the existing `data/s/{index}.json` fetch + unshuffle/char-shift decode → data-URI → `aidn.AutoAudio` → `addOneShot`. (Refactor of current `R`/`_loadComplete`.)
   - **standard loader:** `aidn.AutoAudio().load([base + file])` → `addOneShot`. Reuses the same registration tail.
   - `switchBank(manifest)` → `audioMng.stopOneShot(-1)`, clear `_ids`/load cache, set active manifest, apply `theme.font` to the glyph `FONTS`. Next syllables lazily load from the new bank.

3. **Config state** (`js/config.js`, new) — a single serializable object `{ voicebank, font, … }` held in memory, mirrored to `localStorage`. Phase 1 only tracks `voicebank` (+ applies `theme.font`); later phases extend it. This is the seed for share links/presets (Phase 4).

4. **Settings shell** — minimal: a **voicebank `<select>`** added to the existing menu (`#about` panel), wired to `switchBank` + `config`. Full settings UI is later phases.

5. **Bundled banks for the proof:**
   - **Teto** — `loader:"codec"`, wraps the existing path (zero risk; the current sound).
   - **One standard bank** — a second voice exported to plain `.ogg/.mp3` per kana under `banks/<id>/`, proving the standard loader + live switching. (Sourcing/curating the real Adachi Rei bank is Phase 2; Phase 1 just needs one working standard bank — even a re-export of Teto to standard files is acceptable as the test bank.)

### Teto re-export (enabling, optional in Phase 1)
We already decoded daniwell's codec (unshuffle by fixed permutation, subtract `d%4` per char, prepend the MP3 data-URI header). A small offline Node script can dump all 114 kana × 5 subs to `.mp3` files, turning Teto into a `standard` bank too. **Phase 1 keeps Teto on the `codec` loader** (no risk); the re-export is the bridge to "Teto is just another bank" and can land here or in Phase 2.

## Integration points (existing code)
- `P.prototype.load` / `_loadComplete` (app.js ~7839) → delegate to `VoicebankManager`.
- `P.prototype.playHiragana` (~7878) → unchanged; still reads `_ids`.
- `toNumFromStr` / `toStrFromNum` / `_list` (~8273) → unchanged (kana indexing).
- Glyph `FONTS` (~7666) → `switchBank` may override from `theme.font`.
- `#about` menu (index.html) → add the voicebank `<select>`.
- New files: `js/voicebank.js`, `js/config.js`, `banks/<id>/manifest.json`, `banks/teto/manifest.json`.

## Verification (end-to-end)
1. Load app → Teto is the default bank → handwrite 가/사랑/안녕 → sings exactly as today, on the beat, with nasal coda. **No regression.**
2. Open menu → pick the second bank → handwrite again → the *new voice* sings the same syllables, still beat-synced to bgm; glyph font switches to the bank's `theme.font`.
3. Switch back to Teto → original voice returns; no stuck/overlapping sounds.
4. Reload → last-selected bank persists (localStorage).
5. Console clean; no 404s; bank samples load lazily on first use.

## Risks & mitigations
- **AutoAudio standard-load quirks** (formats/latency) → test `.ogg` and `.mp3`; the engine already streams `bgm.mp3`, so decoding is supported.
- **Switch leaves stale one-shots** → `stopOneShot(-1)` + clear `_ids` and the load cache before re-registering; reuse the same id slots.
- **Refactoring the working codec loader** could regress Teto → keep the codec path byte-for-byte, only *wrapped* by the manager; Teto verification (step 1) gates everything.

## Out of scope confirmation
This phase ships an engine + 2 banks + a bare picker. It deliberately looks almost identical to today — the win is architectural. Visible richness arrives in Phases 2–5.
