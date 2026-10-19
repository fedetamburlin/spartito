import { describe, expect, it } from 'vitest';
import type { LibraryStore, SongEntry } from '../../src/core/db';
import {
  contentMatches,
  createSong,
  duplicateSong,
  initLibrary,
  NEW_SONG_SOURCE,
  nextActiveId,
  removeSong,
  songTitle,
  sortSongs,
  withTitle
} from '../../src/core/library';
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

describe('songTitle / withTitle', () => {
  it('reads the title directive', () => {
    expect(songTitle('{title: My song}\n[Am]Ciao\n')).toBe('My song');
    expect(songTitle('{ title : Spaced }\n')).toBe('Spaced');
  });

  it('falls back to Untitled', () => {
    expect(songTitle('')).toBe('Untitled');
    expect(songTitle('[Am]Ciao\n')).toBe('Untitled');
  });

  it('replaces an existing title in place', () => {
    const source = '{title: Old}\n\n[Am]Ciao\n';
    expect(withTitle(source, 'New')).toBe('{title: New}\n\n[Am]Ciao\n');
  });

  it('adds a title at the top when missing', () => {
    expect(withTitle('[Am]Ciao\n', 'Fresh')).toBe('{title: Fresh}\n\n[Am]Ciao\n');
    expect(withTitle('', 'Empty')).toBe('{title: Empty}\n');
  });
});

describe('library operations', () => {
  it('creates unique songs', () => {
    const a = createSong(NEW_SONG_SOURCE, defaultSettings(), 1, 'a');
    const b = createSong(NEW_SONG_SOURCE, defaultSettings(), 2, 'b');
    expect(a.id).not.toBe(b.id);
    expect(a.createdAt).toBe(1);
    expect(a.updatedAt).toBe(1);
    expect(a.settings.textPt).toBe(defaultSettings().textPt);
  });

  it('duplicates with a (2) title and fresh identity', () => {
    const song = createSong('{title: Test}\n', defaultSettings(), 1, 'a');
    const copy = duplicateSong(song);
    expect(songTitle(copy.source)).toBe('Test (2)');
    expect(copy.id).not.toBe(song.id);
    expect(copy.createdAt).toBeGreaterThan(song.createdAt);
    expect(copy.settings).toEqual(song.settings);
  });

  it('orders by creation, newest first, and never reorders on edit', () => {
    const older = createSong('{title: A}\n', defaultSettings(), 1, 'a');
    const newer = createSong('{title: B}\n', defaultSettings(), 2, 'b');
    const edited = { ...older, updatedAt: 99 };
    expect(sortSongs([edited, newer]).map((song) => song.id)).toEqual(['b', 'a']);
    expect(sortSongs([newer, older]).map((song) => song.id)).toEqual(['b', 'a']);
  });

  it('knows when the stored content already matches', () => {
    const settings = defaultSettings();
    const song = createSong('{title: A}\n', settings, 1, 'a');
    expect(contentMatches(song, song.source, settings)).toBe(true);
    expect(contentMatches(song, '{title: A}\n[Am]x\n', settings)).toBe(false);
    expect(contentMatches(song, song.source, { ...settings, textPt: settings.textPt + 1 })).toBe(
      false
    );
  });

  it('picks a neighbour when deleting the active song', () => {
    const songs = [
      createSong('{title: A}\n', defaultSettings(), 3, 'a'),
      createSong('{title: B}\n', defaultSettings(), 2, 'b'),
      createSong('{title: C}\n', defaultSettings(), 1, 'c')
    ];
    expect(nextActiveId(songs, 'b')).toBe('c');
    expect(nextActiveId(songs, 'c')).toBe('b');
    expect(nextActiveId(songs, 'a')).toBe('b');
    expect(nextActiveId([songs[0]], 'a')).toBeUndefined();
  });
});

describe('initLibrary', () => {
  const demo = '{title: Demo}\n[Am]Ciao\n';

  it('seeds a fresh install with the demo song', async () => {
    const store = new FakeStore();
    const state = await initLibrary(store, null, demo);
    expect(state.songs).toHaveLength(1);
    expect(state.activeId).toBe(state.songs[0].id);
    expect(state.songs[0].source).toBe(demo);
    expect(state.sidebarOpen).toBe(true);
    expect(await store.getMeta('migratedFromLegacy')).toBe(true);
  });

  it('migrates the single-song legacy state once', async () => {
    const store = new FakeStore();
    const legacy = { source: '{title: Legacy}\n', settings: { textPt: 9 } };
    const state = await initLibrary(store, legacy, demo);
    expect(songTitle(state.songs[0].source)).toBe('Legacy');
    expect(state.songs[0].settings.textPt).toBe(9);

    const again = await initLibrary(store, legacy, demo);
    expect(again.songs.map((song) => song.id)).toEqual(state.songs.map((song) => song.id));
  });

  it('keeps existing songs and restores the stored selection', async () => {
    const store = new FakeStore();
    const first = createSong('{title: A}\n', defaultSettings(), 1, 'a');
    const second = createSong('{title: B}\n', defaultSettings(), 2, 'b');
    await store.putSong(first);
    await store.putSong(second);
    await store.putMeta('activeId', 'a');

    const state = await initLibrary(store, null, demo);
    expect(state.activeId).toBe('a');
    expect(state.songs).toHaveLength(2);

    await store.putMeta('activeId', 'missing');
    const fallback = await initLibrary(store, null, demo);
    expect(fallback.activeId).toBe('b');
  });

  it('restores the sidebar preference', async () => {
    const store = new FakeStore();
    await store.putMeta('sidebarOpen', false);
    const state = await initLibrary(store, null, demo);
    expect(state.sidebarOpen).toBe(false);
  });

  it('backfills createdAt for legacy entries', async () => {
    const store = new FakeStore();
    const legacySong = {
      id: 'old',
      source: '{title: Old}\n',
      settings: defaultSettings(),
      updatedAt: 42
    } as SongEntry;
    await store.putSong(legacySong);

    const state = await initLibrary(store, null, demo);
    expect(state.songs[0].createdAt).toBe(42);
  });
});

describe('removeSong', () => {
  const settings = defaultSettings();

  it('deletes from the store and selects the neighbour', async () => {
    const store = new FakeStore();
    const a = createSong('{title: A}\n', settings, 3, 'a');
    const b = createSong('{title: B}\n', settings, 2, 'b');
    const c = createSong('{title: C}\n', settings, 1, 'c');
    for (const song of [a, b, c]) await store.putSong(song);

    const result = await removeSong(store, [a, b, c], 'b', 'b', settings);
    expect(store.songs.has('b')).toBe(false);
    expect(result.songs.map((song) => song.id)).toEqual(['a', 'c']);
    expect(result.removedActive).toBe(true);
    expect(result.activeId).toBe('c');
  });

  it('keeps the active song when deleting another one', async () => {
    const store = new FakeStore();
    const a = createSong('{title: A}\n', settings, 2, 'a');
    const b = createSong('{title: B}\n', settings, 1, 'b');
    await store.putSong(a);
    await store.putSong(b);

    const result = await removeSong(store, [a, b], 'a', 'b', settings);
    expect(store.songs.has('a')).toBe(false);
    expect(result.removedActive).toBe(false);
    expect(result.activeId).toBe('b');
    expect(result.songs.map((song) => song.id)).toEqual(['b']);
  });

  it('seeds a fresh song when deleting the last one', async () => {
    const store = new FakeStore();
    const only = createSong('{title: Only}\n', settings, 1, 'only');
    await store.putSong(only);

    const result = await removeSong(store, [only], 'only', 'only', settings);
    expect(store.songs.has('only')).toBe(false);
    expect(result.songs).toHaveLength(1);
    expect(store.songs.has(result.activeId)).toBe(true);
    expect(result.removedActive).toBe(true);
  });

  it('ignores unknown ids', async () => {
    const store = new FakeStore();
    const a = createSong('{title: A}\n', settings, 1, 'a');
    await store.putSong(a);

    const result = await removeSong(store, [a], 'nope', 'a', settings);
    expect(result.songs.map((song) => song.id)).toEqual(['a']);
    expect(result.activeId).toBe('a');
    expect(result.removedActive).toBe(false);
  });
});
