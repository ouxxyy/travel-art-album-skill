# Skill 安装与同步说明

项目目录是 skill 的唯一源。改 skill 相关文件后，在仓库根运行一条命令即可推到全部宿主。

## 命令

```bash
npm run sync:skill    # 安装/更新到全部宿主，并逐文件哈希核对
npm run check:skill   # 只核对不写入；有差异时退出码非 0
```

## 安装范围（实测于本机，2026-09-09）

四个宿主都采用同一约定：`<宿主skills目录>/travel-art-album/SKILL.md`（frontmatter 含 `name` + `description`，`version` 供核对）。

| 宿主 | skills 目录 | 本机验证方式 |
| --- | --- | --- |
| dsh | `~/.dsh/skills/` | 目录 + 哈希核对（dsh 无 skill 列举子命令） |
| hermes | `~/.hermes/skills/` | `hermes skills list` 实际识别 + 哈希核对 |
| codex | `~/.codex/skills/` | 目录 + 哈希核对（codex CLI 无 skill 列举子命令） |
| antigravity | `~/.antigravity/skills/` | 目录 + 哈希核对（IDE，无 CLI） |

hermes 的 `hermes skills list` 是唯一能直接看到 skill 被宿主识别的证据渠道；其余三家以"与既有 skill 相同的目录约定 + 逐文件 SHA-256 一致"为生效依据。

## 安装内容（载荷）

只装 skill 运行时需要的文件，保持相对布局：

- `SKILL.md`（含版本号）
- `references/`（三种风格规范 + 许可）
- `docs/capability-check.md`、`docs/source-license.md`
- `scripts/validate-manifest.mjs`（制作清单校验，SKILL.md 流程引用）

不安装：`dist/`、`tests/`、`vendor/`、`node_modules/`、`.research/`、其余 `docs/` 内部文档、任何用户照片与运行记录。同步脚本内置守卫：载荷中出现本机绝对路径即拒绝同步，保证可分享性。

## 版本核对

版本号写在 `SKILL.md` frontmatter 的 `version` 字段，改动 skill 内容时同步递增。`sync:skill` 输出每端的版本与文件数，`check:skill` 做逐文件 SHA-256 对比——任何一端落后或被改动都会显示 `✗`。

## 演练记录（2026-09-09）

改动 SKILL.md（0.2.0 → 0.2.1，并加入本同步说明）→ `npm run sync:skill` → 四端输出均为 `✓ 核对一致 v0.2.1`，逐端 `grep ^version:` 抽查一致；`hermes skills list` 中 `travel-art-album` 状态 `enabled`。
