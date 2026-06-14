/*
 * capture.js — serialize a whole creation (lyrics + voice + look) into a URL hash,
 * and save/load named presets. Pairs with the controller's _applySong()/_currentSong().
 * Song shape: { l: "가나다", v: "adachi", k: {font,palette,effect,themeAuto} }
 */
(function (g) {
  "use strict";
  var KEY = "vellum.presets";

  function serialize(song) { return encodeURIComponent(JSON.stringify(song)); }
  function deserialize(raw) {
    if (!raw) return null;
    try {
      var o = JSON.parse(decodeURIComponent(raw));
      return (o && typeof o === "object" && ("l" in o || "v" in o || "k" in o)) ? o : null;
    } catch (e) { return null; }
  }
  function readPresets() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function writePresets(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  g.VellumCapture = {
    serialize: serialize,
    deserialize: deserialize,
    savePreset: function (name, song) { var p = readPresets(); p[name] = song; writePresets(p); },
    getPreset: function (name) { return readPresets()[name] || null; },
    deletePreset: function (name) { var p = readPresets(); delete p[name]; writePresets(p); },
    presetNames: function () { return Object.keys(readPresets()); }
  };
})(window);
