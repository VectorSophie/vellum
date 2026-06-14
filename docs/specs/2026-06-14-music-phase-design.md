# Vellum — Phase 5 Spec: Music (melody, key, backing track, tempo)

**Status:** for review · **Date:** 2026-06-14 · **Phase:** 5 of 5 (… Look → Capture → **Music**)

## Context

The finale. Today every syllable plays at ~base pitch — the music comes from the bgm + on‑beat placement, but the *voice itself is melodically flat*. Phase 5 makes what you write into an actual **tune**, with user control over melody, key, the backing track, and (carefully) tempo.

Engine facts that shape this:
- **Pitch is per‑syllable, in semitones**, delivered through `playHiragana`'s pitch path (the same mechanism the per‑voice transpose uses, proven working). So a melody = choosing a semitone per syllable.
- **bgm** (`data/bgm.mp3`) is a loop quantized to **BPM 130** (`audioMng = new f(2*BPM)`). It's recorded at that tempo, so changing tempo desyncs it.
- The song is the `_hiraganas` array; `draw()` sings the newest syllable and `_changeBeat → _playHiragana` re‑sings the history on the beat. Both are pitch injection points.

## Goal

A **MUSIC** menu section: **melody mode**, **scale**, **key (전조)**, **backing track (반주)**, and **tempo (빠르기)** — turning free writing into a melodic, in‑key song that still rides the beat.

## Non-goals
- Full step sequencer / piano‑roll editing, MIDI export, multi‑track. Per‑syllable melody only.
- Time‑stretching the bgm to arbitrary tempo (too lossy) — tempo is handled by coupling (below).

## Design

A `window.Vellum.music = { melody, scale, key, bgm, bpm }` state (persisted via config), read where syllables are pitched.

### 1. Melody — `pitch(i)` per syllable
For the syllable at index `i` in the song, compute a semitone offset from a **scale** and **melody mode**:
- **scales** (semitone sets): `펜타(major pentatonic) [0,2,4,7,9]`, `단펜타(minor pentatonic) [0,3,5,7,10]`, `메이저 [0,2,4,5,7,9,11]`, `마이너 [0,2,3,5,7,8,10]`.
- **modes**:
  - **끔 (off)** — flat (current behavior).
  - **순차 (walk)** — degree = `i mod scale.length` (+ octave every wrap) → rising runs.
  - **물결 (wave)** — degree follows an up‑then‑down contour over the song length.
  - **랜덤 (random)** — a random in‑scale degree per syllable (seeded by `i` so it's stable on re‑sing).
- `pitch(i) = key + octaveStep + scale[degree]` (semitones). Stable per index so the looping re‑sing keeps the same tune.

Injection: `draw()` pitches the new syllable by `pitch(history.length)`; `_playHiragana` pitches the re‑sung syllable by `pitch(itsIndex)`. Combined with the per‑voice transpose (added, not replaced).

### 2. Key (전조)
A global semitone shift (`music.key`), e.g. select **낮게(−5) / 기본(0) / 높게(+5) / +7**. Added into `pitch(i)`. Lets the user move the whole melody to sit better over the bgm / their taste.

### 3. Backing track (반주)
Select **기본 (bgm) / 없음 (mute)**, plus **업로드** (load a local audio file → replace the loop source via `aidn.AutoAudio`). Mute = set the bgm loop volume to 0 (keep the beat clock running so timing/sync is unchanged).

### 4. Tempo (빠르기) — coupled to bgm
Changing the beat interval desyncs the recorded bgm, so:
- When **반주 = 기본**, tempo is **locked** (130) to preserve sync.
- When **반주 = 없음** (or uploaded with no fixed tempo), enable **느리게 / 기본 / 빠르게** → adjust the audioMng beat interval. (Investigate whether `f`'s interval is settable at runtime; if not, recreate the loop‑less manager.)

## Integration points
- New `js/music.js`: `Vellum.music` state + `pitch(i)` + scale/mode tables + persistence; loaded before `app.js`.
- `app.js`: in `draw()` and `_playHiragana`, pass `Vellum.music.pitch(index)` into `playHiragana` (added to voice transpose); bgm volume control + (optional) tempo on the audioMng; MUSIC UI in the menu controller (next to LOOK/CAPTURE); extend `_currentSong`/`_applySong` + serialize so music settings travel in song links/presets.
- Verify the exact semitone path end‑to‑end first (the per‑voice transpose chain) and reuse it.

## Verification
1. **Melody 순차 + 펜타** → writing a line produces a rising in‑key run; **끔** → flat again.
2. **물결 / 랜덤** sound melodic and stay in key; re‑sing on the beat keeps the same tune (stable per index).
3. **전조 높게/낮게** shifts the whole melody; still on beat.
4. **반주 없음** mutes the track but the beat/timing is unchanged; **기본** restores it; **업로드** swaps in a local file.
5. **빠르기** adjustable only when 반주=없음; locked otherwise.
6. Music settings ride along in **링크 복사** + presets; persist on reload; console clean.
