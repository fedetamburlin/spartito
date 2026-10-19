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
  /**
   * Largest text size that still fits on the page, for the manual size
   * ceiling. When even the minimum overflows, this is the minimum: the
   * status warns that no size fits.
   */
  maxTextPt: number;
  /** Measurements performed, including the ceiling probe. */
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
  const target = Math.min(cfg.layout.textPtMax, Math.max(cfg.layout.textPtMin, options.textPt));
  const maxColumns = cfg.layout.columnsMax >= 2 ? 2 : 1;
  const firstColumns: 1 | 2 =
    options.columns === 'auto' ? cfg.layout.columnsDefault : options.columns;
  const autoColumns = options.columns === 'auto' && cfg.layout.autoColumns && maxColumns === 2;
  let attempts = 0;

  const fits = (columns: 1 | 2, textPt: number): boolean => {
    attempts += 1;
    return !measure(paramsFor(columns, textPt, cfg));
  };

  /** Would this size fit with the same column choice the preview makes? */
  const fitsAuto = (textPt: number): boolean => {
    if (fits(firstColumns, textPt)) return true;
    return autoColumns && firstColumns === 1 && fits(2, textPt);
  };

  let columns = firstColumns;
  let textPt = target;
  let status: FitStatus = 'fits';

  if (!fits(firstColumns, target)) {
    if (autoColumns && firstColumns === 1 && fits(2, target)) {
      columns = 2;
      status = 'columns';
    } else if (options.allowShrink !== false) {
      columns = autoColumns ? 2 : firstColumns;
      status = 'shrunk';
      let shrunk: number | null = null;
      for (let pt = target - 0.5; pt >= cfg.layout.textPtMin - 1e-9; pt -= 0.5) {
        const rounded = Math.round(pt * 10) / 10;
        if (rounded < cfg.layout.textPtMin) break;
        if (fits(columns, rounded)) {
          shrunk = rounded;
          break;
        }
      }
      if (shrunk === null) {
        status = 'overflow';
        textPt = cfg.layout.textPtMin;
      } else {
        textPt = shrunk;
      }
    } else {
      columns = autoColumns ? 2 : firstColumns;
      textPt = cfg.layout.textPtMin;
      status = 'overflow';
    }
  }

  // Probe upward without applying the result: the preview stays at the
  // requested (or shrunk) size, while the toolbar caps manual growth here.
  let maxTextPt = textPt;
  for (let pt = textPt + 0.5; pt <= cfg.layout.textPtMax + 1e-9; pt += 0.5) {
    const rounded = Math.round(pt * 10) / 10;
    if (rounded > cfg.layout.textPtMax) break;
    if (!fitsAuto(rounded)) break;
    maxTextPt = rounded;
  }

  return { params: paramsFor(columns, textPt, cfg), status, maxTextPt, attempts };
}
