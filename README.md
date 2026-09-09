# 重拍画册 Skill

把 10–30 张旅行照片在样片确认后逐张转为用户确认的艺术风格，并生成可分享、可离线打开的单文件翻页 HTML 画册。三种风格可整册统一，也可逐张混排。

当前为阶段一原型：已完成来源/许可/宿主能力核查，并按用户指定仓库重做了使用占位图的离线 3D 翻页原型。尚未接收用户照片、生成九张风格小样或批量生图。

## 本地命令

```bash
npm install
npm run build:prototype
npm test
npm run check
npm run validate:example
# 实际清单结构检查
npm run validate:manifest -- "/path/to/制作清单.json"
# 批量前硬门禁
npm run validate:batch-ready -- "/path/to/制作清单.json"
```

生成物位于 `dist/prototype.html`。它内嵌自制占位纹理、CSS、Three.js 和曲面翻页逻辑，可通过 `file://` 离线打开。

## 当前限制

- 原型只使用明确标注的占位插画，不代表真实生图效果。
- 用户验收一之前禁止进入批量生图。
- 制作清单必须逐张记录并确认风格；三种风格可整册统一，也可混排。
- 2D、3D 和媒体均可按效果需要采用，不设默认排除；但必须逐项核实许可或权利来源、离线体积和运行性能。用户私有原图与私人画册永不进入分享包。
- Safari 真机/桌面浏览器尚未自动化验证；当前只验证本机 Google Chrome。
- `photo-album-skill` 当前仓库未发现许可文件，因此仅作为设计参考，不复制代码。
