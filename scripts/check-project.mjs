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
  "vendor/page-flip/LICENSE",
  "vendor/page-flip/page-flip.browser.js"
];
for (const path of required) await access(path);
const gitignore = await readFile(".gitignore", "utf8");
for (const entry of ["private-acceptance/", ".research/", "node_modules/"]) {
  if (!gitignore.includes(entry)) throw new Error(`.gitignore missing ${entry}`);
}
const html = await readFile("dist/prototype.html", "utf8");
if (!html.includes("Copyright (c) 2020 Nodlik")) throw new Error("prototype missing embedded StPageFlip license");
if (/<script[^>]+src=|<link[^>]+href=|https?:\/\//i.test(html)) throw new Error("prototype contains an external runtime resource");

const visible = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .trim().split("\n").filter(Boolean);
const forbiddenName = /(^|\/)(\.env(?:\..+)?|.*\.(?:pem|key|p12|pfx|sqlite|db))$/i;
for (const path of visible) {
  if (forbiddenName.test(path)) throw new Error(`sensitive-looking file is not ignored: ${path}`);
  if ((await stat(path)).size > 5 * 1024 * 1024) throw new Error(`large file is not ignored: ${path}`);
}
console.log(`project check passed (${required.length} required files, ${visible.length} repository files inspected)`);
