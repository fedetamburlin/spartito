import type { LibraryStore, SongEntry } from './db';
import { sortSongs } from './library';
import { sanitizeSettings, type SongSettings } from './settings';

/**
 * Full-library backup: a versioned JSON document with every song and the
 * selected one. The library order is derived from `createdAt`, so preserving
 * timestamps preserves the order exactly.
 *
 * The format is a contract with users: existing fields must keep their
 * meaning, and breaking changes require a new `schemaVersion`.
 */

export const LIBRARY_BACKUP_APP = 'spartito-app';
export const LIBRARY_BACKUP_KIND = 'library';
export const LIBRARY_BACKUP_VERSION = 1;

export interface LibraryBackup {
  app: typeof LIBRARY_BACKUP_APP;
  kind: typeof LIBRARY_BACKUP_KIND;
  schemaVersion: number;
  exportedAt: string;
  activeId: string | null;
  songs: SongEntry[];
}

export type BackupErrorCode =
  'invalid-json' | 'not-a-backup' | 'single-song' | 'newer-version' | 'empty' | 'damaged';

export type BackupParseResult =
  { ok: true; backup: LibraryBackup } | { ok: false; code: BackupErrorCode; message: string };

export type RestoreMode = 'merge' | 'replace';

export interface RestoreResult {
  songs: SongEntry[];
  activeId: string;
  importedCount: number;
  skippedCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseSong(value: unknown, index: number): SongEntry | { error: string } {
  if (!isRecord(value)) return { error: `Song ${index + 1} is not an object.` };
  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return { error: `Song ${index + 1} has no valid id.` };
  }
  if (typeof value.source !== 'string') {
    return { error: `Song ${index + 1} has no source text.` };
  }

  const createdAt = finiteNumber(value.createdAt) ?? finiteNumber(value.updatedAt) ?? 0;
  const updatedAt = finiteNumber(value.updatedAt) ?? createdAt;
  return {
    id: value.id,
    source: value.source,
    settings: sanitizeSettings(value.settings as Partial<SongSettings> | undefined),
    createdAt,
    updatedAt
  };
}

export function buildLibraryBackup(
  songs: SongEntry[],
  activeId: string | null,
  exportedAt = new Date()
): LibraryBackup {
  const ordered = sortSongs(songs);
  const active =
    activeId && ordered.some((song) => song.id === activeId) ? activeId : (ordered[0]?.id ?? null);

  return {
    app: LIBRARY_BACKUP_APP,
    kind: LIBRARY_BACKUP_KIND,
    schemaVersion: LIBRARY_BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    activeId: active,
    songs: ordered.map((song) => ({ ...song, settings: { ...song.settings } }))
  };
}

export function serializeLibraryBackup(backup: LibraryBackup): string {
  return JSON.stringify(backup, null, 2);
}

export function parseLibraryBackup(text: string): BackupParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return {
      ok: false,
      code: 'invalid-json',
      message: 'This file is not valid JSON.'
    };
  }

  if (!isRecord(value)) {
    return { ok: false, code: 'not-a-backup', message: 'This is not a Spartito backup.' };
  }

  // The single-song export has a `source` but no song list: point the user
  // to the right import path instead of treating it as a broken library.
  if (typeof value.source === 'string' && !Array.isArray(value.songs)) {
    return {
      ok: false,
      code: 'single-song',
      message: 'This is a single-song file, not a library backup. Import it from the toolbar.'
    };
  }

  if (value.app !== LIBRARY_BACKUP_APP || value.kind !== LIBRARY_BACKUP_KIND) {
    return {
      ok: false,
      code: 'not-a-backup',
      message: 'This is not a Spartito library backup.'
    };
  }

  if (typeof value.schemaVersion !== 'number' || !Number.isInteger(value.schemaVersion)) {
    return {
      ok: false,
      code: 'not-a-backup',
      message: 'The backup has no schema version.'
    };
  }

  if (value.schemaVersion > LIBRARY_BACKUP_VERSION) {
    return {
      ok: false,
      code: 'newer-version',
      message: 'This backup was created by a newer version of Spartito. Update the app and retry.'
    };
  }

  if (value.schemaVersion < 1) {
    return { ok: false, code: 'damaged', message: 'The backup has an unsupported schema version.' };
  }

  if (!Array.isArray(value.songs) || value.songs.length === 0) {
    return { ok: false, code: 'empty', message: 'The backup does not contain any songs.' };
  }

  const songs: SongEntry[] = [];
  const ids = new Set<string>();
  for (const [index, raw] of value.songs.entries()) {
    const parsed = parseSong(raw, index);
    if ('error' in parsed) return { ok: false, code: 'damaged', message: parsed.error };
    if (ids.has(parsed.id)) {
      return {
        ok: false,
        code: 'damaged',
        message: `The backup contains the same song id twice (${parsed.id}).`
      };
    }
    ids.add(parsed.id);
    songs.push(parsed);
  }

  const ordered = sortSongs(songs);
  const activeId =
    typeof value.activeId === 'string' && ids.has(value.activeId) ? value.activeId : ordered[0].id;
  const exportedAt =
    typeof value.exportedAt === 'string' && !Number.isNaN(Date.parse(value.exportedAt))
      ? value.exportedAt
      : new Date(0).toISOString();

  return {
    ok: true,
    backup: {
      app: LIBRARY_BACKUP_APP,
      kind: LIBRARY_BACKUP_KIND,
      schemaVersion: value.schemaVersion,
      exportedAt,
      activeId,
      songs: ordered
    }
  };
}

/**
 * Applies a parsed backup to the store. Merge never overwrites an existing
 * song id, so importing the same file twice is a no-op; replace swaps the
 * whole library in one IndexedDB transaction.
 */
export async function restoreLibrary(
  store: LibraryStore,
  currentSongs: SongEntry[],
  currentActiveId: string,
  backup: LibraryBackup,
  mode: RestoreMode
): Promise<RestoreResult> {
  if (mode === 'replace') {
    const songs = backup.songs;
    await store.replaceSongs(songs);
    const activeId =
      backup.activeId && songs.some((song) => song.id === backup.activeId)
        ? backup.activeId
        : songs[0].id;
    await store.putMeta('activeId', activeId);
    return { songs, activeId, importedCount: songs.length, skippedCount: 0 };
  }

  const existing = new Set(currentSongs.map((song) => song.id));
  const additions = backup.songs.filter((song) => !existing.has(song.id));
  if (additions.length > 0) await store.putSongs(additions);

  const songs = [...currentSongs, ...additions];
  const activeId = songs.some((song) => song.id === currentActiveId)
    ? currentActiveId
    : sortSongs(songs)[0].id;
  return {
    songs,
    activeId,
    importedCount: additions.length,
    skippedCount: backup.songs.length - additions.length
  };
}
