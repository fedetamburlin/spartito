import { describe, expect, it } from 'vitest';
import { config } from '../../src/core/config';
import { chordPtFor, decideLayout, type LayoutParams } from '../../src/core/fit';

const baseOptions = (
  overrides: Partial<{ columns: 'auto' | 1 | 2; textPt: number; allowGrow: boolean }> = {}
) => ({
  columns: 'auto' as const,
  textPt: config.layout.textPtDefault,
  ...overrides
});

describe('decideLayout', () => {
  it('uses the default when it fits in one column', () => {
    const seen: LayoutParams[] = [];
    const result = decideLayout(
      (params) => {
        seen.push(params);
        return false;
      },
      config,
      baseOptions()
    );
    expect(result.status).toBe('fits');
    expect(result.params.columns).toBe(1);
    expect(result.params.textPt).toBe(config.layout.textPtDefault);
    expect(result.attempts).toBe(1);
    expect(seen).toHaveLength(1);
  });

  it('switches to two columns when one overflows', () => {
    const result = decideLayout((params) => params.columns === 1, config, baseOptions());
    expect(result.status).toBe('columns');
    expect(result.params.columns).toBe(2);
    expect(result.params.textPt).toBe(config.layout.textPtDefault);
    expect(result.attempts).toBe(2);
  });

  it('shrinks the font when two columns overflow too', () => {
    const result = decideLayout((params) => params.textPt > 10.5, config, baseOptions());
    expect(result.status).toBe('shrunk');
    expect(result.params.textPt).toBe(10.5);
    expect(result.params.columns).toBe(2);
  });

  it('goes down to the minimum readable size', () => {
    const result = decideLayout(
      (params) => params.textPt > config.layout.textPtMin,
      config,
      baseOptions()
    );
    expect(result.status).toBe('shrunk');
    expect(result.params.textPt).toBe(config.layout.textPtMin);
  });

  it('reports overflow when nothing fits', () => {
    const result = decideLayout(() => true, config, baseOptions());
    expect(result.status).toBe('overflow');
    expect(result.params.textPt).toBe(config.layout.textPtMin);
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

describe('decideLayout allowGrow', () => {
  it('grows a short song up to the maximum when there is room', () => {
    const result = decideLayout(() => false, config, baseOptions({ allowGrow: true }));
    expect(result.status).toBe('fits');
    expect(result.params.textPt).toBe(config.layout.textPtMax);
    expect(result.params.columns).toBe(1);
    // 11 -> 14 in 0.5pt steps: 1 initial + 6 grow attempts
    expect(result.attempts).toBe(1 + (config.layout.textPtMax - config.layout.textPtDefault) / 0.5);
  });

  it('grows in two columns when the song needed them', () => {
    const result = decideLayout(
      (params) => params.columns === 1 || params.textPt > 13,
      config,
      baseOptions({ allowGrow: true })
    );
    expect(result.status).toBe('columns');
    expect(result.params.columns).toBe(2);
    expect(result.params.textPt).toBe(13);
  });

  it('stops growing at the first size that overflows', () => {
    const seen: number[] = [];
    const result = decideLayout(
      (params) => {
        seen.push(params.textPt);
        return params.textPt > 12;
      },
      config,
      baseOptions({ allowGrow: true })
    );
    expect(result.params.textPt).toBe(12);
    expect(seen).toContain(12.5);
    expect(seen).not.toContain(13);
  });

  it('never grows past textPtMax', () => {
    const seen: number[] = [];
    decideLayout(
      (params) => {
        seen.push(params.textPt);
        return false;
      },
      config,
      baseOptions({ allowGrow: true })
    );
    expect(Math.max(...seen)).toBe(config.layout.textPtMax);
  });

  it('leaves the layout untouched when allowGrow is not set', () => {
    const result = decideLayout(() => false, config, baseOptions());
    expect(result.params.textPt).toBe(config.layout.textPtDefault);
    expect(result.attempts).toBe(1);
  });

  it('does not grow after shrinking or overflowing', () => {
    const grown = decideLayout(
      (params) => params.textPt > 10.5,
      config,
      baseOptions({ allowGrow: true })
    );
    expect(grown.status).toBe('shrunk');
    expect(grown.params.textPt).toBe(10.5);

    const overflow = decideLayout(() => true, config, baseOptions({ allowGrow: true }));
    expect(overflow.status).toBe('overflow');
    expect(overflow.params.textPt).toBe(config.layout.textPtMin);
  });

  it('grows from a user size above the default', () => {
    const result = decideLayout(() => false, config, baseOptions({ textPt: 13, allowGrow: true }));
    expect(result.status).toBe('fits');
    expect(result.params.textPt).toBe(config.layout.textPtMax);
  });
});
