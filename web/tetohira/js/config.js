/*
 * config.js — Vellum's serializable user config (voice/font/… selections).
 * Backed by localStorage; the seed for share links + presets in later phases.
 */
(function (g) {
  "use strict";
  var KEY = "vellum.config";
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  g.VellumConfig = {
    get: function (k, d) { var o = read(); return k in o ? o[k] : d; },
    set: function (k, v) { var o = read(); o[k] = v; write(o); },
    all: read
  };
})(window);
