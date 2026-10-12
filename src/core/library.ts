import type { LibraryStore, SongEntry } from './db';
import { sanitizeSettings, type SongSettings } from './settings';

/**
 * Song library logic: pure helpers (title handling, ordering, selection)
 * plus the store-backed bootstrap and migration from the single-song era.
 */

export interface LegacyState {
  source: string;
  settings?: Partial<SongSettings>;
}

export interface LibraryState {
  songs: SongEntry[];
  activeId: string;
  sidebarOpen: boolean;
}

export const UNTITLED = 'Untitled';
export const NEW_SONG_SOURCE = '{title: New song}\n';

const TITLE_RE = /^[ \t]*\{[ \t]*title[ \t]*:[ \t]*(.*?)[ \t]*\}[ \t]*$/m;

export function songTitle(source: string): string {
  return TITLE_RE.exec(source)?.[1]?.trim() || UNTITLED;
}

export function withTitle(source: string, title: string): string {
  const line = `{title: ${title}}`;
  if (TITLE_RE.test(source)) return source.replace(TITLE_RE, line);
  const body = source.replace(/^\n+/, '');
  return body ? `${line}\n\n${body}` : `${line}\n`;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `song-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSong(
  source: string,
  settings: SongSettings,
  now = Date.now(),
  id = newId()
): SongEntry {
  return { id, source, settings, updatedAt: now };
}

export function duplicateSong(song: SongEntry): SongEntry {
  return createSong(withTitle(song.source, `${songTitle(song.source)} (2)`), song.settings);
}

/** Most recently edited first, like a chat list. */
export function sortSongs(songs: SongEntry[]): SongEntry[] {
  return [...songs].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Neighbour to select when the song at `removingId` is deleted. */
export function nextActiveId(songs: SongEntry[], removingId: string): string | undefined {
  const ordered = sortSongs(songs);
  const index = ordered.findIndex((song) => song.id === removingId);
  if (index === -1) return ordered[0]?.id;
  return (ordered[index + 1] ?? ordered[index - 1])?.id;
}

export async function initLibrary(
  store: LibraryStore,
  legacy: LegacyState | null,
  demoSource: string
): Promise<LibraryState> {
  const songs = await store.getSongs();
  const sidebarOpen = (await store.getMeta<boolean>('sidebarOpen')) ?? true;

  if (songs.length > 0) {
    const stored = await store.getMeta<string>('activeId');
    const activeId = stored && songs.some((song) => song.id === stored) ? stored : sortSongs(songs)[0].id;
    return { songs, activeId, sidebarOpen };
  }

  const migrated = (await store.getMeta<boolean>('migratedFromLegacy')) ?? false;
  const fromLegacy = !migrated && legacy !== null;
  const song = createSong(
    fromLegacy ? legacy.source : demoSource,
    sanitizeSettings(fromLegacy ? legacy.settings : undefined)
  );

  await store.putSong(song);
  await store.putMeta('activeId', song.id);
  await store.putMeta('migratedFromLegacy', true);
  return { songs: [song], activeId: song.id, sidebarOpen };
}
