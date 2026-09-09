#!/usr/bin/env node
// 以项目目录为唯一源，把 travel-art-album skill 安装/同步到全部宿主。
// 用法：
//   node scripts/sync-skill.mjs           安装/更新并核对全部宿主
//   node scripts/sync-skill.mjs --check   只核对，不写入（有差异时退出码非 0）
import { cp, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findAbsolutePath } from "./payload-guard.mjs";

// 运行时载荷：SKILL.md 实际引用的文件，保持相对布局。
const PAYLOAD = [
  "SKILL.md",
  "references",
  join("docs", "capability-check.md"),
  join("docs", "source-license.md"),
  join("scripts", "validate-manifest.mjs"),
];
const SKILL_NAME = "travel-art-album";
const HOSTS = [
  { name: "dsh", skillsDir: join(homedir(), ".dsh", "skills") },
  { name: "hermes", skillsDir: join(homedir(), ".hermes", "skills") },
  { name: "codex", skillsDir: join(homedir(), ".codex", "skills") },
  { name: "antigravity", skillsDir: join(homedir(), ".antigravity", "skills") },
];

const repoRoot = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const checkMode = process.argv.includes("--check");

async function pathExists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function listFiles(root) {
  const files = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const child = join(current, entry.name);
      if (entry.isDirectory()) await walk(child);
      else files.push(child);
    }
  }
  await walk(root);
  return files.sort();
}

// 完整 SHA-256，不做截断；聚合指纹对全部「路径 哈希」行再做一次 SHA-256，作为单行版本指纹。
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

// 载荷快照：版本号（SKILL.md frontmatter）+ 文件数 + 逐文件哈希，用于跨宿主核对。
async function snapshotOf(root) {
  const hashes = {};
  let count = 0;
  for (const relative of PAYLOAD) {
    const target = join(root, relative);
    if (!(await pathExists(target))) throw new Error(`载荷缺失: ${relative}`);
    const files = (await stat(target)).isDirectory() ? await listFiles(target) : [target];
    for (const file of files) {
      hashes[file.slice(root.length + 1)] = digest(await readFile(file));
      count += 1;
    }
  }
  const head = await readFile(join(root, "SKILL.md"), "utf8");
  const version = head.match(/^version:\s*(\S+)$/m)?.[1] ?? "(未标版本)";
  const fingerprint = createHash("sha256")
    .update(Object.keys(hashes).sort().map((key) => `${key} ${hashes[key]}\n`).join(""))
    .digest("hex");
  return { version, count, hashes, fingerprint };
}

// 边界守卫：载荷里不得出现本机绝对路径，保持分享包干净。
async function assertNoAbsolutePaths() {
  for (const relative of PAYLOAD) {
    const target = join(repoRoot, relative);
    const files = (await stat(target)).isDirectory() ? await listFiles(target) : [target];
    for (const file of files) {
      const hit = findAbsolutePath(await readFile(file, "utf8"));
      if (hit) {
        throw new Error(`载荷含本机绝对路径，拒绝同步: ${file.slice(repoRoot.length + 1)}（${hit}）`);
      }
    }
  }
}

async function install(targetDir) {
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });
  for (const relative of PAYLOAD) {
    const to = join(targetDir, relative);
    await mkdir(join(to, ".."), { recursive: true });
    await cp(join(repoRoot, relative), to, { recursive: true });
  }
}

let source;
try {
  source = await snapshotOf(repoRoot);
} catch (error) {
  console.error(`sync-skill: ${error.message}`);
  process.exit(2);
}
await assertNoAbsolutePaths();
console.log(`源: ${SKILL_NAME} v${source.version}，${source.count} 个文件（逐文件 SHA-256 完整哈希核对）`);

console.log(`指纹 ${source.fingerprint}`);

let failures = 0;
for (const host of HOSTS) {
  const targetDir = join(host.skillsDir, SKILL_NAME);
  const exists = await pathExists(targetDir);
  if (checkMode && !exists) {
    console.log(`${host.name.padEnd(12)} ✗ 未安装（${targetDir}）`);
    failures += 1;
    continue;
  }
  let target;
  if (!checkMode) {
    try {
      await install(targetDir);
    } catch (error) {
      console.log(`${host.name.padEnd(12)} ✗ 写入失败（${error.message}）`);
      failures += 1;
      continue;
    }
  }
  try {
    target = await snapshotOf(targetDir);
  } catch (error) {
    console.log(`${host.name.padEnd(12)} ✗ 缺失或不可读（${error.message}）→ ${targetDir}`);
    failures += 1;
    continue;
  }
  const synced = JSON.stringify(target) === JSON.stringify(source);
  const label = checkMode
    ? synced ? "✓ 一致" : "✗ 不一致"
    : `${exists ? "已更新" : "新安装"} ${synced ? "✓ 核对一致" : "✗ 核对失败"}`;
  console.log(`${host.name.padEnd(12)} ${label} v${target.version}，${target.count} 个文件，指纹 ${target.fingerprint} → ${targetDir}`);
  if (!synced) {
    failures += 1;
    for (const key of Object.keys(source.hashes)) {
      if (target.hashes[key] !== source.hashes[key]) {
        console.log(`${" ".repeat(12)}差异 ${key}: 源 ${source.hashes[key]} vs 端 ${target.hashes[key] ?? "(缺失)"}`);
      }
    }
    for (const key of Object.keys(target.hashes)) {
      if (!(key in source.hashes)) {
        console.log(`${" ".repeat(12)}差异 ${key}: 端上多出 ${target.hashes[key]}`);
      }
    }
  }
}
if (failures > 0) {
  console.error(`${failures} 个宿主未通过核对`);
  process.exit(1);
}
