import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--enable-webgl", "--use-angle=swiftshader"],
});
await mkdir("test-results", { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(`${process.cwd()}/dist/prototype.html`).href);
  await page.waitForFunction(
    () => window.albumPrototype?.ready && !window.albumPrototype.isRendering(),
  );
  await page.screenshot({ path: "test-results/3d-cover.png" });
  await page.evaluate(() => window.albumPrototype.navigate(2));
  await page.waitForFunction(
    () =>
      Math.abs(window.albumPrototype.currentSheet() - 2) < 0.01 &&
      !window.albumPrototype.isRendering(),
  );
  await page.screenshot({ path: "test-results/3d-open-spread.png" });
  // 拖拽中段与悬停：按住指针把封面往左拖，拖拽直接驱动弯折进度；0.32 处书页形变最直观，
  // 0.57 处背面与曲面投影同框，0.42 处停住即悬停（验收一反馈①的证据）。
  await page.keyboard.press("Home");
  await page.waitForFunction(
    () =>
      Math.abs(window.albumPrototype.currentSheet()) < 0.01 &&
      !window.albumPrototype.isRendering(),
  );
  const bounds = await page.locator("#book-scene").boundingBox();
  const centerY = bounds.y + bounds.height / 2;
  const progress = () =>
    page.evaluate(() => window.albumPrototype.currentSheet());
  await page.mouse.move(bounds.x + bounds.width / 2, centerY);
  await page.mouse.down();
  for (let step = 1; step <= 60 && (await progress()) < 0.32; step += 1) {
    await page.mouse.move(bounds.x + bounds.width / 2 - step * 8, centerY);
  }
  if ((await progress()) < 0.28)
    throw new Error(`drag only reached ${await progress()}, expected ~.32`);
  await page.screenshot({ path: "test-results/3d-midflip-drag.png" });
  for (let step = 6; step <= 60 && (await progress()) < 0.57; step += 1) {
    await page.mouse.move(bounds.x + bounds.width / 2 - step * 8, centerY);
  }
  if ((await progress()) < 0.52)
    throw new Error(`drag only reached ${await progress()}, expected ~.57`);
  await page.screenshot({ path: "test-results/3d-midflip-shadow.png" });
  for (let offset = 251; ; offset -= 6) {
    await page.mouse.move(bounds.x + bounds.width / 2 - offset, centerY);
    if ((await progress()) <= 0.46) break;
  }
  await page.waitForTimeout(400);
  const held = await progress();
  if (held < 0.36 || held > 0.48)
    throw new Error(`hover held at ${held}, expected ~.42`);
  await page.screenshot({ path: "test-results/3d-hover-hold.png" });
  await page.mouse.up();
  await page.waitForFunction(
    () =>
      Math.abs(window.albumPrototype.currentSheet()) < 0.01 &&
      !window.albumPrototype.isRendering(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Home");
  await page.waitForFunction(
    () =>
      Math.abs(window.albumPrototype.currentSheet()) < 0.01 &&
      !window.albumPrototype.isRendering(),
  );
  await page.evaluate(() => window.albumPrototype.navigate(2));
  await page.waitForFunction(
    () =>
      window.albumPrototype.currentPage() === 2 &&
      Math.abs(window.albumPrototype.currentSheet() - 1) < 0.01 &&
      !window.albumPrototype.isRendering(),
  );
  await page.screenshot({ path: "test-results/3d-mobile.png" });
  console.log(
    "captured 3D cover, open spread, mid-flip bend/shadow, and mobile evidence",
  );
} finally {
  await browser.close();
}
