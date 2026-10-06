import defaults from '../../config/defaults.json';

export interface FontDef {
  id: string;
  family: string;
  role: 'sans' | 'serif' | 'mono';
  license: string;
}

export interface AppConfig {
  page: {
    format: string;
    orientation: string;
    widthMm: number;
    heightMm: number;
    marginsMm: { top: number; right: number; bottom: number; left: number };
    marginsMinMm: number;
    marginsMaxMm: number;
  };
  layout: {
    textPtDefault: number;
    chordPtDefault: number;
    textPtMin: number;
    chordPtMin: number;
    textPtMax: number;
    leading: number;
    sectionGapEm: number;
    columnsDefault: 1 | 2;
    columnsMax: 1 | 2;
    autoColumns: boolean;
    autoFit: boolean;
    autoGrow: boolean;
  };
  typography: {
    fontDefault: string;
    editorFont: string;
    fonts: FontDef[];
    boldItalicByRole: Record<string, { bold: boolean; italic: boolean }>;
  };
  colors: {
    text: string;
    chord: string;
    chorus: string;
    comment: string;
    palette: string[];
  };
  export: {
    referenceBrowser: string;
    bestEffortBrowsers: string[];
    printScale: number;
    preferCssPageSize: boolean;
    pdfMetadata: { titleFromSong: boolean };
  };
  storage: {
    driver: string;
    autosaveDebounceMs: number;
    importExtensions: string[];
    exportExtensions: string[];
  };
}

export const config = defaults as AppConfig;

export function fontStack(fontId: string): string {
  const font = config.typography.fonts.find((item) => item.id === fontId) ?? config.typography.fonts[0];
  const fallback = font.role === 'serif' ? 'serif' : font.role === 'mono' ? 'monospace' : 'sans-serif';
  return `"${font.family}", ${fallback}`;
}
