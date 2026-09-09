# 3D 翻页改版证据

日期：2026-09-09；实现分支：`feature/flipbook-redesign`。

## 用户反馈对应结果

- 翻页由平面 StPageFlip 外壳改为 3D 曲面书页：正反页面纹理、书脊旋转、细分顶点弯折、动态光影、边缘轻抬、拖拽进度与落页动画。
- 三种艺术风格始终可选，支持逐张混排。使用 skill 时先问“整册统一 / 逐张混排”，混排时展示每个文件名和建议风格供用户逐张确认。
- 制作清单示例为 `examples/mixed-style-manifest.json`；`--batch-ready` 同时要求每张 `style_confirmed: true` 与全局 `user_acceptance_one: true`。
- 2D、3D 与媒体均可按效果采用，不设默认产品禁用；进入分享包前仍必须核实许可证或权利来源。私有原图、私人画册和运行记录继续排除。

## 指定仓库与许可

参考仓库固定为 HaichaoLihc/create-photo-flipbook-ui commit `53a9df7d5b13ef2d7a1f6bf5011c1fad570e021c`。

- 根项目原创代码与 installable skill：MIT，© 2026 Haichao Li。
- Three.js 0.185.1：MIT，© 2010–2026 three.js authors。
- 3D Book 1 外部改编源没有发现仓库许可证；示例媒体被参考仓库 README 保留，不能只凭根 MIT 复制。
- 3D Book 2 的 Quick FlipBook 为 BSD-2-Clause，但传递依赖 `three.modifiers` 的 npm 包没有许可证全文且 SPDX 元数据仅写 `BSD`。当前分享原型没有打包这两项，而是用 Three.js 独立实现曲面书页。
- 用户有权使用的媒体可以进入其私人最终画册；分享 skill 包不携带用户私有媒体。本原型所有页面均为代码绘制的占位纹理。

## 离线体积与性能

- 单文件 HTML：542,539 bytes；gzip：139,456 bytes；低于项目检查设置的 750 KiB 上限。
- 对照 3D Book 2：逻辑 bundle 593,879 bytes（gzip 147,490 bytes）；携带 14 张 Death Valley 示例图的构建目录约 25 MiB。
- 当前渲染上限：device pixel ratio 1.5、每页横向 20 段、1024 shadow map。
- 本机 Google Chrome headless + SwiftShader 冷启动 `ready` 最新实测约 5.3 秒；该数字不是 Safari 或真机承诺。
- 页面静止 300ms 内 render count 不再增加，确认按需渲染循环会停帧。

## 自动化证据

`npm test`：12/12 Node 测试通过；随后真实浏览器从 `file://` 打开，WebGL 创建成功，运行时捕获 0 个 HTTP(S) 请求。验证点击、鼠标拖拽、CDP 原生 touch 事件、按钮、左右键、空格、Home/End、快速连续目标更新、首页/末页边界，以及移动端同一跨页的左右逻辑页聚焦。

`npm run check`：检查 18 个必需文件和全部拟提交文件；验证两份许可证内嵌、无外部资源标签、HTML 不超过 750 KiB、常见敏感扩展名和大文件未进入仓库。

WebGL 降级测试会在页面初始化前强制让 `webgl/webgl2` context 返回空值，断言静态提示可见、loading 隐藏且没有未捕获 page error。

`npm run capture:prototype`：生成封面、桌面展开、拖拽翻页中段与 390×844 移动单页截图。拖拽中段图按住指针把封面拖到半页处直接驱动弯折进度，可见曲面书页、背面纹理与落页投影；人工查看确认桌面曲面书页、正反页面、阴影和控件完整；移动版完整聚焦单页，不再硬裁双页。

## 尚未验证

- Safari 桌面、移动真机和 GPU 性能尚未实测。
- 没有用户真实照片，人物辨识度、真实横竖图纹理和九张样片尚未验收。
- 没有用户验收一确认，不进入批量生图。
