import { describe, expect, it } from 'vitest';
import { config } from '../src/core/config';

/**
 * Semantic checks on config/defaults.json: these are the values the rest
 * of the app trusts, so a typo here must fail fast instead of surfacing
 * at runtime (e.g. a minimum larger than the maximum).
 */

describe('config coherence', () => {
  it('keeps the text size range ordered', () => {
    expect(config.layout.textPtMin).toBeGreaterThan(0);
    expect(config.layout.textPtMin).toBeLessThan(config.layout.textPtDefault);
    expect(config.layout.textPtDefault).toBeLessThan(config.layout.textPtMax);
  });

  it('keeps the chord size range ordered', () => {
    expect(config.layout.chordPtMin).toBeGreaterThan(0);
    expect(config.layout.chordPtMin).toBeLessThanOrEqual(config.layout.chordPtDefault);
    expect(config.layout.chordPtDefault).toBeLessThan(config.layout.textPtDefault);
  });

  it('keeps the page margins within their bounds', () => {
    const { marginsMm, marginsMinMm, marginsMaxMm } = config.page;
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      expect(marginsMm[side]).toBeGreaterThanOrEqual(marginsMinMm);
      expect(marginsMm[side]).toBeLessThanOrEqual(marginsMaxMm);
    }
    expect(marginsMinMm).toBeLessThan(marginsMaxMm);
  });

  it('describes an A4 portrait page', () => {
    expect(config.page.format).toBe('A4');
    expect(config.page.orientation).toBe('portrait');
    expect(config.page.widthMm).toBe(210);
    expect(config.page.heightMm).toBe(297);
  });

  it('keeps the column settings consistent', () => {
    expect([1, 2]).toContain(config.layout.columnsDefault);
    expect([1, 2]).toContain(config.layout.columnsMax);
    expect(config.layout.columnsDefault).toBeLessThanOrEqual(config.layout.columnsMax);
  });

  it('exposes every referenced font once, with a family', () => {
    const ids = config.typography.fonts.map((font) => font.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(config.typography.fontDefault);
    expect(ids).toContain(config.typography.editorFont);
    for (const font of config.typography.fonts) {
      expect(font.family.trim()).not.toBe('');
      expect(['sans', 'serif', 'mono']).toContain(font.role);
      expect(font.license.trim()).not.toBe('');
    }
  });

  it('publishes a usable colour palette', () => {
    expect(config.colors.palette.length).toBeGreaterThanOrEqual(4);
    for (const colour of config.colors.palette) {
      expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(config.colors.palette).toContain(config.colors.chord);
  });

  it('keeps the layout feature flags boolean', () => {
    expect(typeof config.layout.autoFit).toBe('boolean');
    expect(typeof config.layout.autoGrow).toBe('boolean');
    expect(typeof config.layout.autoColumns).toBe('boolean');
  });

  it('keeps the autosave debounce positive', () => {
    expect(config.storage.autosaveDebounceMs).toBeGreaterThan(0);
  });
});
