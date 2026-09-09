# 翻页交互重设计

## 设计批准来源

用户在 MYW-51 明确反馈现有翻页效果差，要求参考 `HaichaoLihc/create-photo-flipbook-ui` 重做，并要求三种艺术风格都可选、可混排。本文把这项明确反馈视为设计方向批准，不扩大到 3D WebGL、在线服务或批量生图。

## 来源结论

参考仓库固定在 commit `53a9df7d5b13ef2d7a1f6bf5011c1fad570e021c`。根目录 MIT 许可证覆盖原创项目代码与 installable skill；README 明确排除 `examples/3d-book-1/` 的改编代码和未另行说明的媒体。因此只复用 `skills/create-photo-flipbook-ui/assets/html/` 的 2D runtime 设计与实现，不复制 3D 示例或媒体。

参考 runtime 和本项目 vendored StPageFlip bundle 的 SHA-256 都是 `bbaca0bbef57a22bb66a3fc69d67baf9a17fb9a9c89ec9ed35e2b91abe4bd1e7`。质量差异来自外围舞台、页面材质和状态交互，而不是翻页库版本。

## 方案比较

1. **采用：MIT 2D runtime 契约 + 单文件改造。**复用其书本比例、脊影、边缘居中、底角翻页、控件和材质语言；保留本项目快速输入队列和严格离线输出。
2. 仅调整旧原型 CSS。变更更小，但无法系统复现参考实现的书本空间关系和状态细节。
3. 采用 3D 示例。视觉强，但许可边界和 WebGL/依赖体积不适合当前单文件离线范围。

## 交互与视觉

- 舞台改为明亮、克制的编辑画册空间，书本最大长边 640px，随视口等比缩放。
- 桌面展开态显示双页；封面与封底单叶分别向左右平移 25%，让合上时仍视觉居中。
- 内页左右侧使用不同方向的脊影，纸面与布面纹理通过内嵌 SVG/CSS 呈现。
- 封面、环衬、扉页、三种风格示意页、版权页、封底形成完整书序；示意页仍明确标注为占位，不冒充真实样片。
- 点击页面底角、拖动/触摸、圆形按钮、方向键、空格、Home/End 均可操作。
- 保留快速连续输入队列，避免参考 runtime 的 turn lock 丢弃用户快速输入。
- `prefers-reduced-motion` 下将翻页动画缩短，并取消书本平移过渡。

## 三种风格与制作清单

三种风格始终可用，不再要求整册只能选一种。进入样片环节时必须向用户提问：

1. 选择“整册统一”或“逐张混排”。
2. 若统一，确认默认风格；若混排，先为每张照片给出推荐风格，再展示有序清单让用户逐张确认或覆盖。

制作清单每张照片记录：`source_path`、`source_fingerprint`、`order`、`orientation`、`style`、`style_version`、`style_confirmed`、`artwork_path`、`attempts`、`qa_status`。其中 `style` 只能是 `impasto-miniature`、`isometric-healing-blocks`、`papercraft-travel`；任何 `style_confirmed !== true` 的照片都不得进入批量生成。

## 测试

- 静态契约：封面/封底 hard density；内页 soft；`data-edge`、`data-layout`、脊影、边缘偏移、底角翻页和混排风格元数据存在。
- 浏览器：`file://` 打开且 0 HTTP(S) 请求；桌面 landscape、移动 portrait；页面点击/拖动、TouchEvent、按钮、键盘、Home/End；快速正反向输入；首页末页边界。
- 视觉：生成桌面封面、桌面展开、移动单页截图并检查书本居中、脊线、裁切、控件和可读性。自动化截图只作证据，不替代人工查看。

## 门禁

本轮只重做离线占位原型和 skill/制作清单契约。没有用户真实照片，不生成九张样片；没有保存用户对逐张风格与人物效果的确认，不进入批量生图。
