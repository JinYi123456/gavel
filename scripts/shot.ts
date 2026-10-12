// Design QA tool: screenshot any page (file:// or http://) to a PNG.
// Usage: node scripts/shot.ts <url> <out.png> [width] [full|viewport]

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";

const [url, out, widthArg, modeArg] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: node scripts/shot.ts <url> <out.png> [width] [full|viewport]");
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = isAbsolute(out) ? out : join(root, out);
const width = widthArg ? Number(widthArg) : 900;
const fullPage = modeArg !== "viewport";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1200 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: outPath, fullPage });
await browser.close();
console.log(`shot -> ${outPath}`);
