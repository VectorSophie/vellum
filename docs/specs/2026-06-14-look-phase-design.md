# Vellum — Phase 3 Spec: Look (fonts, colors, effects, per-voice themes)

**Status:** for review · **Date:** 2026-06-14 · **Phase:** 3 of 5 (Foundation → Voice → **Look** → Capture → Music)

## Context

Voices are now swappable (Phase 2). Phase 3 gives the user control over the **visual** side — the glyph **font**, **color palette**, and **glitch-effect intensity** — and makes each voice carry a **theme** that auto-applies when selected. Like Phase 1's voicebank work, the engine already does the rendering; we expose the knobs.

Today these are hardcoded:
- `l.FONTS = ["Jua","Gaegu","Do Hyeon"]` — glyph font, random per character (`getRandomFont`).
- `l.COLORS = [0x0F181D, 0xD5214B]` — glyph color, random per character (`getRandomColor`).
- `drawHiragana`: `Math.random() < .22 && (… RGBShift / HueShift / Slice / Mosaic / Stretch …)` — 22% chance to fire effects per character.

## Goal

A **LOOK** section in the menu that controls glyph font, color palette, and effect intensity; choices persist (localStorage) and each voicebank applies its own theme on selection (with a manual override).

## Non-goals (later)
- MP4 export / share / presets → Phase 4 (Capture)
- Tempo / key / melody mapping → Phase 5 (Music)
- Custom background shaders / mascot editor, freehand color pickers, font upload — keep Phase 3 to curated choices.

## Architecture

A single read-through state object the engine consults at its existing random-pick / effect sites, falling back to the current constants:

```js
window.Vellum.look = {
  fonts: ["Jua","Gaegu","Do Hyeon"],   // glyph font pool (random pick per char)
  colors: [0x0F181D, 0xD5214B],         // glyph color pool
  effectRate: 0.22                       // 0 = off … ~0.5 = wild
};
```

- **`config.js`** persists `look` selections (font choice, palette id, effect level).
- **`switchVoicebank`** applies the chosen voice's `manifest.theme` (font + colors) into `Vellum.look` — *unless* the user has set a manual override (a "테마 자동/수동" toggle). This is the long-promised use of the `theme` field already in every manifest.

### Engine hooks (small edits, all with fallback)
| Site (app.js) | Change |
|---|---|
| `getRandomFont` (~L7661) | pick from `Vellum.look.fonts` ‖ `this.FONTS` |
| `getRandomColor` (~L7662) | pick from `Vellum.look.colors` ‖ `this.COLORS` |
| `drawHiragana` effect gate (~L4315) | replace literal `.22` with `Vellum.look.effectRate` ‖ `.22` |

### UI (LOOK section in `#about`, below VOICE)
1. **Font** — choose the glyph font: `Jua` / `Gaegu` / `Do Hyeon` (+ a few added below) / **믹스** (random mix = current behavior). Styled like the VOICE select.
2. **Palette** — 4–5 preset swatch sets (e.g. *기본* navy+red, *파스텔*, *네온*, *모노*, *바다*). Click a swatch row to set `look.colors`.
3. **효과 (Effects)** — 4 levels: **끔(0)** / **은은(0.1)** / **기본(0.22)** / **과격(0.5)** → `look.effectRate`.
4. **테마 자동** — toggle: on = voice theme drives font+palette on switch; off = your manual picks stick across voices.

### Added fonts (single-file, like Phase 1)
To make the font picker meaningful, add ~3 more OFL Korean fonts (downloaded as single TTFs, served from `fonts/`, added to `korean.css` + the font pool): e.g. **Black Han Sans** (heavy display), **Nanum Pen Script** (handwritten), **Dongle** (rounded). Fonts are small/OFL → committed (unlike bank audio).

### Per-voice themes (manifest)
Fill in each bank's `theme`: Teto → {font:"Jua", colors:[navy,red]}; Adachi → {font:"Do Hyeon", colors:[cool/robotic palette]}. `switchVoicebank` applies these when 테마 자동 is on.

## Integration points
- New: extend `config.js` (look keys); add a `Vellum.look` default in `voicebank.js` (or a small `look.js`); LOOK UI built in the controller next to `_initVoicebanks`.
- Edit: `getRandomFont`/`getRandomColor`/`drawHiragana` read-sites; `_switchVoicebank` applies theme; `korean.css` + `FONTS` for new fonts; bank manifests' `theme`.

## Verification
1. Open menu → LOOK section present below VOICE.
2. **Font**: pick *Gaegu* → written glyphs render in Gaegu; pick *믹스* → mixed again.
3. **Palette**: pick *네온* → glyph colors change accordingly.
4. **Effects**: set *끔* → no glitch effects fire while writing; *과격* → frequent.
5. **테마 자동 on**: switch Teto→Adachi → font/palette change to Adachi's theme automatically; switch back → Teto's.
6. **테마 자동 off**: your manual font/palette persists across voice switches.
7. Reload → all LOOK choices persist; console clean.
