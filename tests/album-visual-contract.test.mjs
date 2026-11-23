import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (relativePath) => readFile(join(repoRoot, relativePath), "utf8");
const run = promisify(execFile);

test("runtime uses high-resolution contain layout instead of fixed stretching", async () => {
  const runtime = await read("src/album-app/main.js");

  assert.match(runtime, /function drawImageContain/);
  assert.match(runtime, /textureCanvas\.width\s*=\s*2048/);
  assert.match(runtime, /textureCanvas\.height\s*=\s*2730/);
  assert.doesNotMatch(runtime, /const artW\s*=\s*540/);
  assert.doesNotMatch(runtime, /0\.85/);
  assert.doesNotMatch(runtime, /context\.drawImage\(img, padX, topY, artWidth, artHeight\)/);
});

test("builder and finished album keep image-led copy and offline packaging", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "travel-album-contract-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const manifestPath = join(dir, "manifest.json");
  const outputPath = join(dir, "旅行的意义.html");
  const manifest = {
    book: { title: "公开样册" },
    cover: {
      generated_separately: true,
      artwork_path: "assets/gallery/gallery-editorial-travel-watercolor.jpg",
    },
    photos: [{
      order: 1,
      title: "纸艺",
      artwork_path: "assets/gallery/gallery-papercraft-travel.jpg",
    }],
    outputs: { private_html: outputPath },
  };
  const buildAlbum = () => run(process.execPath, [join(repoRoot, "scripts/build-album.mjs"), manifestPath]);

  // The public previews are smaller than the default print-quality minimum.
  await writeFile(manifestPath, JSON.stringify(manifest));
  await assert.rejects(buildAlbum, (error) => {
    assert.match(error.stderr, /below the 2000x2600 artwork quality floor/);
    return true;
  });
  manifest.quality = { min_artwork_width: 1086, min_artwork_height: 1448 };
  await writeFile(manifestPath, JSON.stringify(manifest));
  await buildAlbum();

  const html = await readFile(outputPath, "utf8");
  const runtime = await read("src/album-app/main.js");
  assert.match(runtime, /setupPdfExport/);
  assert.match(html, /id="export-pdf"/);
  assert.match(html, /@media print/);
  assert.match(html, /<title>公开样册｜旅行的意义<\/title>/);
  assert.equal((html.match(/data:image\//g) || []).length, manifest.photos.length + 1);
  assert.doesNotMatch(html, /<header class="book-header"|海滨人物|海风吹拂/);
  assert.doesNotMatch(
    html,
    /style-legend|3D · Offline Flipbook|Travel Art Book|PRIVATE MEMORY|QA PASSED|EPILOGUE & MEMORY|制作清单与档案/,
  );
  assert.doesNotMatch(
    html,
    /<(?:script|link|img|video|audio|source)[^>]+(?:src|href)="https?:/i,
  );
});
