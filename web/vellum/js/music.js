/*
 * music.js — melody/key state + per-syllable pitch.
 * The controller sets Vellum.notePitch = Vellum.musicPitch(index) right before each
 * playHiragana() call; playHiragana adds it (with the per-voice transpose) as semitones.
 */
(function (g) {
  "use strict";
  var SCALES = {
    "펜타": [0, 2, 4, 7, 9],        // major pentatonic
    "단펜타": [0, 3, 5, 7, 10],      // minor pentatonic
    "메이저": [0, 2, 4, 5, 7, 9, 11],
    "마이너": [0, 2, 3, 5, 7, 8, 10]
  };
  var MODES = ["끔", "순차", "물결", "랜덤"];
  var KEYS = [ { id: "낮게", v: -5 }, { id: "기본", v: 0 }, { id: "높게", v: 5 }, { id: "+7", v: 7 } ];
  var TEMPOS = [ { id: "느리게", v: 100 }, { id: "기본", v: 130 }, { id: "빠르게", v: 160 } ];

  var V = g.Vellum = g.Vellum || {};
  V.SCALES = SCALES; V.MODES = MODES; V.KEYS = KEYS; V.TEMPOS = TEMPOS;
  V.music = { melody: "끔", scale: "펜타", key: "기본", keyVal: 0, bgm: true, tempo: "기본", bpm: 130 };
  V.notePitch = 0;

  function scaleArr() { return SCALES[V.music.scale] || SCALES["펜타"]; }
  function rng(i) { var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); } // stable per i

  // semitone offset for the syllable at index i
  V.musicPitch = function (i) {
    var m = V.music.melody, key = V.music.keyVal || 0;
    if (!m || m === "끔") return key;
    var s = scaleArr(), n = s.length, deg = 0, oct = 0;
    if (m === "순차") { deg = i % n; oct = Math.floor(i / n) % 3; }
    else if (m === "물결") { var per = 8, p = i % (2 * per), step = p < per ? p : 2 * per - p; deg = step % n; oct = Math.floor(step / n) % 2; }
    else { deg = Math.floor(rng(i) * n); oct = rng(i + 99) < 0.3 ? 1 : 0; } // 랜덤 (stable, in-scale)
    return key + oct * 12 + s[deg];
  };

  function persist() { if (g.VellumConfig) g.VellumConfig.set("music", { melody: V.music.melody, scale: V.music.scale, key: V.music.key, bgm: V.music.bgm, tempo: V.music.tempo }); }
  V.setMelody = function (m) { V.music.melody = m; persist(); };
  V.setScale = function (s) { V.music.scale = s; persist(); };
  V.setKey = function (id) { var k = KEYS.filter(function (x) { return x.id === id; })[0] || KEYS[1]; V.music.key = k.id; V.music.keyVal = k.v; persist(); };
  V.setBgm = function (on) { V.music.bgm = !!on; persist(); };
  V.setTempo = function (id) { var t = TEMPOS.filter(function (x) { return x.id === id; })[0] || TEMPOS[1]; V.music.tempo = t.id; V.music.bpm = t.v; persist(); };
  V.restoreMusic = function () {
    if (!g.VellumConfig) return;
    var s = g.VellumConfig.get("music", null);
    if (!s) return;
    s.melody && V.setMelody(s.melody); s.scale && V.setScale(s.scale); s.key && V.setKey(s.key);
    if (typeof s.bgm === "boolean") V.setBgm(s.bgm); s.tempo && V.setTempo(s.tempo);
  };
})(window);
