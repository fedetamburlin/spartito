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
  return { id, source, settings, createdAt: now, updatedAt: now };
}

export function duplicateSong(song: SongEntry): SongEntry {
  return createSong(withTitle(song.source, `${songTitle(song.source)} (2)`), song.settings);
}

/** Newest created first; positions never change while editing. */
export function sortSongs(songs: SongEntry[]): SongEntry[] {
  return [...songs].sort((a, b) => (b.createdAt ?? b.updatedAt) - (a.createdAt ?? a.updatedAt));
}

/** True when the entry already holds exactly this content (no save needed). */
export function contentMatches(entry: SongEntry, source: string, settings: SongSettings): boolean {
  if (entry.source !== source) return false;
  const keys = Object.keys(entry.settings) as (keyof SongSettings)[];
  const otherKeys = Object.keys(settings) as (keyof SongSettings)[];
  if (keys.length !== otherKeys.length) return false;
  return keys.every((key) => entry.settings[key] === settings[key]);
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
  // Legacy entries have no createdAt: inherit updatedAt, nothing to migrate.
  const songs = (await store.getSongs()).map((song) => ({
    ...song,
    createdAt: song.createdAt ?? song.updatedAt
  }));
  const sidebarOpen = (await store.getMeta<boolean>('sidebarOpen')) ?? true;

  if (songs.length > 0) {
    const stored = await store.getMeta<string>('activeId');
    const activeId =
      stored && songs.some((song) => song.id === stored) ? stored : sortSongs(songs)[0].id;
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

export interface LibraryDeletion {
  songs: SongEntry[];
  activeId: string;
  removedActive: boolean;
}

/**
 * Deletes a song from the store and returns the next library state.
 * The library never stays empty: deleting the last song seeds a fresh one.
 */
export async function removeSong(
  store: LibraryStore,
  songs: SongEntry[],
  id: string,
  activeId: string,
  freshSettings: SongSettings,
  now = Date.now()
): Promise<LibraryDeletion> {
  const target = songs.find((song) => song.id === id);
  if (!target) return { songs, activeId, removedActive: false };

  await store.deleteSong(id);

  const remaining = songs.filter((song) => song.id !== id);
  if (remaining.length === 0) {
    const fresh = createSong(NEW_SONG_SOURCE, freshSettings, now);
    await store.putSong(fresh);
    return { songs: [fresh], activeId: fresh.id, removedActive: true };
  }

  const removedActive = id === activeId;
  const nextId = removedActive ? (nextActiveId(songs, id) ?? remaining[0].id) : activeId;
  return { songs: remaining, activeId: nextId, removedActive };
}
