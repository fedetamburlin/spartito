import { describe, expect, it } from 'vitest';
import { createSong } from '../../src/core/library';
import {
  emptySongbook,
  moveSongbookSong,
  removeSongbookSong,
  songbookPages,
  toggleSongbookSong,
  type SongbookDraft
} from '../../src/core/songbook';
import { sanitizeSettings, type SongSettings } from '../../src/core/settings';

const song = (id: string, source: string, partial: Partial<SongSettings> = {}) =>
  createSong(source, sanitizeSettings(partial), 0, id);

const book = (ids: string[]): SongbookDraft => ({ ids, cover: true });

describe('songbook draft', () => {
  it('starts empty with a cover page', () => {
    expect(emptySongbook()).toEqual({ ids: [], cover: true });
  });

  it('adds a song at the end and drops it when picked again', () => {
    const withOne = toggleSongbookSong(book([]), 'a');
    expect(withOne.ids).toEqual(['a']);

    const withTwo = toggleSongbookSong(withOne, 'b');
    expect(withTwo.ids).toEqual(['a', 'b']);

    expect(toggleSongbookSong(withTwo, 'a').ids).toEqual(['b']);
    expect(toggleSongbookSong(withTwo, 'zzz').ids).toEqual(['a', 'b', 'zzz']);
  });

  it('removes a song and keeps the order of the others', () => {
    expect(removeSongbookSong(book(['a', 'b', 'c']), 'b').ids).toEqual(['a', 'c']);
    expect(removeSongbookSong(book(['a', 'b', 'c']), 'zzz').ids).toEqual(['a', 'b', 'c']);
  });

  it('moves a song one step up or down', () => {
    expect(moveSongbookSong(book(['a', 'b', 'c']), 'b', -1).ids).toEqual(['b', 'a', 'c']);
    expect(moveSongbookSong(book(['a', 'b', 'c']), 'b', 1).ids).toEqual(['a', 'c', 'b']);
  });

  it('ignores moves that would leave the book', () => {
    expect(moveSongbookSong(book(['a', 'b', 'c']), 'a', -1)).toEqual(book(['a', 'b', 'c']));
    expect(moveSongbookSong(book(['a', 'b', 'c']), 'c', 1)).toEqual(book(['a', 'b', 'c']));
    expect(moveSongbookSong(book(['a', 'b', 'c']), 'zzz', 1)).toEqual(book(['a', 'b', 'c']));
    expect(moveSongbookSong(book([]), 'a', 1)).toEqual(book([]));
  });
});

describe('songbookPages', () => {
  const songs = [
    song('a', '{title: Alpha}\n[Am]one\n'),
    song('b', '{title: Beta}\n[F]two\n'),
    song('c', '{title: Gamma}\n[C]three\n')
  ];

  it('resolves the picked songs in book order, not library order', () => {
    const pages = songbookPages(book(['c', 'a']), songs);
    expect(pages.map((page) => page.title)).toEqual(['Gamma', 'Alpha']);
  });

  it('skips songs that are no longer in the library', () => {
    const pages = songbookPages(book(['zzz', 'b', 'gone']), songs);
    expect(pages.map((page) => page.id)).toEqual(['b']);
  });

  it('prints each song with its own settings', () => {
    const custom = [song('a', '{title: Alpha}\n', { textPt: 14, columns: 2 })];
    const [page] = songbookPages(book(['a']), custom);
    expect(page.settings.textPt).toBe(14);
    expect(page.settings.columns).toBe(2);
  });

  it('shows the capo of the song and drops it when the transposition cancels it', () => {
    const capoed = [song('a', '{title: Alpha}\n{capo: 3}\n[Am]one\n')];
    expect(songbookPages(book(['a']), capoed)[0].capo).toBe(3);

    const transposed = [song('a', '{title: Alpha}\n{capo: 3}\n[Am]one\n', { transpose: -3 })];
    expect(songbookPages(book(['a']), transposed)[0].capo).toBe(0);
  });
});
