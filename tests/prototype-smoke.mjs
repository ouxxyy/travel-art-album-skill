import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const executablePath =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
await access(executablePath);
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--enable-webgl", "--use-angle=swiftshader"],
});
const requests = [];
const consoleErrors = [];
const startedAt = performance.now();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  const cdp = await page.context().newCDPSession(page);
  page.setDefaultTimeout(8000);
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(pathToFileURL(`${process.cwd()}/dist/prototype.html`).href);
  await page.waitForFunction(() => window.albumPrototype?.ready === true);
  const readyMs = Math.round(performance.now() - startedAt);
  assert.equal(
    await page.evaluate(() =>
      Boolean(window.albumPrototype.renderer.getContext()),
    ),
    true,
  );
  assert.equal(await page.evaluate(() => window.albumPrototype.sheetCount), 4);
  assert.deepEqual(requests, []);
  assert.deepEqual(consoleErrors, []);

  const waitForSheet = (sheet) =>
    page.waitForFunction(
      (expected) =>
        Math.abs(window.albumPrototype.currentSheet() - expected) < 0.01 &&
        !window.albumPrototype.isRendering(),
      sheet,
    );
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
  await page.mouse.click(
    bounds.x + bounds.width * 0.72,
    bounds.y + bounds.height * 0.5,
  );
  await waitForSheet(1);
  await page.mouse.move(
    bounds.x + bounds.width * 0.72,
    bounds.y + bounds.height * 0.5,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.28,
    bounds.y + bounds.height * 0.5,
    { steps: 8 },
  );
  await page.mouse.up();
  await waitForSheet(2);

  // 验收一反馈①：拖到一半停住能悬停，松手回弹，不再自动翻完。
  await page.keyboard.press("Home");
  await waitForSheet(0);
  const hover = { x: bounds.x + bounds.width * 0.5, y: bounds.y + bounds.height * 0.5 };
  await page.mouse.move(hover.x, hover.y);
  await page.mouse.down();
  await page.mouse.move(hover.x - 150, hover.y, { steps: 6 });
  await page.waitForTimeout(250);
  const heldProgress = await page.evaluate(() => window.albumPrototype.currentSheet());
  await page.waitForTimeout(250);
  const heldAgain = await page.evaluate(() => window.albumPrototype.currentSheet());
  assert.ok(heldProgress > 0.2 && heldProgress < 0.6, `hover held at ${heldProgress}`);
  assert.ok(Math.abs(heldAgain - heldProgress) < 0.02, `hover drifted ${heldProgress} -> ${heldAgain}`);
  await page.mouse.up();
  await page.waitForFunction(() => window.albumPrototype.targetSheet() === 0);
  await waitForSheet(0);

  // 真实甩动仍会补完：同步派发事件，时间间隔趋近零，速度判定不受无头渲染停顿影响。
  await page.evaluate(() => {
    const scene = document.querySelector("#book-scene");
    const rect = scene.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    const dispatch = (x, type) =>
      scene.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 7,
          isPrimary: true,
          clientX: x,
          clientY: y,
          bubbles: true,
        }),
      );
    dispatch(rect.left + rect.width / 2, "pointerdown");
    dispatch(rect.left + rect.width / 2 - 120, "pointermove");
    dispatch(rect.left + rect.width / 2 - 120, "pointerup");
  });
  await page.waitForFunction(() => window.albumPrototype.targetSheet() === 1);
  await waitForSheet(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Home");
  await waitForSheet(0);
  const mobileBounds = await canvas.boundingBox();
  const start = {
    x: mobileBounds.x + mobileBounds.width * 0.75,
    y: mobileBounds.y + mobileBounds.height * 0.5,
  };
  const end = { x: mobileBounds.x + mobileBounds.width * 0.25, y: start.y };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: start.x, y: start.y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: end.x, y: end.y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await waitForSheet(1);
  assert.equal(
    await page.evaluate(() => window.albumPrototype.currentPage()),
    1,
  );
  assert.ok(
    await page.evaluate(() => window.albumPrototype.currentFocus() > 0.3),
  );
  await page.locator("#next-page").click();
  await page.waitForFunction(
    () =>
      window.albumPrototype.currentPage() === 2 &&
      Math.abs(window.albumPrototype.currentSheet() - 1) < 0.01 &&
      window.albumPrototype.currentFocus() < -0.3 &&
      !window.albumPrototype.isRendering(),
  );
  await page.locator("#previous-page").click();
  await page.waitForFunction(
    () =>
      window.albumPrototype.currentPage() === 1 &&
      window.albumPrototype.currentFocus() > 0.3 &&
      !window.albumPrototype.isRendering(),
  );
  await page.keyboard.press("Home");
  await waitForSheet(0);

  const beforeIdle = await page.evaluate(() =>
    window.albumPrototype.renderCount(),
  );
  await page.waitForTimeout(300);
  const afterIdle = await page.evaluate(() =>
    window.albumPrototype.renderCount(),
  );
  assert.equal(afterIdle, beforeIdle);
  assert.deepEqual(requests, []);
  assert.deepEqual(consoleErrors, []);
  console.log(
    `3D prototype smoke passed: ready ${readyMs}ms; file:// offline; WebGL; click/drag/hover/flick/touch; buttons/keyboard; queued bounds; idle render parked`,
  );

  const fallbackPage = await browser.newPage({
    viewport: { width: 800, height: 600 },
  });
  const pageErrors = [];
  fallbackPage.on("pageerror", (error) => pageErrors.push(error.message));
  await fallbackPage.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(
      type,
      ...args
    ) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return original.call(this, type, ...args);
    };
  });
  await fallbackPage.goto(
    pathToFileURL(`${process.cwd()}/dist/prototype.html`).href,
  );
  await fallbackPage.waitForFunction(
    () => window.albumPrototype?.fallback === true,
  );
  assert.equal(await fallbackPage.locator("#fallback").isVisible(), true);
  assert.equal(await fallbackPage.locator("#loading").isHidden(), true);
  assert.deepEqual(pageErrors, []);
  await fallbackPage.close();
  console.log(
    "WebGL-unavailable fallback passed: visible message, loading stopped, no uncaught page error",
  );
} finally {
  await browser.close();
}
