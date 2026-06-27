/* Tiny assert-based tests for hangul.js (run: node test/hangul.test.js). No framework. */
const assert = require("assert");
const { hangulToKana, hangulCoda } = require("../web/vellum/js/hangul.js");

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log("ok   " + name); }
  catch (e) { fail++; process.exitCode = 1; console.log("FAIL " + name + " — " + e.message); }
}

// --- 받침 codas: 7-way Korean final neutralization -> nearest available kana ---
t("nasal finals -> ん (ㄴ/ㅁ/ㅇ)", () => {
  assert.strictEqual(hangulCoda("간"), "ん");
  assert.strictEqual(hangulCoda("감"), "ん");
  assert.strictEqual(hangulCoda("강"), "ん");
});
t("k-group final -> く (ㄱ/ㄲ/ㅋ)", () => {
  assert.strictEqual(hangulCoda("각"), "く");
  assert.strictEqual(hangulCoda("밖"), "く"); // ㄲ
  assert.strictEqual(hangulCoda("엌"), "く"); // ㅋ
});
t("l-group final -> る (ㄹ)", () => {
  assert.strictEqual(hangulCoda("갈"), "る");
  assert.strictEqual(hangulCoda("들"), "る");
});
t("p-group final -> ぷ (ㅂ/ㅍ)", () => {
  assert.strictEqual(hangulCoda("갑"), "ぷ");
  assert.strictEqual(hangulCoda("앞"), "ぷ"); // ㅍ
});
t("t-group finals stay silent (ㄷ/ㅅ/ㅈ/ㅊ/ㅌ/ㅎ)", () => {
  assert.strictEqual(hangulCoda("갓"), null); // ㅅ
  assert.strictEqual(hangulCoda("낮"), null); // ㅈ
  assert.strictEqual(hangulCoda("빛"), null); // ㅊ
});
t("no final -> null", () => {
  assert.strictEqual(hangulCoda("가"), null);
  assert.strictEqual(hangulCoda("a"), null);
});

// --- vowels / w-diphthongs (limited by the kana inventory: only わ/を exist) ---
t("와 -> わ, 워 -> を (vowel-initial w-glide)", () => {
  assert.strictEqual(hangulToKana("와"), "わ");
  assert.strictEqual(hangulToKana("워"), "を");
  assert.strictEqual(hangulToKana("원"), "を"); // coda is separate
});
t("consonant + w-glide keeps the base vowel kana (no 2-beat split)", () => {
  assert.strictEqual(hangulToKana("과"), "か"); // kwa -> ka
  assert.strictEqual(hangulToKana("궈"), "こ"); // kwo -> ko
});
t("core CV syllables map correctly (3a lock)", () => {
  assert.strictEqual(hangulToKana("사"), "さ");
  assert.strictEqual(hangulToKana("랑"), "ら");
  assert.strictEqual(hangulToKana("녕"), "にょ"); // n + ㅕ(yo slot)
  assert.strictEqual(hangulToKana("지"), "じ");
});

console.log("\n" + pass + " passed, " + fail + " failed");
