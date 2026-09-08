---
name: travel-art-album
description: Convert a non-recursive folder of 10–30 travel photos into user-approved reference-image artwork and a single-file offline page-flip HTML album. Use when the user asks for a 重拍画册、旅行照片艺术化画册、离线翻页相册, or an installable cross-agent photo-to-art album workflow.
---

# Travel Art Album

当前为阶段一原型。执行时先阅读 `docs/capability-check.md` 与 `docs/source-license.md`，并按需只加载用户选择的 `references/styles/` 文件。

## 硬门禁

1. 必须确认宿主能读取文件、执行脚本、查看图片，并能把本地原图作为参考传入图像编辑。
2. 缺少任何能力就停止并逐项说明；不得用文本生图冒充参考图编辑。
3. 原图只读；只处理输入目录第一层，不递归，不自动删选。
4. 用户验收一未保存前禁止批量生图。
5. 人物辨识度优先于艺术效果；不得新增人物、交换身份或改变旅行事实。

## 阶段一流程

1. 清点 JPG/JPEG、PNG、WebP、HEIC；自然排序，读取方向。无法解码、损坏或不支持的文件必须列出。
2. 确认书名，可选地点和日期；在生成前报告本次预计图片调用数。没有可靠计费数据就不估价。
3. 选择覆盖人物近景、双人照、环境场景的三张代表照片；素材不足时使用实际数量。
4. 每张分别按三种风格生成，共最多九张：厚涂微缩、等距治愈积木、纸艺旅行。每次必须携带对应原图。
5. 检查人数、身份特征、肢体、服装、地点、构图和材质，清楚标记不合格项。
6. 向用户展示对照并请求确认一种风格、人物效果和翻页体验。保存明确确认结果后才能进入批量阶段。

## 原型

运行 `npm run build:prototype` 生成 `dist/prototype.html`。当前原型使用明确标注的占位图，仅验证封面、两页、封底、桌面双页、移动单页、按钮、键盘、触摸基础和离线单文件组织，不能作为风格小样或人物效果证据。

## 尚未实现

批量生成、制作清单、指纹续做、单张返工、重试上限、完整画册构建和安装包将在用户验收一之后实现。
