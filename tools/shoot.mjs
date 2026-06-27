// Phase 4 visual probe: screenshot Vellum across viewports. Run while a server is up on :8000.
//   node tools/shoot.mjs
import { chromium, devices } from "playwright";
import fs from "fs";

const OUT = process.env.SHOTS || "tools/_shots";
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.URL || "http://127.0.0.1:8001/vellum/";

const targets = [
  { name: "desktop", opts: { viewport: { width: 1280, height: 800 } } },
  { name: "iphone13", opts: { ...devices["iPhone 13"] } },
  { name: "pixel5", opts: { ...devices["Pixel 5"] } },
];

const browser = await chromium.launch();
for (const t of targets) {
  const ctx = await browser.newContext(t.opts);
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  try {
    await page.goto(URL, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(3500); // fonts + 3D + loading scene
    await page.screenshot({ path: `${OUT}/${t.name}-1-start.png` });

    // tap to start
    await page.mouse.click(t.opts.viewport.width / 2, t.opts.viewport.height / 2);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${t.name}-2-main.png` });

    // open the menu
    await page.click("#bt_about", { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${t.name}-3-menu.png`, fullPage: false });
  } catch (e) {
    console.log(`[${t.name}] ERROR ${e.message}`);
  }
  console.log(`[${t.name}] ${t.opts.viewport.width}x${t.opts.viewport.height} console-errors: ${errs.length}`);
  errs.slice(0, 5).forEach((e) => console.log("   • " + e));
  await ctx.close();
}
await browser.close();
console.log("shots in " + OUT);
