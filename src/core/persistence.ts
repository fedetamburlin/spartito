import type { SongSettings } from './settings';

const STORAGE_KEY = 'spartito-app';
export const SCHEMA_VERSION = 1;

export interface StoredState {
  schemaVersion: number;
  source: string;
  settings: Partial<SongSettings>;
}

export interface ImportedSong {
  source: string;
  settings?: Partial<SongSettings>;
}

export function loadState(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (typeof parsed.source !== 'string') return null;
    return {
      schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : SCHEMA_VERSION,
      source: parsed.source,
      settings: parsed.settings ?? {}
    };
  } catch {
    return null;
  }
}

export function saveState(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable: the app stays usable without autosave
  }
}

export function buildJsonExport(source: string, settings: SongSettings): string {
  return JSON.stringify(
    { app: 'spartito-app', schemaVersion: SCHEMA_VERSION, source, settings },
    null,
    2
  );
}

export function parseImported(text: string, filename: string): ImportedSong {
  const looksLikeJson = filename.toLowerCase().endsWith('.json') || text.trimStart().startsWith('{');
  if (looksLikeJson) {
    try {
      const parsed = JSON.parse(text) as { source?: unknown; settings?: unknown };
      if (typeof parsed.source === 'string') {
        return {
          source: parsed.source,
          settings: (parsed.settings ?? undefined) as Partial<SongSettings> | undefined
        };
      }
    } catch {
      // not a JSON wrapper: treated as plain text source
    }
  }
  return { source: text };
}

export function fileBaseName(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'canzone';
}
