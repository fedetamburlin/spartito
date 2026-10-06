import { describe, expect, it } from 'vitest';
import { config } from '../src/core/config';
import { chordPtFor, decideLayout, type LayoutParams } from '../src/core/fit';

const baseOptions = (overrides: Partial<{ columns: 'auto' | 1 | 2; textPt: number }> = {}) => ({
  columns: 'auto' as const,
  textPt: config.layout.textPtDefault,
  ...overrides
});

describe('decideLayout', () => {
  it('usa il default quando entra in una colonna', () => {
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

  it('passa a due colonne quando una sola sfora', () => {
    const result = decideLayout((params) => params.columns === 1, config, baseOptions());
    expect(result.status).toBe('columns');
    expect(result.params.columns).toBe(2);
    expect(result.params.textPt).toBe(config.layout.textPtDefault);
    expect(result.attempts).toBe(2);
  });

  it('riduce il font quando anche due colonne sforano', () => {
    const result = decideLayout(
      (params) => params.textPt > 10.5,
      config,
      baseOptions()
    );
    expect(result.status).toBe('shrunk');
    expect(result.params.textPt).toBe(10.5);
    expect(result.params.columns).toBe(2);
  });

  it('scende fino al minimo di leggibilità', () => {
    const result = decideLayout(
      (params) => params.textPt > config.layout.textPtMin,
      config,
      baseOptions()
    );
    expect(result.status).toBe('shrunk');
    expect(result.params.textPt).toBe(config.layout.textPtMin);
  });

  it('segnala overflow quando nulla entra', () => {
    const result = decideLayout(() => true, config, baseOptions());
    expect(result.status).toBe('overflow');
    expect(result.params.textPt).toBe(config.layout.textPtMin);
  });

  it('non usa mai due colonne con colonne fisse a 1', () => {
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

  it('con colonne fisse a 2 non prova la singola colonna', () => {
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

  it('deriva il font degli accordi mantenendo il minimo', () => {
    expect(chordPtFor(config.layout.textPtDefault, config)).toBe(config.layout.chordPtDefault);
    expect(chordPtFor(config.layout.textPtMin, config)).toBe(config.layout.chordPtMin);
    expect(chordPtFor(config.layout.textPtMax, config)).toBe(
      config.layout.textPtMax - (config.layout.textPtDefault - config.layout.chordPtDefault)
    );
  });
});
