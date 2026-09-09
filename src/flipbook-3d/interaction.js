export function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function chooseDirection(sheet, sheetCount, pointerX, centerX) {
  if (sheet <= 0) return 1;
  if (sheet >= sheetCount) return -1;
  return pointerX < centerX ? -1 : 1;
}

export function dragTarget({ baseSheet, direction, deltaX, pageWidth, sheetCount }) {
  const travel = direction > 0 ? -deltaX : deltaX;
  const fraction = clamp(travel / Math.max(1, pageWidth), 0, 1);
  return {
    fraction,
    progress: clamp(baseSheet + direction * fraction, 0, sheetCount),
  };
}

export function shouldCompleteDrag(fraction, elapsedMs) {
  return fraction >= 0.3 || (elapsedMs <= 280 && fraction >= 0.12);
}

export function edgePreviewDirection({ sheet, sheetCount, pointerX, centerX, pageWidth, edgeZone }) {
  if (sheet <= 0) return Math.abs(pointerX - (centerX + pageWidth / 2)) <= edgeZone ? 1 : 0;
  if (sheet >= sheetCount) return Math.abs(pointerX - (centerX - pageWidth / 2)) <= edgeZone ? -1 : 0;
  if (Math.abs(pointerX - (centerX - pageWidth)) <= edgeZone) return -1;
  if (Math.abs(pointerX - (centerX + pageWidth)) <= edgeZone) return 1;
  return 0;
}

