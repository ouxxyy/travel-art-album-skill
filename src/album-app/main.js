import * as THREE from "three";
import {
  chooseDirection,
  clamp,
  dragTarget,
  edgePreviewDirection,
  PREVIEW_EASING,
  releaseDecision,
  SETTLE,
  springStep,
  SPRING,
} from "../flipbook-3d/interaction.js";
import { albumPages, bookMeta } from "./album-data.js";

const canvas = document.querySelector("#book-scene");
const previousButton = document.querySelector("#previous-page");
const nextButton = document.querySelector("#next-page");
const pdfButton = document.querySelector("#export-pdf");
const pageState = document.querySelector("#page-state");
const loading = document.querySelector("#loading");
const fallback = document.querySelector("#fallback");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const PAGE_WIDTH = 0.75;
const PAGE_HEIGHT = 1;
const PAGE_SUBDIVISIONS = 20;
const MAX_PIXEL_RATIO = 1.5;
const SHADOW_MAP_SIZE = 1024;
const EDGE_PREVIEW_AMOUNT = 0.055;
const EDGE_PREVIEW_ZONE = 30;
const SETTLE_EPSILON = 0.001;
const BEND_AMOUNT = 0.16;
const TWIST_AMOUNT = 0.09;
const REST_CURL = 0.014;
const GUTTER_WIDTH = 0.085;
const GUTTER_ALPHA = 0.3;
const COVER_GUTTER_ALPHA = 0.16;
const FLICK_VELOCITY_DECAY_MS = 90;
const FLICK_VELOCITY_CAP = 6;

const DEFAULT_ALBUM_THEME = {
  paper: "#f1f5f3",
  paperNoise: "rgba(42, 78, 77, 0.028)",
  paperInk: "#283f3d",
  paperMuted: "#687d78",
  accent: "#306b70",
  coverStart: "#e3efed",
  coverMiddle: "#f4f7f2",
  coverEnd: "#d8e9e6",
  coverInk: "#1d5258",
  backStart: "#d8e9e6",
  backMiddle: "#f1f6f2",
  backEnd: "#e2efec",
  coverTexture: "rgba(41, 99, 105, 0.035)",
  stage: "#eef1ef",
  shadow: "rgba(35, 79, 83, 0.2)",
  gutter: "#18302e",
};

function themeFor(spec = {}) {
  return { ...DEFAULT_ALBUM_THEME, ...(bookMeta.theme || {}), ...(spec.theme || {}) };
}

function colorWithAlpha(color, alpha) {
  if (!color.startsWith("#")) return color;
  const hex = color.slice(1);
  const expanded = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function drawPaper(context, width, height, spec = {}) {
  const theme = themeFor(spec);
  context.fillStyle = theme.paper;
  context.fillRect(0, 0, width, height);
  context.fillStyle = theme.paperNoise;
  for (let index = 0; index < 1500; index += 1) {
    const x = (index * 73) % width;
    const y = (index * 151) % height;
    context.fillRect(x, y, index % 3 === 0 ? 2 : 1, 1);
  }
}

function gutterAlphaFor(kind) {
  return kind === "cover" || kind === "back" ? COVER_GUTTER_ALPHA : GUTTER_ALPHA;
}

function drawGutter(context, width, height, alpha, spec = {}) {
  const theme = themeFor(spec);
  const gutter = context.createLinearGradient(0, 0, width * GUTTER_WIDTH, 0);
  gutter.addColorStop(0, colorWithAlpha(theme.gutter, alpha));
  gutter.addColorStop(1, colorWithAlpha(theme.gutter, 0));
  context.fillStyle = gutter;
  context.fillRect(0, 0, width * GUTTER_WIDTH, height);
}

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

function drawCover(context, spec, img, width, height) {
  const theme = themeFor(spec);
  const grad = context.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, theme.coverStart);
  grad.addColorStop(0.54, theme.coverMiddle);
  grad.addColorStop(1, theme.coverEnd);
  context.fillStyle = grad;
  context.fillRect(0, 0, width, height);

  // 极轻的纸纤维噪声，避免出现工程网格。
  context.fillStyle = theme.coverTexture;
  for (let index = 0; index < 720; index += 1) {
    const x = (index * 83) % width;
    const y = (index * 137) % height;
    context.fillRect(x, y, index % 5 === 0 ? 2 : 1, 1);
  }

  // 典雅外边框与双线装帧
  context.strokeStyle = theme.accent;
  context.globalAlpha = 0.34;
  context.lineWidth = 1.2;
  context.strokeRect(28, 28, width - 56, height - 56);
  context.globalAlpha = 1;

  if (img) {
    // 精装画册贴片工艺 (Tip-in Plate)：将根据照片生成的封面艺术大片精致内嵌
    const artW = 930;
    const artH = Math.round(artW * (4 / 3));
    const artX = Math.round((width - artW) / 2);
    const artY = 42;

    // 衬托卡纸底托与双重细边框
    context.strokeStyle = theme.accent;
    context.globalAlpha = 0.42;
    context.lineWidth = 1;
    context.strokeRect(artX - 7, artY - 7, artW + 14, artH + 14);
    context.globalAlpha = 1;

    context.save();
    context.shadowColor = theme.shadow;
    context.shadowBlur = 28;
    context.shadowOffsetY = 12;
    drawImageContain(context, img, artX, artY, artW, artH);
    context.restore();

    // 画面纯白精致压边
    context.strokeStyle = "rgba(255, 255, 255, 0.94)";
    context.lineWidth = 1.6;
    context.strokeRect(artX, artY, artW, artH);

    // 只保留书名，让封面主视觉成为第一视觉。
    const textCenterY = 1300;
    context.textAlign = "left";

    context.strokeStyle = theme.accent;
    context.globalAlpha = 0.56;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(52, textCenterY + 6);
    context.lineTo(106, textCenterY + 6);
    context.stroke();
    context.globalAlpha = 1;

    context.fillStyle = theme.coverInk;
    context.font = "bold 44px 'Songti SC', 'Source Han Serif SC', 'Noto Serif SC', STSong, serif";
    context.fillText(spec.title || "", 52, 1343);

    context.textAlign = "left";
  } else {
    // 无图片时的典雅书帖备选排版
    context.textAlign = "center";
    context.fillStyle = theme.coverInk;
    context.font = "bold 52px 'Songti SC', 'Source Han Serif SC', STSong, serif";
    context.fillText(spec.title || "", width / 2, height / 2);
    context.textAlign = "left";
  }
}

function drawEndpaper(context, spec, width, height) {
  const theme = themeFor(spec);
  drawPaper(context, width, height, spec);
  context.strokeStyle = theme.accent;
  context.globalAlpha = 0.28;
  context.lineWidth = 1;
  context.strokeRect(48, 54, width - 96, height - 108);
  context.strokeStyle = theme.accent;
  context.globalAlpha = 0.14;
  context.lineWidth = 0.6;
  context.strokeRect(55, 61, width - 110, height - 122);
  context.globalAlpha = 1;

  context.fillStyle = theme.paperInk;
  context.font = "bold 36px 'Songti SC', 'Source Han Serif SC', 'Noto Serif SC', STSong, serif";
  context.fillText(spec.title || "", 72, 224);

  context.fillStyle = theme.paperMuted;
  context.font = "16px 'Songti SC', 'Source Han Serif SC', serif";
  context.fillText(spec.subtitle || "", 72, 274);

  context.strokeStyle = theme.accent;
  context.globalAlpha = 0.35;
  context.beginPath();
  context.moveTo(72, 314);
  context.lineTo(132, 314);
  context.stroke();
  context.globalAlpha = 1;

  context.fillStyle = theme.paperInk;
  context.font = "18px 'Songti SC', 'Source Han Serif SC', serif";
  context.fillText(spec.line || "", 72, 402);
}

function drawArtwork(context, spec, img, width, height) {
  const theme = themeFor(spec);
  drawPaper(context, width, height, spec);
  const padX = 52;
  const topY = 30;
  const artWidth = 920;
  const artHeight = Math.round(artWidth * (4 / 3));

  if (img) {
    context.save();
    context.shadowColor = theme.shadow;
    context.shadowBlur = 24;
    context.shadowOffsetY = 10;
    const drawn = drawImageContain(context, img, padX, topY, artWidth, artHeight);
    context.restore();

    context.strokeStyle = "rgba(255, 255, 255, 0.92)";
    context.lineWidth = 1.8;
    context.strokeRect(drawn.x, drawn.y, drawn.width, drawn.height);
  context.strokeStyle = theme.accent;
  context.globalAlpha = 0.22;
    context.lineWidth = 0.8;
  context.strokeRect(drawn.x - 5, drawn.y - 5, drawn.width + 10, drawn.height + 10);
    context.globalAlpha = 1;
  }

  // 展签压成一行，照片承担主要信息。
  context.fillStyle = theme.paperInk;
  context.font = "17px 'Songti SC', 'Source Han Serif SC', 'Noto Serif SC', STSong, serif";
  context.fillText((spec.plate || "") + "  ·  " + (spec.title || ""), padX, height - 28);
  context.strokeStyle = theme.accent;
  context.globalAlpha = 0.28;
  context.beginPath();
  context.moveTo(padX, height - 16);
  context.lineTo(width - padX, height - 16);
  context.stroke();
  context.globalAlpha = 1;
}

function drawColophon(context, spec, width, height) {
  const theme = themeFor(spec);
  drawPaper(context, width, height, spec);
  context.strokeStyle = theme.accent;
  context.globalAlpha = 0.28;
  context.lineWidth = 1;
  context.strokeRect(48, 54, width - 96, height - 108);
  context.strokeStyle = theme.accent;
  context.globalAlpha = 0.14;
  context.lineWidth = 0.6;
  context.strokeRect(55, 61, width - 110, height - 122);
  context.globalAlpha = 1;

  context.fillStyle = theme.paperInk;
  context.font = "bold 36px 'Songti SC', 'Source Han Serif SC', 'Noto Serif SC', STSong, serif";
  context.fillText(spec.title || "", 72, 224);

  context.strokeStyle = theme.accent;
  context.globalAlpha = 0.35;
  context.beginPath();
  context.moveTo(72, 314);
  context.lineTo(132, 314);
  context.stroke();
  context.globalAlpha = 1;

  context.fillStyle = theme.paperInk;
  context.font = "18px 'Songti SC', 'Source Han Serif SC', serif";
  const epilogue = Array.isArray(spec.lines) ? spec.lines.filter(Boolean).slice(0, 4) : [];
  epilogue.forEach((line, index) => {
    context.fillText(line, 72, 402 + index * 46);
  });
}

function drawBack(context, spec, width, height) {
  const theme = themeFor(spec);
  const grad = context.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, theme.backStart);
  grad.addColorStop(0.58, theme.backMiddle);
  grad.addColorStop(1, theme.backEnd);
  context.fillStyle = grad;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = theme.accent;
  context.globalAlpha = 0.28;
  context.lineWidth = 1;
  context.strokeRect(28, 28, width - 56, height - 56);
  context.globalAlpha = 1;

  context.textAlign = "center";
  context.fillStyle = theme.accent;
  context.globalAlpha = 0.72;
  context.lineWidth = 1.4;
  context.beginPath();
  context.arc(width / 2, 630, 16, 0, Math.PI * 2);
  context.strokeStyle = theme.accent;
  context.stroke();
  context.beginPath();
  context.moveTo(width / 2, 610);
  context.lineTo(width / 2, 650);
  context.moveTo(width / 2 - 20, 630);
  context.lineTo(width / 2 + 20, 630);
  context.stroke();

  context.fillStyle = theme.coverInk;
  context.globalAlpha = 1;
  context.font = "20px 'Songti SC', 'Source Han Serif SC', serif";
  context.fillText(spec.title || "", width / 2, 690);
  context.textAlign = "left";
}

function makePageCanvas(spec, loadedImg) {
  const PIXEL_SCALE = 2;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 2048;
  textureCanvas.height = 2730;
  const context = textureCanvas.getContext("2d");
  const width = 1024;
  const height = 1365;
  context.scale(PIXEL_SCALE, PIXEL_SCALE);

  if (spec.kind === "cover") drawCover(context, spec, loadedImg, width, height);
  else if (spec.kind === "endpaper") drawEndpaper(context, spec, width, height);
  else if (spec.kind === "artwork") drawArtwork(context, spec, loadedImg, width, height);
  else if (spec.kind === "colophon" || spec.kind === "manifest") drawColophon(context, spec, width, height);
  else if (spec.kind === "back") drawBack(context, spec, width, height);

  return textureCanvas;
}

function printablePageDataUrl(spec, loadedImg) {
  // Reuse the same high-resolution page compositor so the PDF keeps the
  // cover, captions, paper texture, and 3:4 artwork proportions.
  return makePageCanvas(spec, loadedImg).toDataURL("image/jpeg", 0.94);
}

function setupPdfExport(loadedImages) {
  const surface = document.querySelector("#pdf-export-surface");
  if (!pdfButton || !surface) return;

  pdfButton.addEventListener("click", () => {
    if (pdfButton.disabled) return;

    const restore = () => {
      surface.replaceChildren();
      delete document.body.dataset.exporting;
      pdfButton.disabled = false;
      pdfButton.removeAttribute("aria-busy");
      window.removeEventListener("afterprint", restore);
    };

    try {
      surface.replaceChildren();
      albumPages.forEach((spec, index) => {
        const page = document.createElement("section");
        page.className = "pdf-page";
        page.setAttribute("aria-label", spec.title || `第 ${index + 1} 页`);

        const image = document.createElement("img");
        image.alt = spec.title || `第 ${index + 1} 页`;
        image.src = printablePageDataUrl(spec, loadedImages[index]);
        page.append(image);
        surface.append(page);
      });

      pdfButton.disabled = true;
      pdfButton.setAttribute("aria-busy", "true");
      document.body.dataset.exporting = "pdf";
      window.addEventListener("afterprint", restore, { once: true });

      // Give the browser one paint cycle to decode the generated page images
      // before opening the native print dialog (choose “Save as PDF”).
      requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    } catch (error) {
      restore();
      pageState.textContent = "PDF 准备失败";
      console.error("Unable to prepare PDF export", error);
    }
  });
}

function canvasTexture(textureCanvas) {
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeBackCanvas(spec, loadedImg) {
  const frontCanvas = makePageCanvas(spec, loadedImg);
  const backCanvas = document.createElement("canvas");
  backCanvas.width = frontCanvas.width;
  backCanvas.height = frontCanvas.height;
  const context = backCanvas.getContext("2d");
  context.translate(backCanvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(frontCanvas, 0, 0);
  context.setTransform(1, 0, 0, 1, 0, 0);
  drawGutter(context, backCanvas.width, backCanvas.height, gutterAlphaFor(spec.kind), spec);
  return backCanvas;
}

async function preloadImages(specs) {
  return Promise.all(
    specs.map((spec) => {
      if (!spec.imageBase64) return Promise.resolve(null);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = spec.imageBase64;
      });
    })
  );
}

async function init() {
  const loadedImages = await preloadImages(albumPages);
  setupPdfExport(loadedImages);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (error) {
    loading.hidden = true;
    fallback.hidden = false;
    fallback.querySelector("span").textContent = `当前浏览器无法启动 WebGL：${error.message}`;
    return;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const albumTheme = themeFor();
  scene.background = new THREE.Color(albumTheme.stage);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  camera.position.set(0, 0, 4);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight("#ffffff", "#e9e9e6", 0.95));

  const keyLight = new THREE.DirectionalLight("#ffffff", 2.65);
  keyLight.position.set(-2.8, 2.7, 5.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  keyLight.shadow.camera.left = -3;
  keyLight.shadow.camera.right = 3;
  keyLight.shadow.camera.top = 3;
  keyLight.shadow.camera.bottom = -3;
  keyLight.shadow.bias = -0.00025;
  keyLight.shadow.normalBias = 0.012;
  keyLight.shadow.radius = 3;
  scene.add(keyLight);

  const rimLight = new THREE.PointLight("#ffffff", 0.5, 8, 2);
  rimLight.position.set(2.6, 1.6, 1.2);
  scene.add(rimLight);

  const table = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: albumTheme.stage, roughness: 1 }));
  table.position.z = -0.035;
  table.receiveShadow = true;
  scene.add(table);

  const bookRig = new THREE.Group();
  scene.add(bookRig);

  function makeContactShadow(centerX) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    const gradient = ctx.createRadialGradient(128, 128, 18, 128, 128, 126);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.55, "#666666");
    gradient.addColorStop(1, "#000000");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const alphaMap = new THREE.CanvasTexture(c);
    const material = new THREE.MeshBasicMaterial({ color: "#1c1a14", alphaMap, transparent: true, depthWrite: false, opacity: 0 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_WIDTH * 1.5, PAGE_HEIGHT * 1.22), material);
    mesh.position.set(centerX, 0, -0.02);
    mesh.renderOrder = -1;
    return mesh;
  }

  const rightShadow = makeContactShadow(PAGE_WIDTH * 0.5);
  const leftShadow = makeContactShadow(-PAGE_WIDTH * 0.5);
  bookRig.add(leftShadow, rightShadow);

  const sheets = [];
  for (let index = 0; index < albumPages.length / 2; index += 1) {
    const geometry = new THREE.PlaneGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_SUBDIVISIONS, 1);
    geometry.translate(PAGE_WIDTH / 2, 0, 0);
    const original = Float32Array.from(geometry.attributes.position.array);

    const frontPageSpec = albumPages[index * 2];
    const frontImg = loadedImages[index * 2];
    const frontCanvas = makePageCanvas(frontPageSpec, frontImg);
    const frontContext = frontCanvas.getContext("2d");
    frontContext.setTransform(1, 0, 0, 1, 0, 0);
    drawGutter(frontContext, frontCanvas.width, frontCanvas.height, gutterAlphaFor(frontPageSpec.kind), frontPageSpec);

    const backPageSpec = albumPages[index * 2 + 1];
    const backImg = loadedImages[index * 2 + 1];
    const backCanvas = makeBackCanvas(backPageSpec, backImg);

    const frontMaterial = new THREE.MeshStandardMaterial({ map: canvasTexture(frontCanvas), side: THREE.FrontSide, roughness: 0.82, metalness: 0, shadowSide: THREE.DoubleSide });
    const backMaterial = new THREE.MeshStandardMaterial({ map: canvasTexture(backCanvas), side: THREE.BackSide, roughness: 0.86, metalness: 0, shadowSide: THREE.DoubleSide });

    const group = new THREE.Group();
    const front = new THREE.Mesh(geometry, frontMaterial);
    const back = new THREE.Mesh(geometry, backMaterial);
    front.castShadow = true;
    front.receiveShadow = true;
    back.castShadow = true;
    back.receiveShadow = true;
    front.renderOrder = albumPages.length - index;
    back.renderOrder = albumPages.length - index;
    group.add(front, back);
    bookRig.add(group);
    sheets.push({ group, geometry, original, index });
  }

  const sheetCount = sheets.length;
  let currentProgress = 0;
  let targetSheet = 0;
  let targetPage = 0;
  let currentFocus = 0;
  let targetFocus = 0;
  let mobileMode = innerWidth < 620;
  let pointerStart = null;
  let hoverDirection = 0;
  let animationFrame = null;
  let previousFrame = performance.now();
  let renderCount = 0;
  let spring = { value: 0, velocity: 0 };
  let springMode = "fall";
  let previewAmount = 0;
  let motionSign = 1;

  function updateGeometry(sheet, amount) {
    const positions = sheet.geometry.attributes.position;
    const bend = Math.sin(amount * Math.PI);
    const twist = bend * motionSign * TWIST_AMOUNT;
    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      const offset = vertex * 3;
      const x = sheet.original[offset];
      const widthRatio = x / PAGE_WIDTH;
      const heightRatio = sheet.original[offset + 1] / (PAGE_HEIGHT / 2);
      positions.setX(vertex, x * (1 - bend * 0.025));
      positions.setY(vertex, sheet.original[offset + 1]);
      positions.setZ(
        vertex,
        Math.sin(widthRatio * Math.PI) * bend * BEND_AMOUNT +
          widthRatio * heightRatio * twist +
          REST_CURL * Math.sin(widthRatio * Math.PI)
      );
    }
    positions.needsUpdate = true;
    sheet.geometry.computeVertexNormals();
  }

  function updateBook() {
    for (const sheet of sheets) {
      const amount = clamp(currentProgress - sheet.index, 0, 1);
      sheet.group.rotation.y = -Math.PI * amount;
      sheet.group.position.z = THREE.MathUtils.lerp((sheetCount - sheet.index) * 0.004, sheet.index * 0.004, amount);
      updateGeometry(sheet, amount);
    }
    const edgeCentering =
      currentProgress < 1
        ? -PAGE_WIDTH * 0.5 * (1 - currentProgress)
        : currentProgress > sheetCount - 1
        ? PAGE_WIDTH * 0.5 * (currentProgress - (sheetCount - 1))
        : 0;
    bookRig.position.x = edgeCentering + currentFocus;
    rightShadow.material.opacity = 0.6 * (1 - THREE.MathUtils.smoothstep(currentProgress, sheetCount - 0.6, sheetCount - 0.05));
    leftShadow.material.opacity = 0.6 * THREE.MathUtils.smoothstep(currentProgress, 0.05, 0.6);
  }

  function pageToSheet(page) {
    return page <= 0 ? 0 : page >= albumPages.length - 1 ? sheetCount : Math.ceil(page / 2);
  }
  function focusForPage(page) {
    if (!mobileMode || page <= 0 || page >= albumPages.length - 1) return 0;
    return page % 2 ? PAGE_WIDTH * 0.5 : -PAGE_WIDTH * 0.5;
  }

  function updateStatus() {
    const shown = mobileMode ? targetPage : Math.round(targetSheet);
    pageState.textContent = mobileMode
      ? shown === 0
        ? "封面"
        : shown === albumPages.length - 1
        ? "封底"
        : `第 ${shown} 页`
      : shown === 0
      ? "封面"
      : shown === sheetCount
      ? "封底"
      : `展页 0${shown} / 0${sheetCount - 1}`;
    previousButton.disabled = shown <= 0;
    nextButton.disabled = shown >= (mobileMode ? albumPages.length - 1 : sheetCount);
    document.body.dataset.sheet = String(Math.round(targetSheet));
    document.body.dataset.page = String(targetPage);
  }

  function requestRender() {
    if (animationFrame === null) {
      previousFrame = performance.now();
      animationFrame = requestAnimationFrame(animate);
    }
  }

  function navigate(delta) {
    if (mobileMode) {
      targetPage = clamp(targetPage + delta, 0, albumPages.length - 1);
      targetSheet = pageToSheet(targetPage);
      targetFocus = focusForPage(targetPage);
    } else {
      targetSheet = clamp(targetSheet + delta, 0, sheetCount);
      targetPage = targetSheet <= 0 ? 0 : targetSheet >= sheetCount ? albumPages.length - 1 : targetSheet * 2;
      targetFocus = 0;
    }
    springMode = "fall";
    hoverDirection = 0;
    previewAmount = 0;
    updateStatus();
    requestRender();
  }

  function animate(time) {
    animationFrame = null;
    const delta = Math.min((time - previousFrame) / 1000, 0.05);
    previousFrame = time;
    if (!pointerStart) {
      if (reducedMotion) {
        spring.value = targetSheet;
        spring.velocity = 0;
        previewAmount = 0;
      } else {
        const next = springStep({ value: spring.value, velocity: spring.velocity, target: targetSheet, delta, ...SPRING[springMode] });
        spring.value = next.value;
        spring.velocity = next.velocity;
        if (Math.abs(targetSheet - spring.value) < SETTLE.distance && Math.abs(spring.velocity) < SETTLE.velocity) {
          spring.value = targetSheet;
          spring.velocity = 0;
        }
        const previewTarget = hoverDirection * EDGE_PREVIEW_AMOUNT;
        const easing = previewTarget > previewAmount ? PREVIEW_EASING.attack : PREVIEW_EASING.release;
        previewAmount += (previewTarget - previewAmount) * (1 - Math.exp(-easing * delta));
        if (Math.abs(previewTarget - previewAmount) < SETTLE_EPSILON) previewAmount = previewTarget;
      }
      if (reducedMotion) currentFocus = targetFocus;
      else currentFocus += (targetFocus - currentFocus) * (1 - Math.exp(-10 * delta));
      if (Math.abs(targetFocus - currentFocus) < SETTLE_EPSILON) currentFocus = targetFocus;
      currentProgress = clamp(spring.value + previewAmount, 0, sheetCount);
    }
    motionSign = pointerStart ? pointerStart.direction : Math.abs(spring.velocity) > 0.002 ? Math.sign(spring.velocity) : motionSign;
    updateBook();
    renderer.render(scene, camera);
    renderCount += 1;

    const settled =
      !pointerStart &&
      Math.abs(targetSheet - spring.value) < SETTLE.distance &&
      Math.abs(spring.velocity) < SETTLE.velocity &&
      Math.abs(targetFocus - currentFocus) < SETTLE_EPSILON &&
      Math.abs(hoverDirection * EDGE_PREVIEW_AMOUNT - previewAmount) < SETTLE_EPSILON;
    if (!settled) requestRender();
  }

  function screenMetrics() {
    const bounds = canvas.getBoundingClientRect();
    const worldWidth = camera.right - camera.left;
    const scale = bounds.width / worldWidth;
    return { centerX: bounds.left + bounds.width / 2, pageWidth: PAGE_WIDTH * scale };
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary) return;
    const metrics = screenMetrics();
    const seededFraction = previewAmount > 0 ? previewAmount : 0;
    const seededDirection = previewAmount > 0 ? hoverDirection : 0;
    hoverDirection = 0;
    previewAmount = 0;
    let baseSheet, direction, startFraction;
    if (Math.abs(spring.velocity) > 0.05) {
      direction = spring.velocity > 0 ? 1 : -1;
      baseSheet = clamp(direction > 0 ? Math.floor(spring.value) : Math.ceil(spring.value), 0, sheetCount);
      startFraction = Math.abs(spring.value - baseSheet);
    } else {
      baseSheet = clamp(Math.round(spring.value), 0, sheetCount);
      direction = seededDirection || chooseDirection(baseSheet, sheetCount, event.clientX, metrics.centerX);
      startFraction = seededFraction;
    }
    pointerStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      baseSheet,
      direction,
      pageWidth: metrics.pageWidth,
      startFraction,
      fraction: startFraction,
      moved: false,
      mobile: mobileMode,
      velocity: 0,
      lastMoveAt: performance.now(),
    };
    spring.value = clamp(currentProgress, 0, sheetCount);
    spring.velocity = 0;
    canvas.classList.add("is-dragging");
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {}
    requestRender();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointerStart) {
      if (reducedMotion || event.pointerType === "touch") return;
      const metrics = screenMetrics();
      const direction = edgePreviewDirection({
        sheet: Math.round(spring.value),
        sheetCount,
        pointerX: event.clientX,
        centerX: metrics.centerX,
        pageWidth: metrics.pageWidth,
        edgeZone: EDGE_PREVIEW_ZONE,
      });
      if (direction !== hoverDirection) {
        hoverDirection = direction;
        requestRender();
      }
      return;
    }
    if (event.pointerId !== pointerStart.pointerId) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    if (Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY) * 0.8) pointerStart.moved = true;
    if (!pointerStart.moved) return;
    if (pointerStart.mobile) {
      event.preventDefault();
      return;
    }
    const drag = dragTarget({
      baseSheet: pointerStart.baseSheet,
      direction: pointerStart.direction,
      deltaX,
      pageWidth: pointerStart.pageWidth,
      sheetCount,
      startFraction: pointerStart.startFraction,
    });
    const now = performance.now();
    const seconds = Math.max(1, now - pointerStart.lastMoveAt) / 1000;
    const instant = (drag.fraction - pointerStart.fraction) / seconds;
    pointerStart.velocity = pointerStart.velocity * 0.5 + instant * 0.5;
    pointerStart.lastMoveAt = now;
    pointerStart.fraction = drag.fraction;
    spring.value = drag.progress;
    spring.velocity = 0;
    currentProgress = drag.progress;
    event.preventDefault();
    requestRender();
  });

  canvas.addEventListener("pointerup", (event) => {
    const start = pointerStart;
    if (!start || event.pointerId !== start.pointerId) return;
    pointerStart = null;
    canvas.classList.remove("is-dragging");
    try {
      canvas.releasePointerCapture?.(event.pointerId);
    } catch {}
    if (start.mobile && start.moved) navigate(event.clientX < start.x ? 1 : -1);
    else if (start.moved) {
      const pausedVelocity = start.velocity * Math.exp(-(performance.now() - start.lastMoveAt) / FLICK_VELOCITY_DECAY_MS);
      const completed = releaseDecision({ fraction: start.fraction, elapsedMs: performance.now() - start.time, velocity: pausedVelocity }) === "complete";
      targetSheet = clamp(start.baseSheet + (completed ? start.direction : 0), 0, sheetCount);
      targetPage = targetSheet <= 0 ? 0 : targetSheet >= sheetCount ? albumPages.length - 1 : targetSheet * 2;
      targetFocus = 0;
      springMode = completed ? "fall" : "return";
      spring.velocity = completed ? clamp(start.velocity * start.direction, -FLICK_VELOCITY_CAP, FLICK_VELOCITY_CAP) : 0;
    } else {
      navigate(event.clientX < canvas.getBoundingClientRect().left + canvas.clientWidth / 2 ? -1 : 1);
    }
    updateStatus();
    requestRender();
  });

  canvas.addEventListener("pointercancel", () => {
    pointerStart = null;
    canvas.classList.remove("is-dragging");
    springMode = "return";
    requestRender();
  });
  canvas.addEventListener("pointerleave", () => {
    if (!pointerStart && hoverDirection !== 0) {
      hoverDirection = 0;
      requestRender();
    }
  });

  previousButton.addEventListener("click", () => navigate(-1));
  nextButton.addEventListener("click", () => navigate(1));

  addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") navigate(-1);
    if (event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      navigate(1);
    }
    if (event.key === "Home") {
      targetPage = 0;
      targetSheet = 0;
      targetFocus = 0;
      springMode = "fall";
      updateStatus();
      requestRender();
    }
    if (event.key === "End") {
      targetPage = albumPages.length - 1;
      targetSheet = sheetCount;
      targetFocus = 0;
      springMode = "fall";
      updateStatus();
      requestRender();
    }
  });

  function resize() {
    const width = innerWidth,
      height = innerHeight,
      aspect = width / Math.max(1, height);
    mobileMode = width < 620;
    targetFocus = focusForPage(targetPage);
    const halfWidth = mobileMode ? PAGE_WIDTH * 0.55 : PAGE_WIDTH * 1.2;
    const halfHeight = Math.max(0.62, halfWidth / aspect);
    renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    updateStatus();
    requestRender();
  }

  addEventListener("resize", resize);
  resize();
  updateStatus();
  loading.hidden = true;
  requestRender();
}

init();
