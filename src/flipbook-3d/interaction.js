export function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function chooseDirection(sheet, sheetCount, pointerX, centerX) {
  if (sheet <= 0) return 1;
  if (sheet >= sheetCount) return -1;
  return pointerX < centerX ? -1 : 1;
}

export function dragTarget({ baseSheet, direction, deltaX, pageWidth, sheetCount, startFraction = 0 }) {
  const travel = direction > 0 ? -deltaX : deltaX;
  const fraction = clamp(startFraction + travel / Math.max(1, pageWidth), 0, 1);
  return {
    fraction,
    progress: clamp(baseSheet + direction * fraction, 0, sheetCount),
  };
}

// 实体书手感：书页质心越过书脊（约半页）才会自己坠落；否则松手后停住再回弹。
// 快速甩动是唯一低于质心也补完的例外，且要求松手瞬间仍有速度。
const COMMIT_FRACTION = 0.5;
const FLICK = { maxElapsedMs: 220, minFraction: 0.12, minVelocity: 1.5 };

export function releaseDecision({ fraction, elapsedMs, velocity }) {
  if (fraction >= COMMIT_FRACTION) return "complete";
  const isFlick = elapsedMs <= FLICK.maxElapsedMs
    && fraction >= FLICK.minFraction
    && Math.abs(velocity) >= FLICK.minVelocity;
  return isFlick ? "complete" : "return";
}

// 半隐式欧拉阻尼弹簧。fall 对应书页坠落（略过冲后落定），return 对应轻抬回位（不过冲）。
const tuned = (stiffness, ratio) => ({ stiffness, damping: 2 * Math.sqrt(stiffness) * ratio });
export const SPRING = {
  fall: tuned(34, 0.82),
  return: tuned(30, 1.05),
};
export const SETTLE = { distance: 0.001, velocity: 0.002 };

export function springStep({ value, velocity, target, stiffness, damping, delta }) {
  const acceleration = -stiffness * (value - target) - damping * velocity;
  const nextVelocity = velocity + acceleration * delta;
  return { value: value + nextVelocity * delta, velocity: nextVelocity };
}

// 边缘预览：掀起要快、收回要慢，接近真实书页被指尖掀起的迟滞感。
export const PREVIEW_EASING = { attack: 18, release: 12 };

export function edgePreviewDirection({ sheet, sheetCount, pointerX, centerX, pageWidth, edgeZone }) {
  if (sheet <= 0) return Math.abs(pointerX - (centerX + pageWidth / 2)) <= edgeZone ? 1 : 0;
  if (sheet >= sheetCount) return Math.abs(pointerX - (centerX - pageWidth)) <= edgeZone ? -1 : 0;
  if (Math.abs(pointerX - (centerX - pageWidth)) <= edgeZone) return -1;
  if (Math.abs(pointerX - (centerX + pageWidth)) <= edgeZone) return 1;
  return 0;
}
