import { access, readFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const required = [
  "SKILL.md",
  "README.md",
  "AGENTS.md",
  "THIRD_PARTY_NOTICES.md",
  "package-lock.json",
  "docs/source-license.md",
  "docs/capability-check.md",
  "docs/red-team.md",
  "references/styles/impasto-miniature.md",
  "references/styles/isometric-healing-blocks.md",
  "references/styles/papercraft-travel.md",
  "references/styles/editorial-travel-watercolor.md",
  "vendor/page-flip/LICENSE",
  "vendor/page-flip/page-flip.browser.js",
  "vendor/licenses/reference-project-LICENSE",
  "vendor/licenses/three-LICENSE",
  "examples/mixed-style-manifest.json",
  "src/flipbook-3d/main.js",
  "src/flipbook-3d/interaction.js",
];
for (const path of required) await access(path);
const gitignore = await readFile(".gitignore", "utf8");
for (const entry of ["private-acceptance/", ".research/", "node_modules/"]) {
  if (!gitignore.includes(entry))
    throw new Error(`.gitignore missing ${entry}`);
}
const html = await readFile("dist/prototype.html", "utf8");
if (!html.includes("Copyright (c) 2026 Haichao Li"))
  throw new Error("prototype missing embedded reference-project license");
if (!html.includes("Copyright © 2010-2026 three.js authors"))
  throw new Error("prototype missing embedded Three.js license");
if (
  /<script[^>]+src=|<link[^>]+href=|<(?:img|video|audio|source)\b[^>]+src=/i.test(
    html,
  )
)
  throw new Error("prototype contains an external runtime resource tag");
if (Buffer.byteLength(html) > 750 * 1024)
  throw new Error("prototype exceeds the 750 KiB offline budget");

const visible = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
const forbiddenName =
  /(^|\/)(\.env(?:\..+)?|.*\.(?:pem|key|p12|pfx|sqlite|db))$/i;
for (const path of visible) {
  if (forbiddenName.test(path))
    throw new Error(`sensitive-looking file is not ignored: ${path}`);
  if ((await stat(path)).size > 5 * 1024 * 1024)
    throw new Error(`large file is not ignored: ${path}`);
}
console.log(
  `project check passed (${required.length} required files, ${visible.length} repository files inspected)`,
);
