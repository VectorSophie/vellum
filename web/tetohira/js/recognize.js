/*
 * recognize.js — Hangul handwriting recognition via Google Input Tools.
 * Replaces tetohira's built-in hiragana stroke-matcher.
 *
 * recognizeHangul(strokes, width, height) -> Promise<string[]>
 *   strokes: [ [ [x,y], [x,y], ... ], ... ]  (one inner array per pen stroke)
 *   returns: array of candidate strings (best first), or [] on failure.
 */
(function (global) {
  "use strict";

  var ENDPOINT = "https://www.google.com/inputtools/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8";

  function recognizeHangul(strokes, width, height) {
    if (!strokes || !strokes.length) return Promise.resolve([]);

    // Google ink format: per stroke -> [ [x...], [y...], [t...] ]
    var ink = strokes.map(function (st) {
      var xs = [], ys = [], ts = [];
      for (var i = 0; i < st.length; i++) {
        xs.push(Math.round(st[i][0]));
        ys.push(Math.round(st[i][1]));
        ts.push(i * 12);
      }
      return [xs, ys, ts];
    });

    var body = {
      options: "enable_pre_space",
      requests: [{
        writing_guide: { writing_area_width: width, writing_area_height: height },
        ink: ink,
        language: "ko"
      }]
    };

    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json();
    }).then(function (data) {
      // ["SUCCESS", [ [ "<token>", [cand1, cand2, ...], ... ] ] ]
      if (data && data[0] === "SUCCESS" && data[1] && data[1][0] && data[1][0][1]) {
        return data[1][0][1];
      }
      return [];
    });
  }

  // Pick the best candidate that is a single Hangul syllable block; fall back to
  // the first character of the top candidate.
  function pickHangul(cands) {
    if (!cands || !cands.length) return null;
    for (var i = 0; i < cands.length; i++) {
      var ch = cands[i] && cands[i].charAt(0);
      var cc = ch ? ch.charCodeAt(0) : 0;
      if (0xAC00 <= cc && cc <= 0xD7A3) return ch;
    }
    return cands[0] ? cands[0].charAt(0) : null;
  }

  global.recognizeHangul = recognizeHangul;
  global.pickHangul = pickHangul;
})(typeof window !== "undefined" ? window : this);
