# 重拍画册 Skill

把 10–30 张旅行照片在样片确认后逐张转为统一艺术风格，并生成可分享、可离线打开的单文件翻页 HTML 画册。

当前为阶段一原型：已完成来源/许可/宿主能力核查，以及使用占位图的“封面 + 两页 + 封底”可查看翻页原型。尚未接收用户照片、生成九张风格小样或批量生图。

## 本地命令

```bash
npm install
npm run build:prototype
npm test
npm run check
```

生成物位于 `dist/prototype.html`。它内嵌图片、CSS 和 StPageFlip 脚本，可通过 `file://` 离线打开。

## 当前限制

- 原型只使用明确标注的占位插画，不代表真实生图效果。
- 用户验收一之前禁止进入批量生图。
- Safari 真机/桌面浏览器尚未自动化验证；当前只验证本机 Chromium。
- `photo-album-skill` 当前仓库未发现许可文件，因此仅作为设计参考，不复制代码。
