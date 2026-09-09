import assert from "node:assert/strict";
import test from "node:test";
import { validateManifest } from "../scripts/validate-manifest.mjs";

const photo = (order, style, overrides = {}) => ({
  source_path: `照片 ${order}.jpg`,
  source_fingerprint: `sha256:${String(order).padStart(64, "0")}`,
  order,
  orientation: order % 2 ? "portrait" : "landscape",
  style,
  style_version: "2026-09-09",
  style_confirmed: true,
  artwork_path: null,
  attempts: 0,
  qa_status: "pending",
  ...overrides,
});

const manifest = () => ({
  version: 1,
  book: { title: "混排旅行", location: "", date: "" },
  workflow: { style_mode: "mixed", user_acceptance_one: false },
  photos: [
    photo(1, "impasto-miniature"),
    photo(2, "isometric-healing-blocks"),
    photo(3, "papercraft-travel"),
  ],
});

test("accepts all three styles in one ordered manifest", () => {
  assert.deepEqual(validateManifest(manifest()), []);
});

test("rejects a missing or unknown per-photo style", () => {
  const value = manifest();
  delete value.photos[0].style;
  value.photos[1].style = "watercolor";
  assert.deepEqual(validateManifest(value), [
    "photos[0].style must be one of impasto-miniature, isometric-healing-blocks, papercraft-travel",
    "photos[1].style must be one of impasto-miniature, isometric-healing-blocks, papercraft-travel",
  ]);
});

test("blocks unconfirmed styles and duplicate order values", () => {
  const value = manifest();
  value.photos[1].style_confirmed = false;
  value.photos[2].order = 1;
  assert.deepEqual(validateManifest(value), [
    "photos[1].style_confirmed must be true before batch generation",
    "photos[2].order must be a unique positive integer",
  ]);
});

test("requires stable source and style metadata", () => {
  const value = manifest();
  value.photos[0].source_fingerprint = "";
  value.photos[1].style_version = "";
  value.photos[2].orientation = "square";
  assert.deepEqual(validateManifest(value), [
    "photos[0].source_fingerprint must be a non-empty string",
    "photos[1].style_version must be a non-empty string",
    "photos[2].orientation must be portrait or landscape",
  ]);
});

test("keeps the global user acceptance gate mandatory for batch readiness", () => {
  const value = manifest();
  assert.deepEqual(validateManifest(value, { batchReady: true }), [
    "workflow.user_acceptance_one must be true before batch generation",
  ]);
  value.workflow.user_acceptance_one = true;
  assert.deepEqual(validateManifest(value, { batchReady: true }), []);
});
