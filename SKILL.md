---
name: travel-art-album
version: 0.2.2
description: Convert a non-recursive folder of 10–30 travel photos into user-approved reference-image artwork and a single-file offline page-flip HTML album. Use when the user asks for a 重拍画册、旅行照片艺术化画册、离线翻页相册, or an installable cross-agent photo-to-art album workflow.
---

# Travel Art Album

当前为阶段一原型。执行时先阅读 `docs/capability-check.md` 与 `docs/source-license.md`，并按需只加载用户选择的 `references/styles/` 文件。

本 skill 由项目仓库单源分发到 dsh、hermes、codex、antigravity 四个宿主；安装与同步命令属项目维护流程，说明见项目仓库的 `docs/skill-install.md`（该文件为维护文档，不在本 skill 载荷内）。

## 硬门禁

1. 必须确认宿主能读取文件、执行脚本、查看图片，并能把本地原图作为参考传入图像编辑。
2. 缺少任何能力就停止并逐项说明；不得用文本生图冒充参考图编辑。
3. 原图只读；只处理输入目录第一层，不递归，不自动删选。
4. 用户验收一未保存前禁止批量生图；不能从沉默或模糊答复推断确认。
5. 人物辨识度优先于艺术效果；不得新增人物、交换身份或改变旅行事实。

## 阶段一流程

1. 清点 JPG/JPEG、PNG、WebP、HEIC；自然排序，读取方向。无法解码、损坏或不支持的文件必须列出。
2. 确认书名，可选地点和日期；在生成前报告本次预计图片调用数。没有可靠计费数据就不估价。
3. 选择覆盖人物近景、双人照、环境场景的三张代表照片；素材不足时使用实际数量。
4. 每张分别按三种风格生成，共最多九张：厚涂微缩、等距治愈积木、纸艺旅行。每次必须携带对应原图。
5. 检查人数、身份特征、肢体、服装、地点、构图和材质，清楚标记不合格项。
6. 向用户展示对照并提问：“整册统一一种风格，还是按照片混排三种风格？”
7. 若统一，确认默认风格；若混排，先按照片内容给出建议，再展示每个文件名与所选风格，让用户逐张确认或覆盖。
8. 在制作清单中逐张保存 `style`、`style_version` 和 `style_confirmed`。运行 `node scripts/validate-manifest.mjs <清单.json> --batch-ready`；只有每张风格确认且 `user_acceptance_one` 为 true 才能进入批量阶段。

三种风格始终可用：`impasto-miniature`、`isometric-healing-blocks`、`papercraft-travel`。不得因为用户选择混排就把未选中的风格从 skill 或安装包移除。

## 原型

运行 `npm run build:prototype` 生成 `dist/prototype.html`。当前原型使用明确标注的占位图，仅验证 3D/2D 翻页体验、交互和离线单文件组织，不能作为风格小样或人物效果证据。2D、3D 与媒体资源都可按效果需要采用，但每项必须先核实自身许可并记录；私有原图和私人画册不得进入分享包。

## 尚未实现

批量生成、制作清单、指纹续做、单张返工、重试上限、完整画册构建和安装包将在用户验收一之后实现。
