// Live end-to-end check: drive the full courtroom flow against a running URL.
// Usage: node scripts/e2e_live.ts <base-url> [out-dir]
// Exercises: intake -> exhibits -> officers -> gavel hold -> verdict -> sentence.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";

const [baseUrl, outArg] = process.argv.slice(2);
if (!baseUrl) {
  console.error("usage: node scripts/e2e_live.ts <base-url> [out-dir]");
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = outArg ? (isAbsolute(outArg) ? outArg : join(root, outArg)) : join(root, "data/tmp/live-qa");
mkdirSync(outDir, { recursive: true });

const CASE_TEXT =
  "POS MALAYSIA: Your parcel is held at our centre. A RM1.50 redelivery fee must be paid within 24 hours or the item is returned to sender. Pay now: http://poslaju-redeliver.top/pay";

const shot = async (page: import("playwright").Page, name: string) => {
  await page.screenshot({ path: join(outDir, name), fullPage: true });
  console.log("shot -> " + name);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
page.setDefaultTimeout(90_000);

try {
  const t0 = Date.now();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  console.log("loaded " + baseUrl);

  await page.fill("textarea", CASE_TEXT);
  await shot(page, "e2e-1-intake-filled.png");

  await page.getByRole("button", { name: /open the case/i }).click();
  console.log("case booked");

  const gavel = page.locator('button[aria-label^="Hold to swing"]');
  await gavel.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const b = document.querySelector('button[aria-label^="Hold to swing"]') as HTMLButtonElement | null;
    return !!b && !b.disabled;
  });
  console.log("officers done, gavel enabled @ " + ((Date.now() - t0) / 1000).toFixed(1) + "s");
  await shot(page, "e2e-2-trial-done.png");

  await gavel.hover();
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  console.log("gavel swung");

  const stamp = page.locator(".stamp-lg");
  await stamp.waitFor({ state: "visible" });
  const verdict = (await stamp.textContent())?.trim();
  console.log("verdict stamp: " + verdict);
  await shot(page, "e2e-3-verdict.png");

  await page.getByRole("button", { name: /judge another case/i }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await shot(page, "e2e-4-sentence.png");

  console.log("E2E OK in " + ((Date.now() - t0) / 1000).toFixed(1) + "s — verdict: " + verdict);
} finally {
  await browser.close();
}
