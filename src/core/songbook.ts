import { parseChordPro } from './chordpro';
import type { SongEntry } from './db';
import { songTitle } from './library';
import type { SongDocument } from './model';
import { sanitizeSettings, type SongSettings } from './settings';
import { transposedForDisplay } from './transpose';

/**
 * Songbook export: an ordered pick of library songs printed as one PDF.
 *
 * The draft is ephemeral dialog state. Its core is the ordered id list, which
 * is also the shape a saved setlist would persist, so nothing here knows about
 * the UI or the print pipeline.
 */

export interface SongbookDraft {
  ids: string[];
  cover: boolean;
}

/** One resolved sheet of the book, ready to be measured and printed. */
export interface SongbookPage {
  id: string;
  title: string;
  doc: SongDocument;
  settings: SongSettings;
  capo: number;
}

export function emptySongbook(): SongbookDraft {
  return { ids: [], cover: true };
}

export function removeSongbookSong(draft: SongbookDraft, id: string): SongbookDraft {
  return { ...draft, ids: draft.ids.filter((item) => item !== id) };
}

/** Adds a song at the end of the book, or drops it when already there. */
export function toggleSongbookSong(draft: SongbookDraft, id: string): SongbookDraft {
  return draft.ids.includes(id)
    ? removeSongbookSong(draft, id)
    : { ...draft, ids: [...draft.ids, id] };
}

/** Moves a song one step up (-1) or down (+1); out-of-range moves are no-ops. */
export function moveSongbookSong(draft: SongbookDraft, id: string, delta: -1 | 1): SongbookDraft {
  const from = draft.ids.indexOf(id);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= draft.ids.length) return draft;
  const ids = [...draft.ids];
  ids.splice(from, 1);
  ids.splice(to, 0, id);
  return { ...draft, ids };
}

/** Resolves the draft against the library into printable sheets, in order. */
export function songbookPages(draft: SongbookDraft, songs: SongEntry[]): SongbookPage[] {
  const byId = new Map(songs.map((song) => [song.id, song]));
  const pages: SongbookPage[] = [];
  for (const id of draft.ids) {
    const song = byId.get(id);
    if (!song) continue;
    const settings = sanitizeSettings(song.settings);
    const { doc, capo } = transposedForDisplay(parseChordPro(song.source), settings.transpose);
    pages.push({ id: song.id, title: songTitle(song.source), doc, settings, capo });
  }
  return pages;
}
