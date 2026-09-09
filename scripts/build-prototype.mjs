import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const [styles, referenceLicense, threeLicense] = await Promise.all([
  read("src/flipbook-3d/style.css"),
  read("vendor/licenses/reference-project-LICENSE"),
  read("vendor/licenses/three-LICENSE"),
]);
const result = await build({
  entryPoints: [resolve(root, "src/flipbook-3d/main.js")],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: ["chrome100", "safari15"],
  minify: true,
  legalComments: "none",
});
const bundle = new TextDecoder().decode(result.outputFiles[0].contents).replaceAll("</script", "<\\/script");
const licenses = `Reference project (MIT):\n${referenceLicense}\n\nThree.js (MIT):\n${threeLicense}`.replaceAll("-->", "--&gt;");
const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f4f3ef">
<meta name="description" content="单文件离线 3D 旅行艺术画册交互原型">
<title>沿途拾光｜3D 离线翻页原型</title>
<!-- Third-party notices:\n${licenses}\n-->
<style>${styles}</style>
</head>
<body data-sheet="0">
<main class="app-shell">
  <header class="book-header"><span class="eyebrow">Travel art book</span><h1>沿途拾光</h1><span class="mode">3D · Offline prototype</span></header>
  <canvas id="book-scene" aria-label="可交互的三维旅行艺术画册"></canvas>
  <ul class="style-legend" aria-label="本原型展示的可混排风格"><li><i></i>厚涂微缩</li><li><i></i>等距治愈积木</li><li><i></i>纸艺旅行</li></ul>
  <nav class="reader-controls" aria-label="画册翻页">
    <button class="page-button" id="previous-page" type="button" aria-label="上一页"><span aria-hidden="true">‹</span></button>
    <span class="page-status" id="page-state" aria-live="polite">封面</span>
    <button class="page-button" id="next-page" type="button" aria-label="下一页"><span aria-hidden="true">›</span></button>
  </nav>
  <div class="loading" id="loading" role="status">正在装订 3D 画册</div>
  <div class="fallback" id="fallback" hidden><div><strong>无法显示 3D 画册</strong><span>当前浏览器未提供可用的 WebGL。</span></div></div>
  <p class="sr-only">可点击画册左右两侧、水平拖动，或使用左右方向键、空格、Home 和 End。</p>
</main>
<script>${bundle}</script>
</body>
</html>`;
const output = resolve(root, "dist/prototype.html");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, html, "utf8");
console.log(`built ${output} (${Buffer.byteLength(html)} bytes, 3D bundle ${Buffer.byteLength(bundle)} bytes)`);
