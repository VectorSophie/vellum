// Playwright end-to-end check for the incremental jamo pipeline.
// Drives the real page: simulates per-stroke drawing with an idle gap to end
// the syllable, asserts the composed block, and replays a real captured sample.
import { chromium } from 'playwright';
import { TEMPLATES } from '../js/jamo/templates.js';

const URL = 'http://localhost:3000/jamo.html';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !!window.__jamo);

let pass = 0, fail = 0;
const fails = [];
function check(label, cond) { if (cond) pass++; else { fail++; fails.push(label); } }

const canvas = await page.$('#draw');
const box = await canvas.boundingBox();
function pt(nx, ny, ox, s) { return [box.x + ox + nx * s, box.y + 120 + ny * s]; }
async function drawStroke(poly, ox, s) {
  const [sx, sy] = pt(poly[0][0], poly[0][1], ox, s);
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i < poly.length; i++) {
    const [x, y] = pt(poly[i][0], poly[i][1], ox, s);
    await page.mouse.move(x, y, { steps: 6 });
  }
  await page.mouse.up();
  await page.waitForTimeout(120); // within-syllable gap (< idle)
}
// Draw a syllable: each jamo's strokes placed at a column offset, then idle.
async function drawSyllable(jamoStrokeSets) {
  let ox = 220;
  for (const strokes of jamoStrokeSets) {
    for (const st of strokes) await drawStroke(st, ox, 150);
    ox += 170; // next jamo to the right
  }
  await page.waitForTimeout(750); // exceed idle -> end syllable
}

// --- 1. Live incremental: draw ㄱ then ㅏ -> 가 ---
const gi = TEMPLATES.find((t) => t.char === 'ㄱ').strokes;
const a = TEMPLATES.find((t) => t.char === 'ㅏ').strokes;
await drawSyllable([gi, a]);
let st = await page.evaluate(() => window.__jamo.state());
check('incremental ㄱ+ㅏ -> 가 (got ' + st.syllable + ')', st.syllable === '가');
await page.screenshot({ path: 'tools/jamo-screenshot.png' });

// --- 2. Another: ㄴ then ㅗ -> 노 (vertical consonant + bottom vowel) ---
const n = TEMPLATES.find((t) => t.char === 'ㄴ').strokes;
const o = TEMPLATES.find((t) => t.char === 'ㅗ').strokes;
await drawSyllable([n, o]);
st = await page.evaluate(() => window.__jamo.state());
check('incremental ㄴ+ㅗ -> 노 (got ' + st.syllable + ')', st.syllable === '노');

// --- 3. Replay a real captured 가 (sample 1) via feedSyllable ---
const real_ga = [
  [[517.6,345.4],[519.2,345.4],[528,343],[544.8,339],[568.8,335.8],[606.4,331.8],[632.8,331],[642.4,331],[644,331],[644.8,332.6],[646.4,345.4],[646.4,359],[644.8,380.6],[640,403],[638.4,407.8],[638.4,409.4],[637.6,409.4]],
  [[690.4,324.6],[692,327.8],[694.4,339],[695.2,355],[695.2,377.4],[695.2,399.8],[694.4,419],[693.6,425.4],[693.6,427],[692.8,427],[691.2,426.2],[689.6,423]],
  [[699.2,386.2],[700,384.6],[708.8,379.8],[719.2,375],[740,369.4],[757.6,367],[764.8,367],[768,367],[768.8,367]],
];
const realRes = await page.evaluate((s) => window.__jamo.feedSyllable(s), real_ga);
check('real captured 가 -> 가 (got ' + realRes.block + ')', realRes.block === '가');

// --- 4. Self-recognition sweep (combined-path) ---
function toCanvas(strokes, jitter) {
  const ox = 250, oy = 180, s = 220;
  return strokes.map((stk) => stk.map(([x, y]) => [
    ox + x * s + (Math.random() - 0.5) * jitter,
    oy + y * s + (Math.random() - 0.5) * jitter,
  ]));
}
for (const t of TEMPLATES) {
  const strokes = toCanvas(t.strokes, 8);
  const got = await page.evaluate((s) => { const r = window.__jamo.recognize(s); return r ? r.char : null; }, strokes);
  check('recognize ' + t.char + ' (got ' + got + ')', got === t.char);
}

check('no console errors (' + errors.join(' | ') + ')', errors.length === 0);

console.log('\n=== jamo e2e (incremental) ===');
console.log('PASS ' + pass + '  FAIL ' + fail);
if (fails.length) { console.log('Failures:'); for (const f of fails) console.log('  x ' + f); }
console.log(fail === 0 ? '\nALL GREEN' : '\nRED');

await browser.close();
process.exit(fail === 0 ? 0 : 1);
