import { describe, expect, it } from 'vitest';
import { clampZoom, stepZoom, ZOOM_MAX, ZOOM_MIN } from '../src/core/zoom';

describe('clampZoom', () => {
  it('rounds to one decimal', () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(0.55)).toBe(0.6);
    expect(clampZoom(1.26)).toBe(1.3);
    expect(clampZoom(1.3000000000000003)).toBe(1.3);
  });

  it('clamps to the limits', () => {
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
    expect(clampZoom(5)).toBe(ZOOM_MAX);
  });

  it('falls back to 100% for invalid values', () => {
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('stepZoom', () => {
  it('moves by one step', () => {
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(1, -1)).toBe(0.9);
  });

  it('does not go past the limits', () => {
    expect(stepZoom(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
  });

  it('avoids floating point drift', () => {
    let value = 1;
    for (let i = 0; i < 10; i += 1) value = stepZoom(value, 1);
    expect(value).toBe(ZOOM_MAX);
    for (let i = 0; i < 20; i += 1) value = stepZoom(value, -1);
    expect(value).toBe(ZOOM_MIN);
  });
});
