import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--enable-webgl", "--use-angle=swiftshader"],
});
await mkdir("test-results", { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(`${process.cwd()}/dist/prototype.html`).href);
  await page.waitForFunction(() => window.albumPrototype?.ready && !window.albumPrototype.isRendering());
  await page.screenshot({ path: "test-results/3d-cover.png" });
  await page.evaluate(() => window.albumPrototype.navigate(2));
  await page.waitForFunction(() => Math.abs(window.albumPrototype.currentSheet() - 2) < .01 && !window.albumPrototype.isRendering());
  await page.screenshot({ path: "test-results/3d-open-spread.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Home");
  await page.waitForFunction(() => Math.abs(window.albumPrototype.currentSheet()) < .01 && !window.albumPrototype.isRendering());
  await page.evaluate(() => window.albumPrototype.navigate(2));
  await page.waitForFunction(() => window.albumPrototype.currentPage() === 2 && Math.abs(window.albumPrototype.currentSheet() - 1) < .01 && !window.albumPrototype.isRendering());
  await page.screenshot({ path: "test-results/3d-mobile.png" });
  console.log("captured 3D cover, open spread, and mobile evidence");
} finally {
  await browser.close();
}
