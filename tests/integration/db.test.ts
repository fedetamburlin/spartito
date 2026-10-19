import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openLibraryDb } from '../../src/core/db';
import { createSong, initLibrary, removeSong } from '../../src/core/library';
import { defaultSettings } from '../../src/core/settings';

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

  it('accepts proxy-wrapped entries (Svelte $state objects)', async () => {
    const store = await openLibraryDb(uniqueName());
    const song = createSong('{title: Proxied}\n', defaultSettings(), 5, 'p');
    const proxied = new Proxy(song, {});

    await expect(store.putSong(proxied)).resolves.toBeUndefined();
    expect(await store.getSongs()).toEqual([song]);
  });

  it('deletion survives a reopen', async () => {
    const name = uniqueName();
    const store = await openLibraryDb(name);
    const a = createSong('{title: A}\n', defaultSettings(), 3, 'a');
    const b = createSong('{title: B}\n', defaultSettings(), 2, 'b');
    const c = createSong('{title: C}\n', defaultSettings(), 1, 'c');
    for (const song of [a, b, c]) await store.putSong(song);

    const result = await removeSong(store, [a, b, c], 'b', 'b', defaultSettings());
    expect(result.activeId).toBe('c');

    const reopened = await openLibraryDb(name);
    const ids = (await reopened.getSongs()).map((song) => song.id).sort();
    expect(ids).toEqual(['a', 'c']);
  });
});
