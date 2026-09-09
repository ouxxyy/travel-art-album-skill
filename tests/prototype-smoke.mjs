import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
await access(executablePath);
const browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-webgl", "--use-angle=swiftshader"] });
const requests = [];
const consoleErrors = [];
const startedAt = performance.now();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const cdp = await page.context().newCDPSession(page);
  page.setDefaultTimeout(8000);
  page.on("request", (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(pathToFileURL(`${process.cwd()}/dist/prototype.html`).href);
  await page.waitForFunction(() => window.albumPrototype?.ready === true);
  const readyMs = Math.round(performance.now() - startedAt);
  assert.equal(await page.evaluate(() => Boolean(window.albumPrototype.renderer.getContext())), true);
  assert.equal(await page.evaluate(() => window.albumPrototype.sheetCount), 4);
  assert.deepEqual(requests, []);
  assert.deepEqual(consoleErrors, []);

  const waitForSheet = (sheet) => page.waitForFunction((expected) => Math.abs(window.albumPrototype.currentSheet() - expected) < .01 && !window.albumPrototype.isRendering(), sheet);
  await page.locator("#next-page").click();
  await waitForSheet(1);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await page.locator("#next-page").click();
  await waitForSheet(4);
  assert.equal(await page.locator("#next-page").isDisabled(), true);
  await page.keyboard.press("End");
  await waitForSheet(4);
  await page.keyboard.press("Home");
  await waitForSheet(0);
  assert.equal(await page.locator("#previous-page").isDisabled(), true);

  const canvas = page.locator("#book-scene");
  const bounds = await canvas.boundingBox();
  assert.ok(bounds && bounds.width === 1280 && bounds.height === 800);
  await page.mouse.click(bounds.x + bounds.width * .72, bounds.y + bounds.height * .5);
  await waitForSheet(1);
  await page.mouse.move(bounds.x + bounds.width * .72, bounds.y + bounds.height * .5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .28, bounds.y + bounds.height * .5, { steps: 8 });
  await page.mouse.up();
  await waitForSheet(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Home");
  await waitForSheet(0);
  const mobileBounds = await canvas.boundingBox();
  const start = { x: mobileBounds.x + mobileBounds.width * .75, y: mobileBounds.y + mobileBounds.height * .5 };
  const end = { x: mobileBounds.x + mobileBounds.width * .25, y: start.y };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start.x, y: start.y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: end.x, y: end.y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await waitForSheet(1);
  assert.equal(await page.evaluate(() => window.albumPrototype.currentPage()), 1);
  assert.ok(await page.evaluate(() => window.albumPrototype.currentFocus() > .3));
  await page.locator("#next-page").click();
  await page.waitForFunction(() => window.albumPrototype.currentPage() === 2 && Math.abs(window.albumPrototype.currentSheet() - 1) < .01 && window.albumPrototype.currentFocus() < -.3 && !window.albumPrototype.isRendering());
  await page.locator("#previous-page").click();
  await page.waitForFunction(() => window.albumPrototype.currentPage() === 1 && window.albumPrototype.currentFocus() > .3 && !window.albumPrototype.isRendering());
  await page.keyboard.press("Home");
  await waitForSheet(0);

  const beforeIdle = await page.evaluate(() => window.albumPrototype.renderCount());
  await page.waitForTimeout(300);
  const afterIdle = await page.evaluate(() => window.albumPrototype.renderCount());
  assert.equal(afterIdle, beforeIdle);
  assert.deepEqual(requests, []);
  assert.deepEqual(consoleErrors, []);
  console.log(`3D prototype smoke passed: ready ${readyMs}ms; file:// offline; WebGL; click/drag/touch; buttons/keyboard; queued bounds; idle render parked`);
} finally {
  await browser.close();
}
