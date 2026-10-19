import { describe, expect, it } from 'vitest';
import { config } from '../../src/core/config';
import { chordPtFor, decideLayout } from '../../src/core/fit';

const baseOptions = (overrides: Partial<{ columns: 'auto' | 1 | 2; textPt: number }> = {}) => ({
  columns: 'auto' as const,
  textPt: config.layout.textPtDefault,
  ...overrides
});

describe('decideLayout', () => {
  it('uses the default when it fits in one column', () => {
    const result = decideLayout(() => false, config, baseOptions());
    expect(result.status).toBe('fits');
    expect(result.params.columns).toBe(1);
    expect(result.params.textPt).toBe(config.layout.textPtDefault);
    expect(result.maxTextPt).toBe(config.layout.textPtMax);
  });

  it('switches to two columns when one overflows', () => {
    const result = decideLayout((params) => params.columns === 1, config, baseOptions());
    expect(result.status).toBe('columns');
    expect(result.params.columns).toBe(2);
    expect(result.params.textPt).toBe(config.layout.textPtDefault);
    expect(result.maxTextPt).toBe(config.layout.textPtMax);
  });

  it('shrinks the font when two columns overflow too', () => {
    const result = decideLayout((params) => params.textPt > 10.5, config, baseOptions());
    expect(result.status).toBe('shrunk');
    expect(result.params.textPt).toBe(10.5);
    expect(result.params.columns).toBe(2);
    expect(result.maxTextPt).toBe(10.5);
  });

  it('goes down to the minimum readable size', () => {
    const result = decideLayout(
      (params) => params.textPt > config.layout.textPtMin,
      config,
      baseOptions()
    );
    expect(result.status).toBe('shrunk');
    expect(result.params.textPt).toBe(config.layout.textPtMin);
    expect(result.maxTextPt).toBe(config.layout.textPtMin);
  });

  it('reports overflow when nothing fits', () => {
    const result = decideLayout(() => true, config, baseOptions());
    expect(result.status).toBe('overflow');
    expect(result.params.textPt).toBe(config.layout.textPtMin);
    expect(result.maxTextPt).toBe(config.layout.textPtMin);
  });

  it('never uses two columns with fixed 1 column', () => {
    const columns = new Set<number>();
    const result = decideLayout(
      (params) => {
        columns.add(params.columns);
        return params.textPt > config.layout.textPtMin;
      },
      config,
      baseOptions({ columns: 1 })
    );
    expect(columns.has(2)).toBe(false);
    expect(result.params.columns).toBe(1);
    expect(result.params.textPt).toBe(config.layout.textPtMin);
  });

  it('with fixed 2 columns does not try a single column', () => {
    const columns = new Set<number>();
    decideLayout(
      (params) => {
        columns.add(params.columns);
        return true;
      },
      config,
      baseOptions({ columns: 2 })
    );
    expect([...columns]).toEqual([2]);
  });

  it('derives the chord font while keeping the minimum', () => {
    expect(chordPtFor(config.layout.textPtDefault, config)).toBe(config.layout.chordPtDefault);
    expect(chordPtFor(config.layout.textPtMin, config)).toBe(config.layout.chordPtMin);
    expect(chordPtFor(config.layout.textPtMax, config)).toBe(
      config.layout.textPtMax - (config.layout.textPtDefault - config.layout.chordPtDefault)
    );
  });
});

describe('decideLayout text ceiling', () => {
  it('keeps the requested size for a short song', () => {
    const result = decideLayout(() => false, config, baseOptions({ textPt: 9 }));
    expect(result.status).toBe('fits');
    expect(result.params.textPt).toBe(9);
    expect(result.maxTextPt).toBe(config.layout.textPtMax);
  });

  it('never grows the layout above the requested size', () => {
    const result = decideLayout(() => false, config, baseOptions({ textPt: 13 }));
    expect(result.params.textPt).toBe(13);
  });

  it('caps the ceiling at the last size that fits', () => {
    const result = decideLayout((params) => params.textPt > 12, config, baseOptions());
    expect(result.params.textPt).toBe(config.layout.textPtDefault);
    expect(result.maxTextPt).toBe(12);
  });

  it('caps the ceiling after an automatic shrink', () => {
    const result = decideLayout((params) => params.textPt > 10.5, config, baseOptions());
    expect(result.params.textPt).toBe(10.5);
    expect(result.maxTextPt).toBe(10.5);
  });

  it('lets the ceiling use two columns when they fit a larger size', () => {
    const result = decideLayout(
      (params) => params.columns === 1 || params.textPt > 13,
      config,
      baseOptions()
    );
    expect(result.params.columns).toBe(2);
    expect(result.params.textPt).toBe(config.layout.textPtDefault);
    expect(result.maxTextPt).toBe(13);
  });

  it('falls back to the minimum when no size fits', () => {
    const result = decideLayout(() => true, config, baseOptions({ textPt: 14 }));
    expect(result.status).toBe('overflow');
    expect(result.maxTextPt).toBe(config.layout.textPtMin);
  });
});
