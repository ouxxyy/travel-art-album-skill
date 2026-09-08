import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pageFlip = (await readFile(resolve(root, "vendor/page-flip/page-flip.browser.js"), "utf8"))
  .replaceAll("</script", "<\\/script");
const license = (await readFile(resolve(root, "vendor/page-flip/LICENSE"), "utf8"))
  .replaceAll("-->", "--&gt;");

const art = (kind) => ({
  impasto: `<div class="art impasto" aria-label="厚涂微缩占位插画"><i></i><b></b><em></em></div>`,
  paper: `<div class="art paper" aria-label="纸艺旅行占位插画"><i></i><b></b><em></em></div>`,
})[kind];

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>沿途拾光｜离线翻页原型</title>
<!-- StPageFlip 2.0.7 license:\n${license}\n-->
<style>
:root{color-scheme:light;--ink:#292720;--paper:#f7f0df;--accent:#b45437;--muted:#777066}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#d8d0c2;color:var(--ink);font-family:"Songti SC","Noto Serif CJK SC",serif}
body{display:grid;grid-template-rows:auto 1fr auto;min-height:100vh;overflow:hidden;background:radial-gradient(circle at 50% 15%,#f2ecdf 0,#d6cdbf 48%,#bdb2a4 100%)}
.topbar,.controls{display:flex;align-items:center;justify-content:center;gap:18px;padding:14px;z-index:3}.topbar{justify-content:space-between;padding-inline:clamp(18px,4vw,54px);font:12px/1.2 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#625d55}.brand{font-weight:700;color:var(--ink)}
.stage{display:grid;place-items:center;min-height:0;padding:4px 14px 10px}.book{filter:drop-shadow(0 24px 24px #51483a55)}
.page{background:var(--paper);overflow:hidden}.page-inner{height:100%;padding:clamp(24px,5vw,54px);display:flex;flex-direction:column;position:relative;background:linear-gradient(100deg,#fff8e9 0,#f6edda 92%,#e3d6be 100%)}
.page-cover .page-inner{justify-content:flex-end;color:#fff;background:linear-gradient(155deg,#233b42,#48655f 50%,#b56947)}.page-cover.back .page-inner{justify-content:center;align-items:center;background:linear-gradient(155deg,#6d4a3c,#273e42)}
h1{font-size:clamp(42px,7vw,72px);line-height:1.03;letter-spacing:.08em;margin:0 0 16px}.kicker{font:600 11px/1.4 system-ui,sans-serif;letter-spacing:.24em;text-transform:uppercase}.subtitle{font-size:15px;letter-spacing:.14em;opacity:.86}.folio{position:absolute;bottom:22px;right:28px;font:11px system-ui,sans-serif;color:var(--muted)}
.caption{margin-top:18px}.caption h2{font-size:25px;margin:0 0 8px}.caption p{font-size:14px;line-height:1.8;color:#655e54;margin:0}.placeholder{font:10px system-ui,sans-serif;letter-spacing:.12em;color:#8b3e2c;margin-top:9px}.art{position:relative;flex:1;min-height:0;overflow:hidden;background:#e8e0cd;border:1px solid #ffffff88}.art:before,.art i,.art b,.art em{content:"";position:absolute;display:block}.impasto{background:linear-gradient(#b9d6d0 0 45%,#f0cf8d 46% 63%,#668672 64%)}.impasto:before{width:72%;height:28%;left:14%;bottom:12%;background:#3f6b73;border-radius:48% 52% 40% 60%;box-shadow:0 -15px 0 4px #f7de9b,0 10px 0 #375455}.impasto i{width:26%;height:44%;left:36%;bottom:28%;background:#b34f38;border-radius:42% 46% 20% 20%;box-shadow:inset 10px 0 #da7958}.impasto b{width:19%;height:19%;left:39%;bottom:63%;border-radius:50%;background:#4b3029;box-shadow:inset -8px 0 #f0b18d}.impasto em{width:100%;height:100%;background:repeating-linear-gradient(120deg,transparent 0 13px,#fff3 14px 16px);mix-blend-mode:soft-light}
.paper{background:#e4edf0}.paper:before{width:82%;height:17%;left:9%;bottom:19%;background:#d2a66f;transform:skewX(-20deg);box-shadow:0 8px 0 #9e7b56}.paper i{width:42%;height:42%;left:28%;bottom:32%;background:#f3d9bd;clip-path:polygon(50% 0,100% 35%,89% 100%,11% 100%,0 35%);box-shadow:inset 0 -30px #bcd0c4}.paper b{width:20%;height:25%;left:40%;bottom:35%;background:#496d78;border-radius:48% 48% 18% 18%}.paper em{width:12%;height:12%;left:44%;bottom:57%;background:#d6a17e;border-radius:50%;box-shadow:0 -5px #493b35}
button{border:1px solid #877e70;background:#f6efe2;color:var(--ink);border-radius:999px;padding:10px 18px;min-width:96px;font:600 13px system-ui,sans-serif;cursor:pointer}button:hover:not(:disabled){background:#fff}button:disabled{opacity:.35;cursor:not-allowed}.counter{min-width:88px;text-align:center;font:12px system-ui,sans-serif;color:#5e584f}
@media(max-width:680px){.topbar{padding-block:10px}.stage{padding-inline:8px}.controls{padding:10px}.page-inner{padding:26px}h1{font-size:45px}.caption h2{font-size:21px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}.book{filter:drop-shadow(0 10px 12px #51483a44)}}
</style>
</head>
<body>
<header class="topbar"><span class="brand">重拍画册</span><span>阶段一 · 占位原型</span></header>
<main class="stage"><div class="book" id="book" aria-label="翻页画册">
  <section class="page page-cover" data-density="hard"><div class="page-inner"><div class="kicker">Travel Art Book</div><h1>沿途<br>拾光</h1><div class="subtitle">封面与两页体验原型</div></div></section>
  <section class="page"><div class="page-inner">${art("impasto")}<div class="caption"><div class="kicker">01 · Morning Path</div><h2>光落在路上</h2><p>此页为布局占位，不是 AI 风格小样，也不包含用户素材。</p><div class="placeholder">PROTOTYPE PLACEHOLDER</div></div><span class="folio">01</span></div></section>
  <section class="page"><div class="page-inner">${art("paper")}<div class="caption"><div class="kicker">02 · Quiet Stop</div><h2>停一会儿</h2><p>正文坚持一页一图、完整构图与克制留白。</p><div class="placeholder">PROTOTYPE PLACEHOLDER</div></div><span class="folio">02</span></div></section>
  <section class="page page-cover back" data-density="hard"><div class="page-inner"><div class="kicker">End of prototype</div><p>真实样片需在用户提供照片后生成</p></div></section>
</div></main>
<nav class="controls" aria-label="画册翻页"><button id="prev" type="button">上一页</button><span class="counter" id="counter" aria-live="polite">1 / 4</span><button id="next" type="button">下一页</button></nav>
<script>${pageFlip}</script>
<script>
(() => {
  const pages = Array.from(document.querySelectorAll('.page'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flip = new St.PageFlip(document.getElementById('book'), {
    width: 480, height: 640, size: 'stretch', minWidth: 280, maxWidth: 480,
    minHeight: 374, maxHeight: 640, maxShadowOpacity: .35,
    showCover: true, mobileScrollSupport: false, usePortrait: true,
    flippingTime: reduced ? 80 : 420, autoSize: true
  });
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  const counter = document.getElementById('counter');
  const sync = (index = flip.getCurrentPageIndex()) => {
    const safe = Math.max(0, Math.min(index, pages.length - 1));
    counter.textContent = (safe + 1) + ' / ' + pages.length;
    prev.disabled = safe === 0;
    next.disabled = safe === pages.length - 1;
    document.body.dataset.page = String(safe);
  };
  let animating = false;
  let pendingSteps = 0;
  const pump = () => {
    if (animating || pendingSteps === 0) return;
    const current = flip.getCurrentPageIndex();
    const direction = Math.sign(pendingSteps);
    if ((direction < 0 && current === 0) || (direction > 0 && current === pages.length - 1)) {
      pendingSteps = 0;
      sync(current);
      return;
    }
    pendingSteps -= direction;
    animating = true;
    if (direction < 0) flip.flipPrev(); else flip.flipNext();
  };
  const navigate = (direction) => {
    const projected = flip.getCurrentPageIndex() + pendingSteps + direction;
    if (projected < 0 || projected >= pages.length) return;
    pendingSteps += direction;
    pump();
  };
  flip.on('init', (event) => sync(event.data.page));
  flip.on('flip', (event) => sync(event.data));
  flip.on('changeState', (event) => {
    if (event.data === 'read') {
      animating = false;
      pump();
    }
  });
  flip.on('changeOrientation', (event) => document.body.dataset.orientation = event.data);
  flip.loadFromHTML(pages);
  prev.addEventListener('click', () => navigate(-1));
  next.addEventListener('click', () => navigate(1));
  addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') prev.click();
    if (event.key === 'ArrowRight') next.click();
  });
  window.albumPrototype = { flip, pageCount: pages.length };
})();
</script>
</body></html>`;

const output = resolve(root, "dist/prototype.html");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, html, "utf8");
console.log(`built ${output} (${Buffer.byteLength(html)} bytes)`);
