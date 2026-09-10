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
- `references/`（四种风格规范 + 许可）
- `docs/capability-check.md`、`docs/source-license.md`
- `scripts/validate-manifest.mjs`（制作清单校验，SKILL.md 流程引用）

不安装：`dist/`、`tests/`、`vendor/`、`node_modules/`、`.research/`、其余 `docs/` 内部文档、任何用户照片与运行记录。同步脚本内置守卫：载荷中出现本机绝对路径即拒绝同步，保证可分享性。

## 版本核对

版本号写在 `SKILL.md` frontmatter 的 `version` 字段，改动 skill 内容时同步递增。核对基于逐文件完整 SHA-256（64 位，不截断），另对全部「路径 哈希」行做一次总哈希得到单行聚合指纹，随每端输出。任何一端落后、被改动或多出文件都会显示 `✗`，并列出差异文件两侧的完整哈希；宿主端文件缺失时按宿主逐行报表（`✗ 缺失或不可读`），不会以崩溃堆栈收场。

## 边界守卫

同步前扫描载荷，命中以下任一形态即拒绝同步（退出码非 0，四端不写入）：POSIX 绝对路径 `/Users|/var|/tmp|/Volumes|/opt|/etc`（含 macOS `/private` 前缀）、`$HOME` 引用、`~/` 开头路径。守卫实现与负路径测试见 `scripts/payload-guard.mjs` 与 `tests/skill-sync.test.mjs`。

## 负路径测试

`node --test tests/skill-sync.test.mjs` 覆盖：守卫对 9 种绝对路径形态逐一拒绝、5 种近似写法不误伤、注入载荷后默认模式同步被拒且四端指纹不变、宿主端删文件后 `check:skill` 逐行报表非 0 退出、输出含完整 64 位哈希指纹。

## 演练记录（2026-09-09）

改动 SKILL.md（0.2.0 → 0.2.1，并加入本同步说明）→ `npm run sync:skill` → 四端输出均为 `✓ 核对一致 v0.2.1`，逐端 `grep ^version:` 抽查一致；`hermes skills list` 中 `travel-art-album` 状态 `enabled`。
