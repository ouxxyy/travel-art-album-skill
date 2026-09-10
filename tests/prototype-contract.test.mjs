import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("3D runtime owns page geometry, interaction, and bounded rendering", async () => {
  const main = await read("src/flipbook-3d/main.js");
  assert.match(main, /new THREE\.OrthographicCamera/);
  assert.match(
    main,
    /new\s+THREE\.PlaneGeometry\(\s*PAGE_WIDTH,\s*PAGE_HEIGHT,\s*PAGE_SUBDIVISIONS/,
  );
  assert.match(main, /positions\.setZ/);
  assert.match(main, /THREE\.FrontSide/);
  assert.match(main, /THREE\.BackSide/);
  assert.match(main, /castShadow = true/);
  assert.match(main, /receiveShadow = true/);
  assert.match(main, /MAX_PIXEL_RATIO = 1\.5/);
  assert.match(main, /PAGE_SUBDIVISIONS = 20/);
  assert.match(main, /SHADOW_MAP_SIZE = 1024/);
  assert.match(main, /animationFrame = null/);
});

test("reader supports mixed styles and complete controls", async () => {
  const main = await read("src/flipbook-3d/main.js");
  const interaction = await read("src/flipbook-3d/interaction.js");
  for (const style of [
    "impasto-miniature",
    "isometric-healing-blocks",
    "papercraft-travel",
  ]) {
    assert.match(main, new RegExp(style));
  }
  assert.match(main, /pointerdown/);
  assert.match(main, /pointermove/);
  assert.match(main, /pointerup/);
  assert.match(main, /ArrowRight/);
  assert.match(main, /ArrowLeft/);
  assert.match(main, /Home/);
  assert.match(main, /End/);
  assert.match(main, /event\.key\s*===\s*" "/);
  assert.match(interaction, /export function dragTarget/);
  assert.match(interaction, /export function edgePreviewDirection/);
});

test("builder emits one offline HTML with all required licenses", async () => {
  const build = await read("scripts/build-prototype.mjs");
  assert.match(build, /esbuild/);
  assert.match(build, /reference-project-LICENSE/);
  assert.match(build, /three-LICENSE/);
  assert.doesNotMatch(build, /page-flip\.browser\.js/);
});
