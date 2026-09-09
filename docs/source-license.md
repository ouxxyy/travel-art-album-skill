# 来源、版本与许可记录

核查日期：2026-09-09。

| 来源                                 | 固定版本                                                           | 许可核查                                                                                                 | 本项目用途                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| GZ-L/photo-to-poster-skills          | commit `268ee78460ab5592167082d0501b7834f2e5b676`                  | 根目录 `LICENSE` 为 MIT，© 2026 GZ-L                                                                     | 派生三份风格规范；保留材质/构成/留白，删除图内文字要求并强化人物辨识度                            |
| Nodlik/StPageFlip                    | npm/tag `2.0.7`，commit `ab30ecc1d9f6d98de1a99b8e296469382f41c120` | MIT，© 2020 Nodlik                                                                                       | bundle 存于 vendor 备用；当前 3D 原型构建不打包它，若后续 2D 构建内嵌则必须同时内嵌许可全文       |
| cescqh-cloud/photo-album-skill       | commit `b1eab939d802ae470a4ffc1f3537e8ffd3c63715`                  | 仓库根目录及两层文件中未发现 LICENSE/COPYING；npm 元数据亦非本项目依据                                   | 只参考“单文件内嵌、离线组织”的思路；不复制代码、模板、文案或资产                                  |
| HaichaoLihc/create-photo-flipbook-ui | commit `53a9df7d5b13ef2d7a1f6bf5011c1fad570e021c`                  | 根项目原创代码和 installable skill 为 MIT，© 2026 Haichao Li；README 对 3D Book 1 改编代码和媒体另作保留 | 允许研究 2D、3D 与媒体；当前原型采用 3D Book 2 的交互/镜头思路及 MIT 原创外围代码，不复制保留媒体 |
| three.js                             | npm `0.185.1`                                                      | MIT，© 2010–2026 three.js authors                                                                        | 单文件 3D 渲染器；许可全文嵌入 HTML 并随项目保留                                                  |

## 决策

- 不以 Star 数作为选型证据。
- StPageFlip 采用锁定的 2.0.7，避免“latest”漂移；注意其上游已有人报告末页 programmatic navigation 越界，本项目在 UI 层做边界保护并测试。
- `photo-album-skill` 在作者补充明确许可前保持“只看思想、不拿实现”的隔离策略。
- 2D、3D 与媒体不设产品层默认禁用；是否进入可分享包由各自许可证或权利证明决定。用户私有照片可以进入其私人画册，但永不进入可分享 skill 包。
- 3D Book 2 原始构建的逻辑 bundle 为 593,879 bytes（gzip 147,490 bytes），带 14 张示例媒体后 `dist` 约 25 MiB。当前原型不携带这些媒体，改用自制 canvas 占位纹理。
- Quick FlipBook 1.1.3 为 BSD-2-Clause、Three.js 为 MIT；但 Quick FlipBook 的传递依赖 `three.modifiers` 仅有模糊 `BSD` 元数据、README 指向 BSD-3-Clause，npm 包未携带许可证全文。当前可分享原型因此不打包 Quick FlipBook/three.modifiers，曲面书页几何由本项目独立实现。
- 可分享安装包必须包含 `THIRD_PARTY_NOTICES.md` 和 StPageFlip MIT 全文。
