# Vellum

> 한글을 쓰면 노래가 됩니다 — write Hangul on the screen and it sings.

Vellum is a Korean, voicebank-pluggable fork of daniwell's **tetohira** (てとひら).
You handwrite a Hangul syllable; it's recognized, mapped to the nearest Japanese
mora, and sung — on the beat — by a swappable voice. It sits in the same family as
[tetohira](https://aidn.jp/tetohira/) (Teto) and [otohira](https://aidn.jp/otohira/)
(Miku), with the twist that **the voice, look, and music are user-controllable.**

## Run locally

The app uses `fetch()`, so it must be served over HTTP (not opened from `file://`).
Serve from `web/` (not `web/vellum/`) — the page loads `../shared/js/common.js@22`,
which lives one level up and **defines the engine's `aidn` global**; serving the
inner folder 404s it and the app silently dies.

```sh
cd web
python -m http.server 8000
# open http://localhost:8000/vellum/  → menu → pick a voice → write 가나다
```

## Voicebanks

A voice is a manifest-driven bank under `web/vellum/banks/<id>/`:

- **`teto`** — daniwell's original codec-packed samples (loader: `codec`).
- **`adachi`, `defoko`** — UTAU banks sliced to per-mora `.mp3` (loader: `standard`).

The sliced audio is **gitignored** (rebuildable, and licensing varies — see
[CREDITS.md](CREDITS.md)); only the manifests are tracked. To regenerate:

```sh
npm install        # adm-zip
scripts/build-banks.sh        # needs ffmpeg/ffprobe, 7z
```

`scripts/build-bank.js` parses each bank's `oto.ini` (Shift-JIS), slices each mora
with ffmpeg, and RMS-normalizes every clip to a consistent −16 dB with a peak guard.
Useful knobs:

- `STACCATO_MS=200` — staccato cut length (shorter = tighter "가!").
- `REVERB=0` — disable the baked ambience tail.

```sh
node scripts/build-bank.js <id> <zip|dir> "<display name>" <transpose> [font] [hex,hex]
```

## Credits & licensing

See **[CREDITS.md](CREDITS.md)**. Short version: the rendering engine is daniwell's
(proprietary), so **public hosting needs daniwell's permission**. Among the voices,
Adachi Rei and Koharune Ami are cleared for redistribution; Defoko is kept local-only.
