# 重拍画册 Skill

把 10–30 张旅行照片，经过“风格小样确认 → 批量艺术化 → 单独生成封面 → 单文件离线翻页画册”的流程，做成可以直接分享的 HTML 画册。支持四种风格整册统一，也支持逐张混排；成品右上角可以打开系统打印对话框导出 PDF。

如果这个 Skill 对你有帮助，欢迎在 GitHub 右上角点 Star。作者全平台同名：**欧八同学**。

## 效果展示

下面四张是专门为公开仓库生成的虚构示例，不含任何本地真人照片，也不代表某位真实旅行者。它们对应 Skill 内置的四种生图风格：

<table>
  <tr>
    <td align="center"><img src="assets/gallery/gallery-impasto-miniature.jpg" alt="厚涂微缩示例" width="210"><br><sub>厚涂微缩</sub></td>
    <td align="center"><img src="assets/gallery/gallery-isometric-healing-blocks.jpg" alt="等距治愈积木示例" width="210"><br><sub>等距治愈积木</sub></td>
    <td align="center"><img src="assets/gallery/gallery-papercraft-travel.jpg" alt="纸艺旅行示例" width="210"><br><sub>纸艺旅行</sub></td>
    <td align="center"><img src="assets/gallery/gallery-editorial-travel-watercolor.jpg" alt="编辑旅行摄影水彩手绘示例" width="210"><br><sub>编辑旅行摄影 × 水彩手绘</sub></td>
  </tr>
</table>

实际使用时，智能体会先用你的照片制作风格小样，等你确认后再批量生成内页和单独封面，最后装订成单文件离线翻页画册。

## 先说清楚：它是什么，不是什么

- 这是给 Claude Code、Codex 等智能体使用的 Skill，不是一个单独点开就能自动生图的桌面 App。
- 智能体必须能读取文件、执行脚本、查看图片，并支持把本地原图作为参考图传入图像编辑；缺一项就不能可靠完成流程。
- 它不会偷偷批量处理照片：必须先展示代表照片的小样，并得到你明确的“验收一”确认。
- 原图只读、不递归扫描；真实照片、制作清单和私人画册不要提交到公开仓库。

## 最直接的使用方法

### 1. 下载项目

```bash
git clone https://github.com/ouxxyy/travel-art-album-skill.git
cd travel-art-album-skill
npm install
```

### 2. 安装到你的智能体

以 Codex 为例，把运行时需要的文件放到 `~/.codex/skills/travel-art-album/`：

```bash
mkdir -p ~/.codex/skills/travel-art-album/{docs,scripts}
cp SKILL.md ~/.codex/skills/travel-art-album/
cp -R references ~/.codex/skills/travel-art-album/
cp docs/capability-check.md docs/source-license.md ~/.codex/skills/travel-art-album/docs/
cp scripts/validate-manifest.mjs ~/.codex/skills/travel-art-album/scripts/
```

如果你使用 Claude Code，把上面路径中的 `~/.codex/skills/` 换成 `~/.claude/skills/`。其他宿主的目录和载荷说明见 [`docs/skill-install.md`](docs/skill-install.md)。

### 3. 给智能体的直白指令

把下面这段发给智能体，并把路径换成你的照片目录：

```text
使用 travel-art-album，把 /path/to/my-travel-photos 里的旅行照片做成离线翻页画册。
先只清点第一层的照片，检查宿主能力，选 3 张代表照分别做四种风格小样；展示小样并停下来等我明确确认。
我确认前不要批量生图。确认后再生成内页、单独生成封面，运行清单校验和离线 HTML 构建，并告诉我输出文件路径和验证结果。
```

你也可以直接说：“帮我把这组旅行照片做成重拍画册”，但最好同时给出照片目录、书名，以及是否想统一一种风格。

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
# 构建清单对应的单文件离线画册（可传入自定义清单路径）
node scripts/build-album.mjs [manifest.json]
```

原型生成物位于 `dist/prototype.html`；成品构建器默认以 `旅行的意义.html` 为文件名生成到私有验收目录，并把 Base64 页面数据写入该目录的忽略文件。两者都可通过 `file://` 离线打开。

## 当前限制

- 原型只使用明确标注的占位插画，不代表真实生图效果。
- 用户验收一之前禁止进入批量生图。
- 制作清单必须逐张记录并确认风格；四种风格可整册统一，也可混排。
- 2D、3D 和媒体均可按效果需要采用，不设默认排除；但必须逐项核实许可或权利来源、离线体积和运行性能。用户私有原图与私人画册永不进入分享包。
- Safari 真机/桌面浏览器尚未自动化验证；当前只验证本机 Google Chrome。
- `photo-album-skill` 当前仓库未发现许可文件，因此仅作为设计参考，不复制代码。

## 作者与全平台关注

全平台统一名称：**欧八同学**。如果平台没有直接打开个人主页，请在对应平台搜索这个名字：

- 微信公众号：请扫描下方二维码关注
- 抖音：[搜索“欧八同学”](https://www.douyin.com/search/%E6%AC%A7%E5%85%AB%E5%90%8C%E5%AD%A6)
- 小红书：[搜索“欧八同学”](https://www.xiaohongshu.com/search_result?keyword=%E6%AC%A7%E5%85%AB%E5%90%8C%E5%AD%A6)
- X：[搜索“欧八同学”](https://x.com/search?q=%E6%AC%A7%E5%85%AB%E5%90%8C%E5%AD%A6&src=typed_query)

<p align="center">
  <img src="assets/wechat-qr.jpg" alt="欧八同学微信公众号二维码" width="260">
</p>

喜欢这个项目的话，欢迎点 Star；遇到问题可以提交 Issue，并附上命令、错误信息和最小复现步骤，不要上传真实私人照片。

## 许可与来源

第三方来源、版本和许可记录见 [`docs/source-license.md`](docs/source-license.md) 与 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。项目随附的第三方许可全文位于 `vendor/licenses/` 和 `references/styles/LICENSE`。
