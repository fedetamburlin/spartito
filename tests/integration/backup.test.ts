import { describe, expect, it } from 'vitest';
import {
  buildLibraryBackup,
  restoreLibrary,
  type LibraryBackup,
  type RestoreMode
} from '../../src/core/backup';
import type { LibraryStore, SongEntry } from '../../src/core/db';
import { createSong } from '../../src/core/library';
import { defaultSettings } from '../../src/core/settings';

class FakeStore implements LibraryStore {
  songs = new Map<string, SongEntry>();
  meta = new Map<string, unknown>();

  async getSongs() {
    return [...this.songs.values()];
  }
  async putSong(song: SongEntry) {
    this.songs.set(song.id, song);
  }
  async putSongs(songs: SongEntry[]) {
    for (const song of songs) this.songs.set(song.id, song);
  }
  async replaceSongs(songs: SongEntry[]) {
    this.songs.clear();
    for (const song of songs) this.songs.set(song.id, song);
  }
  async deleteSong(id: string) {
    this.songs.delete(id);
  }
  async getMeta<T>(key: string) {
    return this.meta.get(key) as T | undefined;
  }
  async putMeta(key: string, value: unknown) {
    this.meta.set(key, value);
  }
}

const settings = defaultSettings();
const current = [
  createSong('{title: A}\n', settings, 3, 'a'),
  createSong('{title: B}\n', settings, 2, 'b')
];
const backup = buildLibraryBackup(
  [createSong('{title: B}\n', settings, 2, 'b'), createSong('{title: C}\n', settings, 1, 'c')],
  'b',
  new Date('2026-10-25T12:00:00Z')
);

async function seeded(songs: SongEntry[]): Promise<FakeStore> {
  const store = new FakeStore();
  for (const song of songs) await store.putSong(song);
  return store;
}

async function restore(store: FakeStore, source: LibraryBackup, mode: RestoreMode, activeId = 'a') {
  return restoreLibrary(store, [...store.songs.values()], activeId, source, mode);
}

describe('restoreLibrary', () => {
  it('merge adds missing songs and keeps existing ones untouched', async () => {
    const store = await seeded(current);
    const result = await restore(store, backup, 'merge');

    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.activeId).toBe('a');
    expect([...store.songs.keys()].sort()).toEqual(['a', 'b', 'c']);
    expect(store.meta.get('activeId')).toBeUndefined();
  });

  it('importing the same backup twice is a no-op', async () => {
    const store = await seeded(current);
    await restore(store, backup, 'merge');
    const again = await restore(store, backup, 'merge');

    expect(again.importedCount).toBe(0);
    expect(again.skippedCount).toBe(2);
    expect([...store.songs.keys()].sort()).toEqual(['a', 'b', 'c']);
  });

  it('replace swaps the whole library and restores the active song', async () => {
    const store = await seeded(current);
    const result = await restore(store, backup, 'replace');

    expect(result.importedCount).toBe(2);
    expect(result.skippedCount).toBe(0);
    expect(result.activeId).toBe('b');
    expect([...store.songs.keys()].sort()).toEqual(['b', 'c']);
    expect(store.meta.get('activeId')).toBe('b');
  });
});
