/*
 * voicebank.js — loads voicebank manifests and holds the active-bank state.
 * Pure data/state; the actual sample loading + switching lives in app.js (which
 * has the audio instance). A bank = { id, name, loader:"codec"|"standard",
 * base, subs, transpose, samples{index->[files]}, theme, credits }.
 */
(function (g) {
  "use strict";
  var IDS = ["teto", "adachi", "defoko", "koharune"];
  var V = g.Vellum = g.Vellum || {};
  V.banks = {};
  V.activeId = null;
  V.pitch = 0;           // active bank transpose in semitones (engine converts to rate)
  V.ready = false;
  V._cbs = [];
  V.onReady = function (cb) { V.ready ? cb() : V._cbs.push(cb); };
  V.list = function () { return IDS.map(function (id) { return V.banks[id]; }).filter(Boolean); };
  V._init = function () {
    Promise.all(IDS.map(function (id) {
      return fetch("banks/" + id + "/manifest.json")
        .then(function (r) { return r.json(); })
        .then(function (m) { V.banks[id] = m; })
        .catch(function (e) { console.warn("voicebank load failed:", id, e); });
    })).then(function () {
      V.ready = true;
      V._cbs.forEach(function (cb) { try { cb(); } catch (e) { console.warn(e); } });
      V._cbs = [];
    });
  };
  V._init();
})(window);
