// Playwright end-to-end check for the jamo pipeline.
// Drives the real page: simulates pointer strokes, asserts composed output,
// and runs a full self-recognition sweep via the in-page harness.
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

// --- 1. Real pointer strokes: draw ㄱ then ㅏ -> 가 ---
const canvas = await page.$('#draw');
const box = await canvas.boundingBox();
function pt(nx, ny) { return [box.x + 200 + nx * 180, box.y + 150 + ny * 180]; }
async function drawStroke(poly) {
  const [sx, sy] = pt(poly[0][0], poly[0][1]);
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i < poly.length; i++) {
    const [x, y] = pt(poly[i][0], poly[i][1]);
    await page.mouse.move(x, y, { steps: 6 });
  }
  await page.mouse.up();
}
async function drawJamo(strokes) {
  for (const s of strokes) await drawStroke(s);
  await page.waitForTimeout(750); // exceed idle flush
}

const gi = TEMPLATES.find((t) => t.char === 'ㄱ');
const a = TEMPLATES.find((t) => t.char === 'ㅏ');
await drawJamo(gi.strokes);
await drawJamo(a.strokes);
const st = await page.evaluate(() => window.__jamo.state());
check('real strokes ㄱ+ㅏ -> 가 (got ' + st.syllable + ')', st.syllable === '가');
await page.screenshot({ path: 'tools/jamo-screenshot.png' });

// --- 2. Full self-recognition sweep via in-page recognize() (no pointer) ---
// Feed each template (scaled to canvas coords + jitter) through recognize().
function toCanvas(strokes, jitter) {
  const ox = 250, oy = 180, s = 220;
  return strokes.map((st) => st.map(([x, y]) => [
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

console.log('\n=== jamo e2e ===');
console.log('PASS ' + pass + '  FAIL ' + fail);
if (fails.length) { console.log('Failures:'); for (const f of fails) console.log('  ✗ ' + f); }
console.log(fail === 0 ? '\nALL GREEN' : '\nRED');

await browser.close();
process.exit(fail === 0 ? 0 : 1);
