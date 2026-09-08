import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
await access(executablePath);
const browser = await chromium.launch({ executablePath, headless: true });
const requests = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(3000);
  page.on("console", message => console.log(`[browser] ${message.type()}: ${message.text()}`));
  page.on("request", request => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  await page.goto(pathToFileURL(`${process.cwd()}/dist/prototype.html`).href);
  await page.waitForFunction(() => window.albumPrototype?.pageCount === 4);
  await page.waitForFunction(() => document.body.dataset.orientation === "landscape");
  assert.equal(await page.locator("#counter").textContent(), "1 / 4");
  assert.equal(await page.locator("#prev").isDisabled(), true);
  await page.locator("#next").click();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.body.dataset.page === "3");
  assert.equal(await page.locator("#next").isDisabled(), true);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
  assert.equal(await page.locator("#counter").textContent(), "4 / 4");
  await page.locator("#prev").click();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction(() => document.body.dataset.page === "0");
  assert.equal(await page.locator("#prev").isDisabled(), true);
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(500);
  assert.equal(await page.locator("#counter").textContent(), "1 / 4");
  assert.deepEqual(requests, []);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.orientation === "portrait");
  assert.equal(await page.locator("#counter").textContent(), "1 / 4");
  const book = await page.locator("#book").boundingBox();
  assert.ok(book, "mobile book must have a visible bounding box");
  await page.evaluate(({ book }) => {
    const target = document.querySelector(".stf__block");
    const touch = (x) => new Touch({
      identifier: 1, target,
      clientX: x, clientY: book.y + book.height * 0.5
    });
    const start = touch(book.x + book.width * 0.82);
    const end = touch(book.x + book.width * 0.18);
    target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, cancelable: true, touches: [start], changedTouches: [start] }));
    window.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, cancelable: true, touches: [end], changedTouches: [end] }));
    window.dispatchEvent(new TouchEvent("touchend", { bubbles: true, cancelable: true, touches: [], changedTouches: [end] }));
  }, { book });
  await page.waitForFunction(() => document.body.dataset.page === "1");
  await page.locator("#prev").click();
  await page.waitForFunction(() => document.body.dataset.page === "0");
  assert.equal(await page.locator("#prev").isDisabled(), true);
  assert.deepEqual(requests, []);
  console.log("prototype smoke passed: file:// offline; desktop landscape; bidirectional buttons/keyboard/bounds; mobile portrait drag/button");
} finally {
  await browser.close();
}
