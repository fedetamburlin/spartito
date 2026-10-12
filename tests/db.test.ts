import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openLibraryDb } from '../src/core/db';
import { createSong, initLibrary } from '../src/core/library';
import { defaultSettings } from '../src/core/settings';

const uniqueName = () => `spartito-test-${Math.random().toString(36).slice(2)}`;

describe('IndexedDB library store', () => {
  it('roundtrips songs and meta', async () => {
    const store = await openLibraryDb(uniqueName());
    const song = createSong('{title: X}\n', defaultSettings(), 1, 'a');

    await store.putSong(song);
    expect(await store.getSongs()).toEqual([song]);

    await store.putMeta('activeId', 'a');
    expect(await store.getMeta<string>('activeId')).toBe('a');

    await store.deleteSong('a');
    expect(await store.getSongs()).toEqual([]);
  });

  it('persists across reopen', async () => {
    const name = uniqueName();
    const store = await openLibraryDb(name);
    await store.putSong(createSong('{title: X}\n', defaultSettings(), 1, 'x'));

    const reopened = await openLibraryDb(name);
    expect((await reopened.getSongs()).map((song) => song.id)).toEqual(['x']);
  });

  it('seeds an empty database through initLibrary', async () => {
    const store = await openLibraryDb(uniqueName());
    const state = await initLibrary(store, null, '{title: Demo}\n');
    expect(state.songs.map((song) => song.id)).toEqual([state.activeId]);
    expect(state.songs[0].source).toContain('Demo');
  });
});
