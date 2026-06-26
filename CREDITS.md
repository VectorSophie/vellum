# Credits & Licensing

Vellum is built on other people's work. This file records who made what and what
each piece's terms allow, so the project can be shared responsibly.

> **Status legend** — ✅ cleared to redistribute/host · ⚠️ keep local / personal only
> · 🚧 needs permission before public hosting.

## Engine

| Component | By | Status | Notes |
|---|---|---|---|
| **tetohira** rendering/beat engine (`js/app.js`, `css/`, `data/`) | **daniwell** ([aidn.jp](https://aidn.jp/tetohira/)) | 🚧 | Proprietary, no open license. Vellum patches it at ~12 seams via `window.Vellum`; the engine itself is unchanged. **A public launch under our own brand needs daniwell's permission.** Personal/local use is fine. |
| Kasane Teto vocal (the `teto` bank, codec samples) | daniwell / Kasane Teto | 🚧 | Ships inside the engine's `data/`. The Teto *character* is broadly free per [official guidelines](https://kasaneteto.jp/); these specific samples are daniwell's. Tied to the engine above. |

## Voicebanks

| Bank | By | Status | Terms (summary) |
|---|---|---|---|
| **Adachi Rei** (足立レイ) `adachi` | みさいる / Missile ([site](https://mechanicalgirl.jp/adachi-rei/)) | ✅ | Bundled UTAU guideline: *"音源の再配布は可能 … プログラムや機器に組み込んでの使用も可能 … 改変後の再配布も可能."* Redistribution + embedding in programs explicitly allowed; doujin/individual use (paid or free) free. **Corporate commercial use → contact missile39@gmail.com first.** Keep a `log.txt` only if redistributing *as* "Adachi Rei." |
| **Defoko / Utane Uta** (唄音ウタ) `defoko` | Ameya/Aquestone | ⚠️ | Her voice derives from **AquesTalk Female-1** (A-quest), licensed for free distribution *bundled with UTAU*. Repackaging the samples into a hosted web app is outside that grant and legally gray. **Kept local-only; do not host publicly without confirming A-quest/Ameya terms.** |

## Recommended additional voice (not yet bundled)

| Bank | By | Status | Terms (summary) |
|---|---|---|---|
| **Koharune Ami** (Child CV) | amitaro ([list](https://amitaro.net/utau/en_ongen-list.html) · [license](https://amitaro.net/utau/licence01.html)) | ✅ | Among the most permissive in UTAU: redistribution of *processed* audio allowed (link back to terms), commercial OK with notify-after, pitch/volume/processing allowed, web-app use allowed. Credit **"Koharune Ami / amitaro."** Prohibits 18+/political/religious/violent use. Download is via Google Drive (manual). |

## Other assets

- **Korean fonts** (`fonts/`): Jua, Gaegu, Do Hyeon, Black Han Sans, Nanum Pen Script,
  Dongle — Google Fonts, SIL Open Font License (redistribution OK with the license file).
- **Handwriting recognition** (`js/recognize.js`): Google Input Tools — an external
  service called at runtime, not bundled. No offline guarantee (see the jamo-pipeline
  spike for a possible offline replacement).

## For a public launch

Ship only ✅ banks (Adachi, Koharune Ami-style permissive ones). Keep ⚠️ Defoko local.
The 🚧 engine is the gating item: get daniwell's blessing, or keep the deployment
personal/unlisted. When in doubt, read the terms file *inside* the voicebank package —
the wikis are often wrong.
