# 来源、版本与许可记录

核查日期：2026-09-09。

| 来源 | 固定版本 | 许可核查 | 本项目用途 |
| --- | --- | --- | --- |
| GZ-L/photo-to-poster-skills | commit `268ee78460ab5592167082d0501b7834f2e5b676` | 根目录 `LICENSE` 为 MIT，© 2026 GZ-L | 派生三份风格规范；保留材质/构成/留白，删除图内文字要求并强化人物辨识度 |
| Nodlik/StPageFlip | npm/tag `2.0.7`，commit `ab30ecc1d9f6d98de1a99b8e296469382f41c120` | MIT，© 2020 Nodlik | 使用浏览器 bundle，内嵌进单文件 HTML；分发时携带许可 |
| cescqh-cloud/photo-album-skill | commit `b1eab939d802ae470a4ffc1f3537e8ffd3c63715` | 仓库根目录及两层文件中未发现 LICENSE/COPYING；npm 元数据亦非本项目依据 | 只参考“单文件内嵌、离线组织”的思路；不复制代码、模板、文案或资产 |

## 决策

- 不以 Star 数作为选型证据。
- StPageFlip 采用锁定的 2.0.7，避免“latest”漂移；注意其上游已有人报告末页 programmatic navigation 越界，本项目在 UI 层做边界保护并测试。
- `photo-album-skill` 在作者补充明确许可前保持“只看思想、不拿实现”的隔离策略。
- 可分享安装包必须包含 `THIRD_PARTY_NOTICES.md` 和 StPageFlip MIT 全文。
