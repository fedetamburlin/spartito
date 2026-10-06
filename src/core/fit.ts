import type { AppConfig } from './config';

export interface LayoutParams {
  columns: 1 | 2;
  textPt: number;
  chordPt: number;
}

export interface FitOptions {
  columns: 'auto' | 1 | 2;
  textPt: number;
  allowShrink?: boolean;
}

export type FitStatus = 'fits' | 'columns' | 'shrunk' | 'overflow';

export interface FitOutcome {
  params: LayoutParams;
  status: FitStatus;
  attempts: number;
}

export type Measure = (params: LayoutParams) => boolean;

export function chordPtFor(textPt: number, cfg: AppConfig): number {
  const delta = cfg.layout.textPtDefault - cfg.layout.chordPtDefault;
  return Math.max(cfg.layout.chordPtMin, textPt - delta);
}

function paramsFor(columns: 1 | 2, textPt: number, cfg: AppConfig): LayoutParams {
  return { columns, textPt, chordPt: chordPtFor(textPt, cfg) };
}

export function decideLayout(measure: Measure, cfg: AppConfig, options: FitOptions): FitOutcome {
  const target = Math.min(
    cfg.layout.textPtMax,
    Math.max(cfg.layout.textPtMin, options.textPt)
  );
  const maxColumns = cfg.layout.columnsMax >= 2 ? 2 : 1;
  let attempts = 0;

  const tryParams = (columns: 1 | 2, textPt: number): LayoutParams | null => {
    const params = paramsFor(columns, textPt, cfg);
    attempts += 1;
    return measure(params) ? null : params;
  };

  const firstColumns: 1 | 2 = options.columns === 'auto' ? cfg.layout.columnsDefault : options.columns;
  const autoColumns = options.columns === 'auto' && cfg.layout.autoColumns && maxColumns === 2;

  let params = tryParams(firstColumns, target);
  if (params) return { params, status: 'fits', attempts };

  if (autoColumns && firstColumns === 1) {
    params = tryParams(2, target);
    if (params) return { params, status: 'columns', attempts };
  }

  if (options.allowShrink !== false) {
    const shrinkColumns: 1 | 2 = autoColumns ? 2 : firstColumns;
    for (let pt = target - 0.5; pt >= cfg.layout.textPtMin - 1e-9; pt -= 0.5) {
      const rounded = Math.round(pt * 10) / 10;
      if (rounded < cfg.layout.textPtMin) break;
      params = tryParams(shrinkColumns, rounded);
      if (params) return { params, status: 'shrunk', attempts };
    }
  }

  const fallbackColumns: 1 | 2 = autoColumns ? 2 : firstColumns;
  return {
    params: paramsFor(fallbackColumns, cfg.layout.textPtMin, cfg),
    status: 'overflow',
    attempts
  };
}
