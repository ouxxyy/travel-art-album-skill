import assert from "node:assert/strict";
import test from "node:test";
import { chooseDirection, dragTarget, edgePreviewDirection, shouldCompleteDrag } from "../src/flipbook-3d/interaction.js";

test("chooses only an available direction at covers", () => {
  assert.equal(chooseDirection(0, 4, 10, 50), 1);
  assert.equal(chooseDirection(4, 4, 90, 50), -1);
  assert.equal(chooseDirection(2, 4, 10, 50), -1);
  assert.equal(chooseDirection(2, 4, 90, 50), 1);
});

test("maps horizontal drag to clamped sheet progress", () => {
  assert.deepEqual(dragTarget({ baseSheet: 1, direction: 1, deltaX: -40, pageWidth: 100, sheetCount: 4 }), { fraction: .4, progress: 1.4 });
  assert.deepEqual(dragTarget({ baseSheet: 1, direction: -1, deltaX: 200, pageWidth: 100, sheetCount: 4 }), { fraction: 1, progress: 0 });
});

test("commits deliberate drags and short flicks", () => {
  assert.equal(shouldCompleteDrag(.3, 600), true);
  assert.equal(shouldCompleteDrag(.12, 200), true);
  assert.equal(shouldCompleteDrag(.11, 200), false);
});

test("previews only reachable outer edges", () => {
  const base = { sheetCount: 4, centerX: 500, pageWidth: 200, edgeZone: 30 };
  assert.equal(edgePreviewDirection({ ...base, sheet: 0, pointerX: 600 }), 1);
  assert.equal(edgePreviewDirection({ ...base, sheet: 0, pointerX: 400 }), 0);
  assert.equal(edgePreviewDirection({ ...base, sheet: 4, pointerX: 400 }), -1);
});
