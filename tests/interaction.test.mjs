import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseDirection,
  dragTarget,
  edgePreviewDirection,
  PREVIEW_EASING,
  releaseDecision,
  SPRING,
  springStep,
} from "../src/flipbook-3d/interaction.js";

test("chooses only an available direction at covers", () => {
  assert.equal(chooseDirection(0, 4, 10, 50), 1);
  assert.equal(chooseDirection(4, 4, 90, 50), -1);
  assert.equal(chooseDirection(2, 4, 10, 50), -1);
  assert.equal(chooseDirection(2, 4, 90, 50), 1);
});

test("maps horizontal drag to clamped sheet progress", () => {
  assert.deepEqual(
    dragTarget({
      baseSheet: 1,
      direction: 1,
      deltaX: -40,
      pageWidth: 100,
      sheetCount: 4,
    }),
    { fraction: 0.4, progress: 1.4 },
  );
  assert.deepEqual(
    dragTarget({
      baseSheet: 1,
      direction: -1,
      deltaX: 200,
      pageWidth: 100,
      sheetCount: 4,
    }),
    { fraction: 1, progress: 0 },
  );
});

test("drag continues from a seeded hover preview instead of snapping back", () => {
  const seeded = dragTarget({
    baseSheet: 2,
    direction: 1,
    deltaX: -20,
    pageWidth: 100,
    sheetCount: 4,
    startFraction: 0.055,
  });
  assert.deepEqual(seeded, { fraction: 0.255, progress: 2.255 });
  const unseeded = dragTarget({
    baseSheet: 2,
    direction: 1,
    deltaX: -20,
    pageWidth: 100,
    sheetCount: 4,
  });
  assert.deepEqual(unseeded, { fraction: 0.2, progress: 2.2 });
});

test("hover rule: releasing below the page midpoint returns instead of completing", () => {
  // 拖到一半松手：页面悬停后回弹，不再自动翻完（验收一反馈①）。
  assert.equal(releaseDecision({ fraction: 0.48, elapsedMs: 900, velocity: 0 }), "return");
  assert.equal(releaseDecision({ fraction: 0.32, elapsedMs: 600, velocity: 0 }), "return");
  // 越过质心（书页自身会坠落）才补完。
  assert.equal(releaseDecision({ fraction: 0.52, elapsedMs: 900, velocity: 0 }), "complete");
  assert.equal(releaseDecision({ fraction: 1, elapsedMs: 1200, velocity: 0 }), "complete");
});

test("hover rule: only a genuine flick commits below the midpoint", () => {
  // 快而有力的甩动补完。
  assert.equal(
    releaseDecision({ fraction: 0.22, elapsedMs: 160, velocity: 2.4 }),
    "complete",
  );
  // 松手时已经停住的不算甩动。
  assert.equal(
    releaseDecision({ fraction: 0.22, elapsedMs: 160, velocity: 0.3 }),
    "return",
  );
  // 慢速拖拽再久也不算甩动。
  assert.equal(
    releaseDecision({ fraction: 0.22, elapsedMs: 800, velocity: 0.1 }),
    "return",
  );
  // 行程太小的轻扫不补完。
  assert.equal(
    releaseDecision({ fraction: 0.06, elapsedMs: 140, velocity: 3 }),
    "return",
  );
});

function simulate(spring, from, target, seconds = 2, step = 1 / 120) {
  let state = { value: from, velocity: 0 };
  const samples = [];
  for (let time = 0; time < seconds; time += step) {
    state = springStep({ ...state, target, delta: step, ...spring });
    samples.push({ ...state });
  }
  return samples;
}

test("fall spring lands slightly past the target and settles", () => {
  const samples = simulate(SPRING.fall, 0.3, 1);
  const overshoot = Math.max(...samples.map((s) => s.value)) - 1;
  assert.ok(overshoot > 0.001, `expected a visible landing, got ${overshoot}`);
  assert.ok(overshoot < 0.045, `landing too violent: ${overshoot}`);
  const settled = samples[samples.length - 1];
  assert.ok(Math.abs(settled.value - 1) < 0.0015);
  assert.ok(Math.abs(settled.velocity) < 0.002);
});

test("return spring eases back without crossing the resting point", () => {
  const samples = simulate(SPRING.return, 0.45, 0);
  const undershoot = Math.abs(Math.min(...samples.map((s) => s.value)));
  assert.ok(undershoot < 0.0015, `crossed the rest point by ${undershoot}`);
  const settled = samples[samples.length - 1];
  assert.ok(Math.abs(settled.value) < 0.0015);
});

test("fall covers ground faster than the gentler return", () => {
  const half = (samples, target) =>
    samples.findIndex((s) => Math.abs(s.value - target) < 0.15) * (1 / 120);
  const fallTime = half(simulate(SPRING.fall, 0.3, 1), 1);
  const returnTime = half(simulate(SPRING.return, 0.3, 1), 1);
  assert.ok(fallTime > 0, `fall never moved: ${fallTime}`);
  assert.ok(returnTime > fallTime, `return ${returnTime} should be slower than fall ${fallTime}`);
});

test("preview eases in faster than it releases", () => {
  assert.ok(PREVIEW_EASING.attack > PREVIEW_EASING.release);
});
