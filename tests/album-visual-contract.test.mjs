import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (relativePath) => readFile(join(repoRoot, relativePath), "utf8");
const readJson = async (relativePath) => JSON.parse(await read(relativePath));

test("runtime uses high-resolution contain layout instead of fixed stretching", async () => {
  const runtime = await read("src/album-app/main.js");

  assert.match(runtime, /function drawImageContain/);
  assert.match(runtime, /textureCanvas\.width\s*=\s*2048/);
  assert.match(runtime, /textureCanvas\.height\s*=\s*2730/);
  assert.doesNotMatch(runtime, /const artW\s*=\s*540/);
  assert.doesNotMatch(runtime, /0\.85/);
  assert.doesNotMatch(runtime, /context\.drawImage\(img, padX, topY, artWidth, artHeight\)/);
});

test("builder and finished album keep image-led copy and offline packaging", async () => {
  const runtime = await read("src/album-app/main.js");
  const builder = await read("惠州野海滩/build-album.mjs");
  const genericBuilder = await read("scripts/build-album.mjs");
  const html = await read("惠州野海滩/旅行的意义.html");
  const manifest = await readJson("惠州野海滩/manifest.json");

  assert.doesNotMatch(builder, /<header class="book-header"/);
  assert.match(builder, /2000x2600 artwork quality floor/);
  assert.match(genericBuilder, /minWidth: manifest\.quality\?\.min_artwork_width \?\? 2000/);
  assert.match(genericBuilder, /assertArtworkQuality/);
  assert.match(runtime, /setupPdfExport/);
  assert.match(builder, /id="export-pdf"/);
  assert.match(genericBuilder, /id="export-pdf"/);
  assert.match(html, /id="export-pdf"/);
  assert.match(html, /@media print/);
  assert.match(builder, /旅行的意义\.html/);
  assert.match(genericBuilder, /旅行的意义\.html/);
  assert.match(html, /<title>惠州野海滩｜旅行的意义<\/title>/);
  assert.doesNotMatch(builder, /TITLES|STYLE_LABELS|海滨人物|海风吹拂/);
  assert.equal((html.match(/data:image\//g) || []).length, manifest.photos.length + 1);
  assert.doesNotMatch(
    html,
    /style-legend|3D · Offline Flipbook|Travel Art Book|PRIVATE MEMORY|QA PASSED|EPILOGUE & MEMORY|制作清单与档案/,
  );
  assert.doesNotMatch(
    html,
    /<(?:script|link|img|video|audio|source)[^>]+(?:src|href)="https?:/i,
  );
});
