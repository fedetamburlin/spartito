import { config } from './config';
import { TRANSPOSE_MAX, TRANSPOSE_MIN } from './transpose';

export interface SongSettings {
  fontId: string;
  textPt: number;
  columns: 'auto' | 1 | 2;
  marginsMm: number;
  transpose: number;
  textColor: string;
  chordColor: string;
  commentColor: string;
}

export function defaultSettings(): SongSettings {
  return {
    fontId: config.typography.fontDefault,
    textPt: config.layout.textPtDefault,
    columns: 'auto',
    marginsMm: config.page.marginsMm.left,
    transpose: 0,
    textColor: config.colors.text,
    chordColor: config.colors.chord,
    commentColor: config.colors.comment
  };
}

export function sanitizeSettings(partial?: Partial<SongSettings> | null): SongSettings {
  const base = defaultSettings();
  if (!partial) return base;

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const fontExists = config.typography.fonts.some((font) => font.id === partial.fontId);

  return {
    fontId: fontExists ? (partial.fontId as string) : base.fontId,
    textPt:
      typeof partial.textPt === 'number'
        ? clamp(partial.textPt, config.layout.textPtMin, config.layout.textPtMax)
        : base.textPt,
    columns:
      partial.columns === 1 || partial.columns === 2 || partial.columns === 'auto'
        ? partial.columns
        : base.columns,
    marginsMm:
      typeof partial.marginsMm === 'number'
        ? clamp(partial.marginsMm, config.page.marginsMinMm, config.page.marginsMaxMm)
        : base.marginsMm,
    transpose:
      typeof partial.transpose === 'number'
        ? clamp(Math.round(partial.transpose), TRANSPOSE_MIN, TRANSPOSE_MAX)
        : base.transpose,
    textColor: typeof partial.textColor === 'string' ? partial.textColor : base.textColor,
    chordColor: typeof partial.chordColor === 'string' ? partial.chordColor : base.chordColor,
    commentColor: typeof partial.commentColor === 'string' ? partial.commentColor : base.commentColor
  };
}

export function withTranspose(settings: SongSettings, delta: number): SongSettings {
  return sanitizeSettings({ ...settings, transpose: settings.transpose + delta });
}
