import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, rename, readdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findAbsolutePath } from "../scripts/payload-guard.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const hostSkillDir = (host) => join(homedir(), `.${host}`, "skills", "travel-art-album");
const HOSTS = ["dsh", "hermes", "codex", "antigravity"];

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

// 四端指纹：任一端被写入都会变化。
async function hostsFingerprint() {
  const hash = createHash("sha256");
  for (const host of HOSTS) {
    for (const file of await listFiles(hostSkillDir(host))) {
      hash.update(file.slice(hostSkillDir(host).length));
      hash.update(await readFile(file));
    }
  }
  return hash.digest("hex");
}

function runSync(mode = []) {
  return spawnSync("node", ["scripts/sync-skill.mjs", ...mode], { cwd: repoRoot, encoding: "utf8" });
}

test("guard flags every absolute-path form the checklist names", () => {
  const mustReject = [
    "/Users/apple/x",
    "/private/var/log/y",
    "/var/log/y",
    "/tmp/a/b",
    "/Volumes/USB/x",
    "/opt/homebrew/bin",
    "/etc/hosts",
    "$HOME/.zshrc",
    "~/notes/x",
  ];
  for (const sample of mustReject) {
    assert.ok(findAbsolutePath(sample), `应拒绝: ${sample}`);
  }
});

test("guard passes prose and relative paths that merely look close", () => {
  const mustPass = [
    "提供大约~30 张照片",
    "设置 SSH_HOME 环境变量",
    "参考 /optional 路线",
    "相对布局 scripts/validate-manifest.mjs",
    "用户目录见宿主文档",
  ];
  for (const sample of mustPass) {
    assert.equal(findAbsolutePath(sample), null, `不应误伤: ${sample}`);
  }
});

test("injecting an absolute path into the payload rejects sync and leaves all four hosts untouched", async () => {
  const before = await hostsFingerprint();
  const skill = join(repoRoot, "SKILL.md");
  const original = await readFile(skill, "utf8");
  try {
    await writeFile(skill, `${original}\n测试注入 /Users/apple/secret\n`, "utf8");
    const run = runSync();
    assert.notEqual(run.status, 0, "同步必须失败");
    const output = run.stdout + run.stderr;
    assert.match(output, /拒绝同步/);
    assert.equal(await hostsFingerprint(), before, "四端不得被写入");
  } finally {
    await writeFile(skill, original, "utf8");
  }
});

test("check:skill reports a missing host file per host instead of crashing", async () => {
  assert.equal(runSync().status, 0, "演练前必须已同步");
  const missing = join(hostSkillDir("codex"), join("docs", "source-license.md"));
  const kept = missing + ".kept";
  await rename(missing, kept);
  try {
    const run = runSync(["--check"]);
    assert.equal(run.status, 1);
    const output = run.stdout + run.stderr;
    assert.match(output, /codex/);
    assert.match(output, /✗/);
    assert.match(output, /缺失|不可读/);
    assert.doesNotMatch(output, /at (async )?file:\/\//, "不得以崩溃堆栈收场");
    for (const host of ["dsh", "hermes", "antigravity"]) {
      assert.match(output, new RegExp(`${host}\\s+✓`), `${host} 不应被牵连`);
    }
  } finally {
    await rename(kept, missing);
  }
});

test("sync output carries the full sha-256 fingerprint", async () => {
  assert.equal(runSync().status, 0);
  const run = runSync(["--check"]);
  assert.equal(run.status, 0);
  assert.match(run.stdout, /[0-9a-f]{64}/, "应输出完整 64 位哈希指纹");
});
