// Touch-draw probe: on an iPhone context, draw a stroke and screenshot to confirm ink appears.
import { chromium, devices } from "playwright";
const URL = process.env.URL || "http://127.0.0.1:8001/vellum/";
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(3500);
await page.mouse.click(195, 330); // tap to start
await page.waitForTimeout(2000);
// draw a vertical-ish stroke via touch on the canvas
const cx = 195;
await page.touchscreen.tap(cx, 300);
const pts = [[cx, 250], [cx, 300], [cx, 350], [cx, 420], [cx + 30, 470]];
await page.evaluate((pts) => {
  const cv = document.querySelector("canvas#draw") || document.querySelector("canvas");
  const t = (x, y, type) => {
    const tch = new Touch({ identifier: 1, target: cv, clientX: x, clientY: y });
    cv.dispatchEvent(new TouchEvent(type, { touches: type === "touchend" ? [] : [tch], targetTouches: type === "touchend" ? [] : [tch], changedTouches: [tch], bubbles: true, cancelable: true }));
  };
  t(pts[0][0], pts[0][1], "touchstart");
  for (let i = 1; i < pts.length; i++) t(pts[i][0], pts[i][1], "touchmove");
  t(pts[pts.length - 1][0], pts[pts.length - 1][1], "touchend");
}, pts);
await page.waitForTimeout(1200);
await page.screenshot({ path: (process.env.SHOTS || "tools/_shots") + "/iphone13-4-draw.png" });
console.log("draw probe done");
await b.close();
