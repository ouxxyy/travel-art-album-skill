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

`npm run capture:prototype`：生成封面、桌面展开、两张拖拽翻页中段与 390×844 移动单页截图。中段图按住指针把封面拖到约 0.32 页（书页形变最直观）与约 0.57 页（背面纹理与曲面投影同框，投影轮廓呈 S 形，平面旋转无法产生）处直接驱动弯折进度；人工查看确认桌面曲面书页、正反页面、阴影和控件完整；移动版完整聚焦单页，不再硬裁双页。

## 尚未验证

- Safari 桌面、移动真机和 GPU 性能尚未实测。
- 没有用户真实照片，人物辨识度、真实横竖图纹理和九张样片尚未验收。
- 没有用户验收一确认，不进入批量生图。

## 验收一打回打磨（第二轮，2026-09-09）

用户反馈：拖到一半要能悬停、阴影要加强、整体细腻度不足。逐项对照 HaichaoLihc/create-photo-flipbook-ui（commit `53a9df7d`）后落地：

- **拖拽悬停**：`releaseDecision` 以书页质心（约半页）为补完阈值，低于质心松手即悬停并经欠阻尼弹簧（fall 34/0.82、return 30/1.05）回位；真实甩动（220ms 内且松手仍有速度）仍会补完。拖拽按住时进度完全跟手。边缘预览改差速缓动（进 18/出 12），悬停中的预览可被拖拽无缝接管。
- **阴影**：主光源改为参考仓库的高位侧光并加 `shadow.radius`（PCF 模糊）、页面材质 `shadowSide: DoubleSide` 消除薄面自阴影缺陷、新增轮廓点光、环境光调暗加大对比；页面纹理新增书脊暗缝渐变，摊开跨页出现真实接缝阴影。
- **细腻度**：翻页几何在弯折之上叠加页角扭转（随方向与弯折幅度变化）与静止纸弧，页面不再视觉上像刚体平板；落页带轻微过冲的落定感。
- 以上几何与光影为按参考仓库交互思路自行推导的实现，未复制 Quick FlipBook/`three.modifiers` 代码（其许可不明，仍不打包）。

独立复核（HEAD 434117f）结论"无 CRITICAL/HIGH、可交回验收一"，并指出两个 MEDIUM，均已修复：

- **闭合态零投影**：薄书贴桌导致 shadow map 接触影丢失，改为 bookRig 下两片灰度 alphaMap 椭圆接触阴影（alphaMap 取绿色通道，需不透明灰度渐变），按左右页占用淡入淡出；封面首帧不再像贴在背景上。
- **飞行中抓页回跳**：抓取拖拽基点原来按最近跨页取整，动画途中抓页会视觉回跳约 25% 页；现按弹簧速度方向继承飞行进度作拖拽种子（前向 floor/后向 ceil），实测 0.334 抓取前移 12px 到 0.486 无跳变，松手回位正常。
- 顺带修复：`vendor/page-flip` 恢复与 npm `page-flip@2.0.7` 逐字节一致的上游原样（此前被格式化重排）；`docs/design.md` 悬停措辞更正。

证据更新：`npm test` 现为 17 项 Node 测试（新增悬停规则、弹簧物理、甩动判定、seed 接管共 5 项），浏览器 smoke 新增"拖到一半停住悬停不漂移、松手回弹到原页、真实甩动补完"三条断言；截图新增 `3d-hover-hold.png`（页面停在半空的悬停帧）。本机 Chrome headless + SwiftShader 实测 `ready` 约 5.5 秒；体积 547,170 bytes（gzip 约 140 KiB）仍在 750 KiB 上限内。
