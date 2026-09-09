import * as THREE from "three";
import { chooseDirection, clamp, dragTarget, edgePreviewDirection, shouldCompleteDrag } from "./interaction.js";

const canvas = document.querySelector("#book-scene");
const previousButton = document.querySelector("#previous-page");
const nextButton = document.querySelector("#next-page");
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

const pageSpecs = [
  { kind: "cover", title: "沿途拾光", subtitle: "TRAVEL ART BOOK · 3D PROTOTYPE" },
  { kind: "endpaper", title: "三种风格 · 逐张确认", subtitle: "此册仅为交互占位，不含用户照片" },
  { kind: "impasto-miniature", title: "厚涂微缩", subtitle: "IMPASTO MINIATURE · PLACEHOLDER" },
  { kind: "isometric-healing-blocks", title: "等距治愈积木", subtitle: "ISOMETRIC BLOCKS · PLACEHOLDER" },
  { kind: "papercraft-travel", title: "纸艺旅行", subtitle: "PAPERCRAFT TRAVEL · PLACEHOLDER" },
  { kind: "manifest", title: "允许混排", subtitle: "每张照片在制作清单中记录并确认风格" },
  { kind: "endpaper", title: "用户验收一", subtitle: "确认前暂停批量生图" },
  { kind: "back", title: "END", subtitle: "PRIVATE PHOTOS NEVER ENTER THE SHARE PACKAGE" },
];

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawPaper(context, width, height) {
  context.fillStyle = "#f4f0e5";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "rgba(74,67,52,.035)";
  for (let index = 0; index < 1400; index += 1) {
    const x = (index * 73) % width;
    const y = (index * 151) % height;
    context.fillRect(x, y, index % 3 === 0 ? 2 : 1, 1);
  }
}

function drawArt(context, spec, width, height) {
  if (spec.kind === "impasto-miniature") {
    context.fillStyle = "#dce7df"; context.fillRect(80, 150, width - 160, 560);
    context.lineCap = "round";
    [["#447b79",30,0],["#e3b559",21,22],["#c9694d",17,-25],["#78926a",24,45]].forEach(([color,line,offset], index) => {
      context.strokeStyle = color; context.lineWidth = line; context.beginPath();
      context.moveTo(150, 590 + offset); context.bezierCurveTo(270, 390 - index * 18, 500, 690 + index * 10, 620, 330 + offset); context.stroke();
    });
    context.fillStyle = "#303c3a"; context.beginPath(); context.arc(390, 365, 50, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#c76145"; roundedRect(context, 330, 410, 125, 190, 44); context.fill();
  } else if (spec.kind === "isometric-healing-blocks") {
    context.fillStyle = "#e4ece9"; context.fillRect(80, 150, width - 160, 560);
    const blocks = [[190,470,150,130,"#739f9b"],[330,350,180,220,"#d6a66c"],[470,500,120,110,"#c76f57"],[230,275,120,95,"#b8c9aa"]];
    for (const [x,y,w,h,color] of blocks) { context.fillStyle = color; roundedRect(context,x,y,w,h,28); context.fill(); context.fillStyle="rgba(255,255,255,.22)"; roundedRect(context,x+10,y+10,w-20,22,10); context.fill(); }
  } else if (spec.kind === "papercraft-travel") {
    context.fillStyle = "#e6ecee"; context.fillRect(80, 150, width - 160, 560);
    context.fillStyle="#d2a56c"; context.beginPath(); context.moveTo(120,590); context.lineTo(650,520); context.lineTo(610,650); context.lineTo(150,690); context.closePath(); context.fill();
    context.fillStyle="#f0d8b7"; context.beginPath(); context.moveTo(250,530); context.lineTo(380,305); context.lineTo(520,530); context.closePath(); context.fill();
    context.fillStyle="#7e9b8f"; context.beginPath(); context.moveTo(290,530); context.lineTo(380,390); context.lineTo(470,530); context.closePath(); context.fill();
    context.strokeStyle="#fff"; context.lineWidth=8; context.strokeRect(80,150,width-160,560);
  } else if (spec.kind === "manifest") {
    context.fillStyle="#e8e5db"; context.fillRect(80,170,width-160,520);
    [["#ce6e48","厚涂微缩"],["#78a8a3","等距积木"],["#d3aa68","纸艺旅行"]].forEach(([color,label],index)=>{context.fillStyle=color;context.beginPath();context.arc(155,295+index*120,18,0,Math.PI*2);context.fill();context.fillStyle="#34352f";context.font="28px sans-serif";context.fillText(label,195,305+index*120);context.strokeStyle="#7f807744";context.beginPath();context.moveTo(195,325+index*120);context.lineTo(590,325+index*120);context.stroke();});
  }
}

function makePageTexture(spec) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 768; textureCanvas.height = 1024;
  const context = textureCanvas.getContext("2d");
  const { width, height } = textureCanvas;
  drawPaper(context, width, height);
  if (spec.kind === "cover" || spec.kind === "back") {
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, spec.kind === "cover" ? "#273e42" : "#6c4b3f");
    gradient.addColorStop(1, "#b76f4d"); context.fillStyle = gradient; context.fillRect(0,0,width,height);
    context.fillStyle="rgba(255,255,255,.08)"; for(let x=0;x<width;x+=9) context.fillRect(x,0,2,height);
  } else drawArt(context, spec, width, height);
  const lightText = spec.kind === "cover" || spec.kind === "back";
  context.fillStyle = lightText ? "#f7f1e3" : "#292b27";
  context.font = lightText ? "64px serif" : "48px serif";
  context.fillText(spec.title, 82, spec.kind === "cover" ? 220 : 820);
  context.fillStyle = lightText ? "rgba(255,255,255,.72)" : "#696b65";
  context.font = "18px sans-serif"; context.fillText(spec.subtitle, 84, spec.kind === "cover" ? 265 : 865);
  context.font = "14px sans-serif"; context.fillText("PROTOTYPE PLACEHOLDER", 84, 952);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function mirrored(texture) {
  const clone = texture.clone(); clone.needsUpdate = true;
  clone.wrapS = THREE.RepeatWrapping; clone.repeat.x = -1; clone.offset.x = 1;
  return clone;
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (error) {
  loading.hidden = true; fallback.hidden = false;
  fallback.querySelector("span").textContent = `当前浏览器无法启动 WebGL：${error.message}`;
  window.albumPrototype = { ready: false, fallback: true, error: error.message };
}
if (renderer) {
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#f4f3ef");
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
camera.position.set(0, 0, 4); camera.lookAt(0, 0, 0);
scene.add(new THREE.HemisphereLight("#ffffff", "#b7b3a9", 1.25));
const keyLight = new THREE.DirectionalLight("#ffffff", 2.8);
keyLight.position.set(-2.4, 3.2, 4); keyLight.castShadow = true;
keyLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
keyLight.shadow.camera.left=-3;keyLight.shadow.camera.right=3;keyLight.shadow.camera.top=3;keyLight.shadow.camera.bottom=-3;
keyLight.shadow.bias=-0.0002;keyLight.shadow.normalBias=.012;scene.add(keyLight);
const table = new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.MeshStandardMaterial({color:"#f4f3ef",roughness:1}));
table.position.z=-.08;table.receiveShadow = true;scene.add(table);

const bookRig = new THREE.Group(); scene.add(bookRig);
const sheets = [];
for (let index = 0; index < pageSpecs.length / 2; index += 1) {
  const geometry = new THREE.PlaneGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_SUBDIVISIONS, 1);
  geometry.translate(PAGE_WIDTH / 2, 0, 0);
  const original = Float32Array.from(geometry.attributes.position.array);
  const frontMaterial = new THREE.MeshStandardMaterial({ map: makePageTexture(pageSpecs[index * 2]), side: THREE.FrontSide, roughness: .82, metalness: 0 });
  const backMaterial = new THREE.MeshStandardMaterial({ map: mirrored(makePageTexture(pageSpecs[index * 2 + 1])), side: THREE.BackSide, roughness: .86, metalness: 0 });
  const group = new THREE.Group();
  const front = new THREE.Mesh(geometry, frontMaterial); const back = new THREE.Mesh(geometry, backMaterial);
  front.castShadow = true; front.receiveShadow = true; back.castShadow = true; back.receiveShadow = true;
  front.renderOrder = pageSpecs.length - index; back.renderOrder = pageSpecs.length - index;
  group.add(front, back); bookRig.add(group); sheets.push({ group, geometry, original, index });
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

function updateGeometry(sheet, amount) {
  const positions = sheet.geometry.attributes.position;
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const offset = vertex * 3;
    const x = sheet.original[offset];
    const curve = Math.sin((x / PAGE_WIDTH) * Math.PI) * Math.sin(amount * Math.PI) * .16;
    positions.setX(vertex, x * (1 - Math.sin(amount * Math.PI) * .025));
    positions.setY(vertex, sheet.original[offset + 1]);
    positions.setZ(vertex, curve);
  }
  positions.needsUpdate = true;
  sheet.geometry.computeVertexNormals();
}

function updateBook() {
  for (const sheet of sheets) {
    const amount = clamp(currentProgress - sheet.index, 0, 1);
    sheet.group.rotation.y = -Math.PI * amount;
    sheet.group.position.z = THREE.MathUtils.lerp((sheetCount-sheet.index)*.004, sheet.index*.004, amount);
    updateGeometry(sheet, amount);
  }
  const edgeCentering = currentProgress < 1 ? -PAGE_WIDTH*.5*(1-currentProgress) : currentProgress > sheetCount-1 ? PAGE_WIDTH*.5*(currentProgress-(sheetCount-1)) : 0;
  bookRig.position.x = edgeCentering + currentFocus;
}

function pageToSheet(page) { return page <= 0 ? 0 : page >= pageSpecs.length - 1 ? sheetCount : Math.ceil(page / 2); }
function focusForPage(page) { if (!mobileMode || page <= 0 || page >= pageSpecs.length - 1) return 0; return page % 2 ? PAGE_WIDTH * .5 : -PAGE_WIDTH * .5; }

function updateStatus() {
  const shown = mobileMode ? targetPage : Math.round(targetSheet);
  pageState.textContent = mobileMode ? (shown === 0 ? "封面" : shown === pageSpecs.length - 1 ? "封底" : `页面 ${shown} / ${pageSpecs.length - 2}`) : (shown === 0 ? "封面" : shown === sheetCount ? "封底" : `跨页 ${shown} / ${sheetCount - 1}`);
  previousButton.disabled = shown <= 0;
  nextButton.disabled = shown >= (mobileMode ? pageSpecs.length - 1 : sheetCount);
  document.body.dataset.sheet = String(Math.round(targetSheet));
  document.body.dataset.page = String(targetPage);
}

function requestRender() { if (animationFrame === null) { previousFrame = performance.now(); animationFrame = requestAnimationFrame(animate); } }
function navigate(delta) {
  if (mobileMode) {
    targetPage = clamp(targetPage + delta, 0, pageSpecs.length - 1);
    targetSheet = pageToSheet(targetPage);
    targetFocus = focusForPage(targetPage);
  } else {
    targetSheet = clamp(targetSheet + delta, 0, sheetCount);
    targetPage = targetSheet <= 0 ? 0 : targetSheet >= sheetCount ? pageSpecs.length - 1 : targetSheet * 2;
    targetFocus = 0;
  }
  hoverDirection = 0; updateStatus(); requestRender();
}

function animate(time) {
  animationFrame = null;
  const delta = Math.min((time-previousFrame)/1000,.05); previousFrame=time;
  if (!pointerStart) {
    const previewTarget = clamp(targetSheet + hoverDirection * EDGE_PREVIEW_AMOUNT, 0, sheetCount);
    if (reducedMotion) currentProgress = targetSheet;
    else currentProgress += (previewTarget-currentProgress) * (1-Math.exp(-8*delta));
    if (Math.abs(previewTarget-currentProgress)<SETTLE_EPSILON) currentProgress=previewTarget;
    if (reducedMotion) currentFocus = targetFocus;
    else currentFocus += (targetFocus-currentFocus) * (1-Math.exp(-10*delta));
    if (Math.abs(targetFocus-currentFocus)<SETTLE_EPSILON) currentFocus=targetFocus;
  }
  updateBook(); renderer.render(scene,camera); renderCount += 1;
  const restingTarget = clamp(targetSheet + hoverDirection * EDGE_PREVIEW_AMOUNT,0,sheetCount);
  if (pointerStart || Math.abs(restingTarget-currentProgress)>=SETTLE_EPSILON || Math.abs(targetFocus-currentFocus)>=SETTLE_EPSILON) requestRender();
}

function screenMetrics() {
  const bounds=canvas.getBoundingClientRect(); const worldWidth=camera.right-camera.left;
  const scale=bounds.width/worldWidth; return {centerX:bounds.left+bounds.width/2,pageWidth:PAGE_WIDTH*scale};
}

canvas.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary) return; hoverDirection=0;
  const metrics=screenMetrics(); const baseSheet=Math.round(targetSheet); const direction=chooseDirection(baseSheet,sheetCount,event.clientX,metrics.centerX);
  pointerStart={pointerId:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now(),baseSheet,direction,pageWidth:metrics.pageWidth,fraction:0,moved:false,mobile:mobileMode};
  canvas.classList.add("is-dragging"); canvas.setPointerCapture?.(event.pointerId); requestRender();
});
canvas.addEventListener("pointermove", (event) => {
  if (!pointerStart) {
    if (reducedMotion || event.pointerType === "touch") return;
    const metrics=screenMetrics(); const direction=edgePreviewDirection({sheet:Math.round(targetSheet),sheetCount,pointerX:event.clientX,centerX:metrics.centerX,pageWidth:metrics.pageWidth,edgeZone:EDGE_PREVIEW_ZONE});
    if (direction!==hoverDirection) {hoverDirection=direction;requestRender();} return;
  }
  if (event.pointerId!==pointerStart.pointerId) return;
  const deltaX=event.clientX-pointerStart.x; const deltaY=event.clientY-pointerStart.y;
  if (Math.abs(deltaX)>6 && Math.abs(deltaX)>Math.abs(deltaY)*.8) pointerStart.moved=true;
  if (!pointerStart.moved) return;
  if (pointerStart.mobile) { event.preventDefault(); return; }
  const drag=dragTarget({baseSheet:pointerStart.baseSheet,direction:pointerStart.direction,deltaX,pageWidth:pointerStart.pageWidth,sheetCount});
  pointerStart.fraction=drag.fraction; currentProgress=drag.progress; event.preventDefault(); requestRender();
});
canvas.addEventListener("pointerup", (event) => {
  const start=pointerStart; if (!start || event.pointerId!==start.pointerId) return;
  pointerStart=null;canvas.classList.remove("is-dragging");canvas.releasePointerCapture?.(event.pointerId);
  if (start.mobile && start.moved) navigate(event.clientX < start.x ? 1 : -1);
  else if (start.moved) {
    targetSheet=clamp(start.baseSheet+(shouldCompleteDrag(start.fraction,performance.now()-start.time)?start.direction:0),0,sheetCount);
    targetPage=targetSheet<=0?0:targetSheet>=sheetCount?pageSpecs.length-1:targetSheet*2;
    targetFocus=0;
  }
  else navigate(event.clientX<canvas.getBoundingClientRect().left+canvas.clientWidth/2?-1:1);
  updateStatus();requestRender();
});
canvas.addEventListener("pointercancel",()=>{pointerStart=null;canvas.classList.remove("is-dragging");requestRender();});
canvas.addEventListener("pointerleave",()=>{if(!pointerStart&&hoverDirection!==0){hoverDirection=0;requestRender();}});
previousButton.addEventListener("click",()=>navigate(-1)); nextButton.addEventListener("click",()=>navigate(1));
addEventListener("keydown",(event)=>{if(event.key==="ArrowLeft")navigate(-1);if(event.key==="ArrowRight"||event.key===" "){event.preventDefault();navigate(1);}if(event.key==="Home"){targetPage=0;targetSheet=0;targetFocus=0;updateStatus();requestRender();}if(event.key==="End"){targetPage=pageSpecs.length-1;targetSheet=sheetCount;targetFocus=0;updateStatus();requestRender();}});

function resize(){const width=innerWidth,height=innerHeight,aspect=width/Math.max(1,height);mobileMode=width<620;targetFocus=focusForPage(targetPage);const halfWidth=mobileMode?PAGE_WIDTH*.55:PAGE_WIDTH*1.2;const halfHeight=Math.max(.68,halfWidth/aspect);renderer.setPixelRatio(Math.min(devicePixelRatio,MAX_PIXEL_RATIO));renderer.setSize(width,height,false);camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();updateStatus();requestRender();}
addEventListener("resize",resize);resize();updateStatus();loading.hidden=true;
window.albumPrototype={ready:true,renderer,currentSheet:()=>currentProgress,targetSheet:()=>targetSheet,currentPage:()=>targetPage,currentFocus:()=>currentFocus,pageCount:pageSpecs.length,sheetCount,navigate,renderCount:()=>renderCount,isRendering:()=>animationFrame!==null};
requestRender();
}
