// Phase 6 probe: open menu, confirm the bgm-upload row, upload a file, assert the loop swapped.
import { chromium } from "playwright";
import path from "path";
const URL = process.env.URL || "http://127.0.0.1:8001/vellum/";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));

const readLoops = () => page.evaluate(() => {
  let c = null;
  for (const k of Object.keys(window)) {
    try { const v = window[k]; if (v && v.Context && v.Context.main && v.Context.main._audio) { c = v.Context.main; break; } } catch (e) {}
  }
  if (!c || !c._audio || !c._audio._audioMng) return { ok: false };
  const m = c._audio._audioMng;
  return { ok: true, loops: m._audioLoops.length, bgmIdx: m._audioLoops.indexOf(c._audio._bgmLoop) };
});

await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(3500);
await page.mouse.click(640, 450); // start
await page.waitForTimeout(2000);
await page.click("#bt_about");
await page.waitForTimeout(1200);

const hasRow = await page.locator("#about .bgmup .bgmfile").count();
await page.screenshot({ path: (process.env.SHOTS || "tools/_shots") + "/desktop-5-bgmrow.png" });
const before = await readLoops();

await page.setInputFiles("#about .bgmup input[type=file]", path.resolve("web/vellum/data/bgm.mp3"));
await page.waitForTimeout(1500);
const after = await readLoops();

await page.locator("#about .music").scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: (process.env.SHOTS || "tools/_shots") + "/desktop-6-musicrow.png" });

console.log("bgmRow present:", hasRow === 1);
console.log("before:", JSON.stringify(before));
console.log("after :", JSON.stringify(after));
console.log("console-errors:", errs.length);
errs.slice(0, 6).forEach((e) => console.log("  • " + e));
await b.close();
