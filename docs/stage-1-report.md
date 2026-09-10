# 阶段一交付与运行证据

日期：2026-09-09。当前实现证据以 `docs/flipbook-redesign-report.md` 为准。

## 已交付

- 固定并核查 photo-to-poster-skills、StPageFlip、photo-album-skill、create-photo-flipbook-ui 与 Three.js 的来源和许可边界。
- 核查当前宿主文件、脚本、图片查看、参考图编辑、浏览器和 HEIC 基础能力，并明确 Safari、真机、真实 HEIC 和人物辨识度尚未验证。
- 派生四份按需加载的风格规范，移除图内文字，强化人物辨识和横图重构要求。
- 四种风格改为始终可选、可逐张混排；制作清单逐张记录风格、版本与确认状态，并保留全局用户验收一门禁。
- 对照 HaichaoLihc/create-photo-flipbook-ui commit `53a9df7`，将旧 2D 占位原型重做为 8 个逻辑页面 / 4 个物理叶的单文件 3D 曲面画册。
- 用户解除对 2D、3D 和媒体的默认产品排除；当前规则是“允许按效果采用，但进入分享包前逐项核实许可证或权利来源”。私有原图与私人画册继续严格排除。

## 当前自动化证据

`npm test` 包含 12 个 Node 契约/单元测试和真实 Google Chrome 浏览器 smoke：

- 从 `file://` 打开约 543 KiB 的单文件 HTML，WebGL 创建成功，捕获 HTTP(S) 请求为 0。
- 验证正反页面、曲面顶点、动态阴影、点击、鼠标拖拽、原生 touch、按钮、方向键、空格、Home/End、快速目标更新与首尾边界。
- 移动端按逻辑单页聚焦，不再硬裁双页；静止 300ms 后渲染计数不增加。
- 强制关闭 WebGL 时显示静态错误提示、停止 loading 且不产生未捕获 page error。

`npm run check` 检查 18 个必需文件、全部拟提交文件、两份内嵌许可证、外部资源标签、750 KiB HTML 体积上限、常见敏感扩展名和大文件。

`npm run capture:prototype` 生成桌面封面、桌面展开与 390×844 移动单页截图，供人工视觉复核。

## 未完成与下一门禁

- 没有用户照片，十二张样片尚未生成；占位纹理不代表真实生图效果。
- Safari、移动真机、真实 GPU 与真实照片性能没有运行证据。
- 用户必须确认逐张风格、人物辨识度与翻页体验，并保存 `user_acceptance_one: true`；此前 `npm run validate:batch-ready` 必须失败，项目不进入批量生图。
