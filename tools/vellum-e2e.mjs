// Playwright check for the integrated experience (vellum.html):
// tetohira visual stack driven by the Korean jamo pipeline.
import { chromium } from 'playwright';
import { TEMPLATES } from '../js/jamo/templates.js';

const URL = 'http://localhost:3000/vellum.html';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !!window.__vellum, null, { timeout: 10000 });

let pass = 0, fail = 0;
const fails = [];
const check = (label, cond) => { if (cond) pass++; else { fail++; fails.push(label); } };

// tetohira instance reachable + scene starts at TOP
const pre = await page.evaluate(() => ({
  hasThree: !!window.__vellum.three,
  scene: window.app.Context.sceneId,
}));
check('adapter reached tetohira _three', pre.hasThree);
check('starts on TOP scene (got ' + pre.scene + ')', pre.scene === 1);

// Click to start -> MAIN scene
await page.mouse.click(450, 350);
await page.waitForTimeout(1500);
const sc = await page.evaluate(() => window.app.Context.sceneId);
check('reached MAIN scene after start (got ' + sc + ')', sc === 2);

// Wait for the overlay to enable input (polled every 150ms)
await page.waitForFunction(() => {
  const o = document.getElementById('jamo-overlay');
  return o && getComputedStyle(o).pointerEvents === 'auto';
}, null, { timeout: 3000 });

// Draw 가 (ㄱ then ㅏ) on the overlay via real pointer events.
const gi = TEMPLATES.find((t) => t.char === 'ㄱ').strokes;
const a = TEMPLATES.find((t) => t.char === 'ㅏ').strokes;
function pt(nx, ny, ox) { return [ox + nx * 150, 250 + ny * 150]; }
async function drawStroke(poly, ox) {
  const [sx, sy] = pt(poly[0][0], poly[0][1], ox);
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i < poly.length; i++) {
    const [x, y] = pt(poly[i][0], poly[i][1], ox);
    await page.mouse.move(x, y, { steps: 6 });
  }
  await page.mouse.up();
  await page.waitForTimeout(120);
}
let ox = 250;
for (const strokes of [gi, a]) {
  for (const st of strokes) await drawStroke(st, ox);
  ox += 170;
}
await page.waitForTimeout(800); // exceed idle -> syllable ends, block flies in

const block = await page.evaluate(() => window.__vellum.lastBlock());
check('drawing ㄱ+ㅏ flew 가 into scene (got ' + block + ')', block === '가');

// Replay a real captured 가 through the integration hook.
const real_ga = [
  [[517.6,345.4],[519.2,345.4],[528,343],[544.8,339],[568.8,335.8],[606.4,331.8],[632.8,331],[642.4,331],[644,331],[644.8,332.6],[646.4,345.4],[646.4,359],[644.8,380.6],[640,403],[638.4,407.8],[638.4,409.4],[637.6,409.4]],
  [[690.4,324.6],[692,327.8],[694.4,339],[695.2,355],[695.2,377.4],[695.2,399.8],[694.4,419],[693.6,425.4],[693.6,427],[692.8,427],[691.2,426.2],[689.6,423]],
  [[699.2,386.2],[700,384.6],[708.8,379.8],[719.2,375],[740,369.4],[757.6,367],[764.8,367],[768,367],[768.8,367]],
];
const fed = await page.evaluate((s) => window.__vellum.feed(s), real_ga);
check('real captured 가 via hook (got ' + fed + ')', fed === '가');

await page.waitForTimeout(600);
await page.screenshot({ path: 'tools/vellum-screenshot.png' });

check('no page errors (' + errors.slice(0, 3).join(' | ') + ')', errors.length === 0);

console.log('\n=== vellum integration e2e ===');
console.log('PASS ' + pass + '  FAIL ' + fail);
if (fails.length) { console.log('Failures:'); for (const f of fails) console.log('  x ' + f); }
console.log(fail === 0 ? '\nALL GREEN' : '\nRED');

await browser.close();
process.exit(fail === 0 ? 0 : 1);
