import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const ALLOWED_STYLES = [
  "impasto-miniature",
  "isometric-healing-blocks",
  "papercraft-travel",
  "editorial-travel-watercolor",
];

export function validateManifest(value, { batchReady = false } = {}) {
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value))
    return ["manifest must be an object"];
  if (value.version !== 1) errors.push("version must be 1");
  if (typeof value.book?.title !== "string" || value.book.title.trim() === "")
    errors.push("book.title must be a non-empty string");
  if (!["uniform", "mixed"].includes(value.workflow?.style_mode))
    errors.push("workflow.style_mode must be uniform or mixed");
  if (!Array.isArray(value.photos) || value.photos.length === 0) {
    errors.push("photos must be a non-empty array");
    return errors;
  }
  const seenOrders = new Set();
  value.photos.forEach((photo, index) => {
    const prefix = `photos[${index}]`;
    if (
      typeof photo?.source_path !== "string" ||
      photo.source_path.trim() === ""
    )
      errors.push(`${prefix}.source_path must be a non-empty string`);
    if (
      typeof photo?.source_fingerprint !== "string" ||
      photo.source_fingerprint.trim() === ""
    )
      errors.push(`${prefix}.source_fingerprint must be a non-empty string`);
    if (
      !Number.isInteger(photo?.order) ||
      photo.order < 1 ||
      seenOrders.has(photo.order)
    )
      errors.push(`${prefix}.order must be a unique positive integer`);
    else seenOrders.add(photo.order);
    if (!["portrait", "landscape"].includes(photo?.orientation))
      errors.push(`${prefix}.orientation must be portrait or landscape`);
    if (!ALLOWED_STYLES.includes(photo?.style))
      errors.push(
        `${prefix}.style must be one of ${ALLOWED_STYLES.join(", ")}`,
      );
    if (
      typeof photo?.style_version !== "string" ||
      photo.style_version.trim() === ""
    )
      errors.push(`${prefix}.style_version must be a non-empty string`);
    if (photo?.style_confirmed !== true)
      errors.push(
        `${prefix}.style_confirmed must be true before batch generation`,
      );
  });
  if (batchReady && value.workflow?.user_acceptance_one !== true)
    errors.push(
      "workflow.user_acceptance_one must be true before batch generation",
    );
  return errors;
}

async function main() {
  const args = process.argv.slice(2);
  const batchReady = args.includes("--batch-ready");
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file)
    throw new Error(
      "usage: node scripts/validate-manifest.mjs <manifest.json> [--batch-ready]",
    );
  const value = JSON.parse(await readFile(file, "utf8"));
  const errors = validateManifest(value, { batchReady });
  if (errors.length) {
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `manifest valid: ${value.photos.length} photos, ${new Set(value.photos.map((photo) => photo.style)).size} styles`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) await main();
