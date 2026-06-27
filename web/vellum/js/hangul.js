/*
 * hangul.js — maps a Hangul syllable block to the nearest Japanese mora (kana)
 * that exists in tetohira's voice set (D._list). The engine's toNumFromStr()
 * calls hangulToKana() so Teto sings the mapped kana while the screen still
 * shows the Hangul glyph.
 *
 * v1: approximate by design. 받침(final consonant) is ignored for sound to keep
 * the one-glyph-one-beat rhythm; the glyph still shows the full block.
 * Target kana are all confirmed present in D._list.
 */
(function (global) {
  "use strict";

  // 초성 index (0..18) -> consonant "row" key
  //            ㄱ   ㄲ   ㄴ   ㄷ   ㄸ   ㄹ   ㅁ   ㅂ   ㅃ   ㅅ   ㅆ   ㅇ   ㅈ   ㅉ   ㅊ    ㅋ   ㅌ   ㅍ   ㅎ
  var CHO_ROW = ["k","k","n","t","t","r","m","b","b","s","s","" ,"j","j","ch","k","t","p","h"];

  // 중성 index (0..20) -> vowel "slot"
  //             ㅏ   ㅐ   ㅑ    ㅒ   ㅓ   ㅔ   ㅕ    ㅖ   ㅗ   ㅘ    ㅙ   ㅚ   ㅛ    ㅜ   ㅝ   ㅞ   ㅟ   ㅠ    ㅡ   ㅢ   ㅣ
  var JUNG_SLOT = ["a","e","ya","e","o","e","yo","e","o","wa","e","e","yo","u","o","e","i","yu","u","i","i"];

  // consonant rows -> kana per slot (all present in D._list)
  var ROWS = {
    k:  {a:"か", i:"き", u:"く", e:"け", o:"こ", ya:"きゃ", yu:"きゅ", yo:"きょ"},
    n:  {a:"な", i:"に", u:"ぬ", e:"ね", o:"の", ya:"にゃ", yu:"にゅ", yo:"にょ"},
    t:  {a:"た", i:"ち", u:"つ", e:"て", o:"と", ya:"ちゃ", yu:"ちゅ", yo:"ちょ"},
    r:  {a:"ら", i:"り", u:"る", e:"れ", o:"ろ", ya:"りゃ", yu:"りゅ", yo:"りょ"},
    m:  {a:"ま", i:"み", u:"む", e:"め", o:"も", ya:"みゃ", yu:"みゅ", yo:"みょ"},
    b:  {a:"ば", i:"び", u:"ぶ", e:"べ", o:"ぼ", ya:"びゃ", yu:"びゅ", yo:"びょ"},
    p:  {a:"ぱ", i:"ぴ", u:"ぷ", e:"ぺ", o:"ぽ", ya:"ぴゃ", yu:"ぴゅ", yo:"ぴょ"},
    s:  {a:"さ", i:"し", u:"す", e:"せ", o:"そ", ya:"しゃ", yu:"しゅ", yo:"しょ"},
    j:  {a:"じゃ", i:"じ", u:"じゅ", e:"じぇ", o:"じょ", ya:"じゃ", yu:"じゅ", yo:"じょ"},
    ch: {a:"ちゃ", i:"ち", u:"ちゅ", e:"ちぇ", o:"ちょ", ya:"ちゃ", yu:"ちゅ", yo:"ちょ"},
    h:  {a:"は", i:"ひ", u:"ふ", e:"へ", o:"ほ", ya:"ひゃ", yu:"ひゅ", yo:"ひょ"},
    "": {a:"あ", i:"い", u:"う", e:"え", o:"お", ya:"や", yu:"ゆ", yo:"よ", wa:"わ"} // ㅇ: vowel only
  };

  function decompose(ch) {
    var code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return null;
    return { cho: Math.floor(code / 588), jung: Math.floor((code % 588) / 28), jong: code % 28 };
  }

  // Returns a kana string present in D._list, or null if not a Hangul syllable.
  function hangulToKana(ch) {
    if (!ch || typeof ch !== "string") return null;
    var d = decompose(ch);
    if (!d) return null;
    var row = ROWS[CHO_ROW[d.cho]];
    var slot = JUNG_SLOT[d.jung];
    return row[slot] || row.a; // 'wa' on a consonant row falls back to 'a'
  }

  // Final consonant (받침) -> a short coda kana, by Korean's 7-way final neutralization
  // mapped to the nearest kana the voice set actually has. t-group (ㄷㅅㅈㅊㅌㅎ…) has no
  // clean kana (Korean's unreleased stop ≈ a glottal cut), so it stays silent. null if no 받침.
  // Indexed by jong (0..27): ㄱㄲㄳ→く  ㄴㄵㄶ/ㅁㄻ/ㅇ→ん  ㄹㄼㄽㄾㅀ→る  ㅂㅍㅄㄿ→ぷ  ㄺ→く  t-group→null
  var CODA = [null, "く", "く", "く", "ん", "ん", "ん", null, "る", "く", "ん", "る", "る", "る", "ぷ", "る", "ん", "ぷ", "ぷ", null, null, "ん", null, null, "く", null, "ぷ", null];
  function hangulCoda(ch) {
    var d = decompose(ch);
    if (!d) return null;
    return CODA[d.jong] || null;
  }

  global.hangulToKana = hangulToKana;
  global.hangulCoda = hangulCoda;
  global.hangulDecompose = decompose;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { hangulToKana: hangulToKana, hangulCoda: hangulCoda, decompose: decompose };
  }
})(typeof window !== "undefined" ? window : this);
