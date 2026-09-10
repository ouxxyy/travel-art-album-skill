# 惠州野海滩画册视觉重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前画册改成照片主导的画廊式版本，严格保持 3:4 比例，提高渲染清晰度，减少文字，并输出更新后的离线 HTML。

**Architecture:** 保留现有 Three.js 曲面翻页和单文件打包结构，只替换页面纹理绘制规则、舞台尺寸与生成器文案。居住地目录内的 `build-album.mjs` 继续以当前私有清单为输入，并在构建时加载更新后的运行时；真实艺术图不重新生成，先通过等比布局和更高纹理分辨率解决变形与软化。

**Tech Stack:** Vanilla JavaScript, Three.js 0.185.1, esbuild, Canvas 2D, Playwright/本机 Chrome。

## Global Constraints

- 原图只读，只处理当前目录第一层，不新增人物或改变旅行事实。
- 画册继续是单文件、完全离线、0 个 HTTP(S) 请求，保留桌面翻页、键盘、首尾边界和移动端单页。
- 封面和内页艺术图必须使用真实宽高比；禁止向 `drawImage` 传入造成拉伸的固定宽高组合。
- 视觉密度降低：封面只留书名，内页只留 `PLATE 编号 · 作品名`，跋文不出现 QA、制作清单或风格总录。
- 不引入新生产依赖，不覆盖既有测试画册，不同步用户级 skill 或系统配置。

---

### Task 1: Add visual contract tests

**Files:**
- Create: `tests/album-visual-contract.test.mjs`
- Test: `src/album-app/main.js`, `惠州野海滩/build-album.mjs`, `惠州野海滩/惠州野海滩_3D艺术画册.html`

**Interfaces:**
- Consumes: source/runtime text and the generated private album.
- Produces: deterministic assertions for 3:4 layout, high-resolution texture canvas, reduced copy, and banned strings.

- [ ] **Step 1: Write the failing test**

  Assert that the runtime contains a contain/aspect-ratio helper, `1024` and `1365` texture dimensions, no old `540 × 520` cover rectangle, and no direct artwork draw with the old `0.85` height multiplier. Assert that the generated HTML has six embedded image data URLs, no external resource tag, and none of `style-legend`, `3D · Offline Flipbook`, `Travel Art Book`, `QA PASSED`, or `EPILOGUE & MEMORY`.

- [ ] **Step 2: Run the focused test and verify it fails**

  Run from the repository root:

  ```bash
  node --test tests/album-visual-contract.test.mjs
  ```

  Expected: FAIL because the current runtime still contains the fixed cover rectangle, `0.85` artwork height multiplier, 768×1024 texture size, and old epilogue copy.

### Task 2: Upgrade the canvas page layout and copy

**Files:**
- Modify: `src/album-app/main.js` in `drawCover`, `drawArtwork`, `drawEndpaper`, `drawColophon`, `drawBack`, and `makePageCanvas`.
- Modify: `src/flipbook-3d/style.css` in the desktop camera sizing support classes only if required by the final screenshot.

**Interfaces:**
- Consumes: `albumPages` page specs with `imageBase64`, `title`, `plate`, and `date`.
- Produces: page textures at `1024×1365`; artwork pages draw images through a contain calculation and use only one caption line.

- [ ] **Step 1: Add the aspect-ratio helper**

  Add a helper with this contract before the page drawing functions:

  ```js
  function drawImageContain(context, image, boxX, boxY, boxWidth, boxHeight) {
    const imageRatio = image.width / image.height;
    const boxRatio = boxWidth / boxHeight;
    const drawWidth = imageRatio > boxRatio ? boxWidth : boxHeight * imageRatio;
    const drawHeight = imageRatio > boxRatio ? boxWidth / imageRatio : boxHeight;
    const drawX = boxX + (boxWidth - drawWidth) / 2;
    const drawY = boxY + (boxHeight - drawHeight) / 2;
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    return { x: drawX, y: drawY, width: drawWidth, height: drawHeight };
  }
  ```

- [ ] **Step 2: Redesign the cover composition**

  Use the `1024×1365` page coordinate system. Draw the cover art in a dominant 3:4 box with a 42px top margin and 930px width, use `drawImageContain`, remove the grid texture, English subtitle, location/year line, and bottom slogan, and place only `spec.title` below the image in the existing Songti stack.

- [ ] **Step 3: Redesign artwork pages**

  Use a 920px-wide art box starting at x=52 and y=30, with a 3:4 box height of `Math.round(920 * 4 / 3)`. Draw via `drawImageContain`, keep the existing white mount and shadow, and replace the four metadata lines with one compact line containing the plate and title. Do not draw `spec.subtitle`, `spec.tag`, or the date.

- [ ] **Step 4: Reduce endpaper, colophon, and back-cover copy**

  Keep the front endpaper to a title plus one short sentence. Keep the colophon to `沿途拾光 · 跋` plus three short lines and the book title; remove `EPILOGUE & MEMORY`, style bullets,装帧记录, and all QA language. Keep only the small mark and book title on the back.

- [ ] **Step 5: Increase texture resolution and remove duplicate header text**

  Change `makePageCanvas` from `768×1024` to `1024×1365`. In the HTML builder, omit the decorative top `<header>` so the cover is the only book-title treatment. If the screenshot still makes the book too small, reduce the desktop camera minimum half-height from `0.68` to `0.62` without changing mobile behavior.

- [ ] **Step 6: Run the focused test and verify it passes**

  Run:

  ```bash
  node --test tests/album-visual-contract.test.mjs
  ```

  Expected: PASS for the runtime contracts; the generated HTML will be rebuilt in Task 4 before its checks are evaluated.

### Task 3: Encode the new quality gates in the travel-art-album skill

**Files:**
- Modify: `SKILL.md` in the cover, Taste layout, and final-build sections.

**Interfaces:**
- Consumes: the approved visual redesign spec.
- Produces: reusable instructions requiring aspect-ratio preservation, minimum texture resolution, and a screenshot-based full-bleed fallback decision.

- [ ] **Step 1: Replace fixed-size cover guidance**

  State that cover and artwork images must be placed through an aspect-ratio-preserving contain calculation, with the cover image visually dominant and no forced 3:4-to-square rectangle.

- [ ] **Step 2: Add text and quality budgets**

  Add explicit gates: cover title only; artwork one caption line; colophon three or four short lines; texture canvas at least `1024×1365`; generated image dimensions and file MIME must be checked before embedding.

- [ ] **Step 3: Add the visual fallback rule**

  Require a final Chrome screenshot review. If the cover art is not visually dominant or still reads as a boxed photo, switch to full-bleed while preserving the same 3:4 contain rule and offline constraints.

### Task 4: Rebuild the current private album

**Files:**
- Modify: `惠州野海滩/build-album.mjs` to omit the duplicate header and use the updated runtime.
- Regenerate: `惠州野海滩/.album-data.js`.
- Regenerate: `惠州野海滩/惠州野海滩_3D艺术画册.html`.

**Interfaces:**
- Consumes: `惠州野海滩/manifest.json` and `惠州野海滩/artworks/*.jpg`.
- Produces: a single 10-page, self-contained HTML album with six embedded JPEG data URLs.

- [ ] **Step 1: Update the local builder markup**

  Remove the `<header class="book-header">…</header>` block and update the HTML description/title strings to `惠州野海滩` only.

- [ ] **Step 2: Build the album**

  Run from the photo directory:

  ```bash
  node build-album.mjs
  ```

  Expected: `5 artworks + cover, 10 pages` and a generated HTML file between 5 and 8 MB unless the higher-quality asset encoding exceeds that budget.

- [ ] **Step 3: Run static artifact checks**

  Verify six `data:image/` URLs, no `<script src>`, `<link href>`, or media `src` URLs, no banned engineering strings, no old title, and an HTML size of at least 5 MB. Verify all five manifest entries have `style_confirmed: true`, `qa_status: "passed"`, and `attempts: 1`.

### Task 5: Validate final visuals and interaction

**Files:**
- Test: `惠州野海滩/惠州野海滩_3D艺术画册.html`
- Evidence: temporary screenshots under `/private/tmp/` only.

**Interfaces:**
- Consumes: the rebuilt final HTML.
- Produces: Chrome evidence that the visual hierarchy and interactions survive the new page textures.

- [ ] **Step 1: Capture final cover and artwork spread screenshots**

  Use the existing local Chrome/Playwright setup to open the HTML via `file://`, capture the cover and first artwork spread, and inspect that the image is larger, not stretched, and not surrounded by excess copy.

- [ ] **Step 2: Run final browser smoke**

  Verify `file://`, WebGL initialization, desktop click/buttons/ArrowRight/Space/Home/End, first and last page disabled states, mobile single-page status, zero HTTP(S) requests, and zero console/page errors.

- [ ] **Step 3: Decide whether to keep B or use full bleed**

  Keep方案 B if the cover image is visually dominant and the inner artwork reads as a gallery plate. If it still reads as a small boxed image, apply the documented full-bleed fallback before final delivery and rerun Task 4 and Task 5.

- [ ] **Step 4: Run the complete validation set**

  Run:

  ```bash
  npm test
  npm run check
  node --test tests/album-visual-contract.test.mjs
  ```

  Report any root-directory permission or Chinese-path checker limitation separately from album validation; do not claim Safari or real-device verification.
