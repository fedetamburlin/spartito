export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const rounded = Math.round(value * 10) / 10;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, rounded));
}

export function stepZoom(value: number, direction: 1 | -1): number {
  return clampZoom(value + direction * ZOOM_STEP);
}
