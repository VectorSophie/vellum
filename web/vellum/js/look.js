/*
 * look.js — Vellum's visual state (glyph font, color palette, effect intensity).
 * The engine reads window.Vellum.look at its random-font/color/effect sites
 * (with fallback to the built-in constants). Per-voice themes apply on switch.
 */
(function (g) {
  "use strict";
  var FONTS_ALL = ["Jua", "Gaegu", "Do Hyeon", "Black Han Sans", "Nanum Pen Script", "Dongle"];
  var PALETTES = [
    { id: "기본", colors: [0x0f181d, 0xd5214b] },
    { id: "파스텔", colors: [0xff8fb1, 0x8fd9ff, 0xa0e8a0] },
    { id: "네온", colors: [0x39ff14, 0xff2bd6, 0x00e5ff] },
    { id: "모노", colors: [0xffffff, 0x9aa3a8] },
    { id: "바다", colors: [0x48cae4, 0x0096c7, 0x90e0ef] }
  ];
  var EFFECTS = [ { id: "끔", rate: 0 }, { id: "은은", rate: 0.1 }, { id: "기본", rate: 0.22 }, { id: "과격", rate: 0.5 } ];

  var V = g.Vellum = g.Vellum || {};
  V.FONTS_ALL = FONTS_ALL;
  V.PALETTES = PALETTES;
  V.EFFECTS = EFFECTS;
  V.look = { font: "믹스", palette: "기본", effect: "기본", fonts: FONTS_ALL.slice(), colors: PALETTES[0].colors.slice(), effectRate: 0.22, themeAuto: true };

  function persist() {
    if (g.VellumConfig) g.VellumConfig.set("look", { font: V.look.font, palette: V.look.palette, effect: V.look.effect, themeAuto: V.look.themeAuto });
  }
  function pal(id) { return PALETTES.filter(function (p) { return p.id === id; })[0] || PALETTES[0]; }
  function eff(id) { return EFFECTS.filter(function (e) { return e.id === id; })[0] || EFFECTS[2]; }

  V.setFont = function (name) {                       // a font name or "믹스"
    V.look.font = name;
    V.look.fonts = (!name || name === "믹스") ? FONTS_ALL.slice() : [name];
    V.look.themeAuto = false; persist();
  };
  V.setPalette = function (id) {
    var p = pal(id); V.look.palette = p.id; V.look.colors = p.colors.slice();
    V.look.themeAuto = false; persist();
  };
  V.setEffect = function (id) {
    var e = eff(id); V.look.effect = e.id; V.look.effectRate = e.rate; persist();
  };
  V.setThemeAuto = function (on) { V.look.themeAuto = !!on; persist(); };

  // apply a voicebank's theme on switch (only when 테마 자동 is on)
  V.applyTheme = function (theme) {
    if (!V.look.themeAuto || !theme) return;
    if (theme.font) V.look.fonts = [theme.font];
    if (theme.colors && theme.colors.length) V.look.colors = theme.colors.slice();
  };

  V.restoreLook = function () {
    if (!g.VellumConfig) return;
    var s = g.VellumConfig.get("look", null);
    if (!s) return;
    if (s.effect) V.setEffect(s.effect);
    if (s.themeAuto === false) {
      if (s.font) V.setFont(s.font);
      if (s.palette) V.setPalette(s.palette);
    } else {
      V.look.themeAuto = true;
    }
  };
})(typeof window !== "undefined" ? window : this);
