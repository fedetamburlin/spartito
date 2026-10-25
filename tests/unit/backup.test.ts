import { describe, expect, it } from 'vitest';
import {
  buildLibraryBackup,
  LIBRARY_BACKUP_VERSION,
  parseLibraryBackup,
  serializeLibraryBackup
} from '../../src/core/backup';
import type { SongEntry } from '../../src/core/db';
import { defaultSettings, sanitizeSettings } from '../../src/core/settings';

function song(id: string, title: string, createdAt: number): SongEntry {
  return {
    id,
    source: `{title: ${title}}\n[Am]line\n`,
    settings: defaultSettings(),
    createdAt,
    updatedAt: createdAt
  };
}

describe('library backup format', () => {
  it('roundtrips songs, settings, order and active id', () => {
    const songs = [song('b', 'Beta', 200), song('a', 'Alpha', 100)];
    const backup = buildLibraryBackup(songs, 'a', new Date('2026-10-25T12:00:00Z'));
    const parsed = parseLibraryBackup(serializeLibraryBackup(backup));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.schemaVersion).toBe(LIBRARY_BACKUP_VERSION);
    expect(parsed.backup.exportedAt).toBe('2026-10-25T12:00:00.000Z');
    expect(parsed.backup.songs.map((item) => item.id)).toEqual(['b', 'a']);
    expect(parsed.backup.activeId).toBe('a');
    expect(parsed.backup.songs[0].settings).toEqual(defaultSettings());
  });

  it('falls back to the newest song when the active id is missing', () => {
    const backup = buildLibraryBackup([song('a', 'A', 1), song('b', 'B', 2)], 'missing');
    expect(backup.activeId).toBe('b');
  });

  it('rejects a single-song export with a pointer to the toolbar import', () => {
    const parsed = parseLibraryBackup(
      JSON.stringify({ app: 'spartito-app', schemaVersion: 1, source: '{title: X}\n' })
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.code).toBe('single-song');
    expect(parsed.message).toContain('toolbar');
  });

  it('rejects invalid JSON', () => {
    const parsed = parseLibraryBackup('not json');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe('invalid-json');
  });

  it('rejects an empty song list', () => {
    const parsed = parseLibraryBackup(
      JSON.stringify({
        app: 'spartito-app',
        kind: 'library',
        schemaVersion: 1,
        songs: []
      })
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe('empty');
  });

  it('rejects a backup from a newer schema', () => {
    const parsed = parseLibraryBackup(
      JSON.stringify({
        app: 'spartito-app',
        kind: 'library',
        schemaVersion: LIBRARY_BACKUP_VERSION + 1,
        songs: [{ id: 'a', source: 'x' }]
      })
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe('newer-version');
  });

  it('rejects duplicate ids and reports the damaged entry', () => {
    const parsed = parseLibraryBackup(
      JSON.stringify({
        app: 'spartito-app',
        kind: 'library',
        schemaVersion: 1,
        songs: [
          { id: 'a', source: 'one' },
          { id: 'a', source: 'two' }
        ]
      })
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.code).toBe('damaged');
      expect(parsed.message).toContain('twice');
    }
  });

  it('sanitizes settings and backfills missing timestamps', () => {
    const parsed = parseLibraryBackup(
      JSON.stringify({
        app: 'spartito-app',
        kind: 'library',
        schemaVersion: 1,
        activeId: 'a',
        songs: [
          {
            id: 'a',
            source: '{title: A}\n',
            settings: { textPt: 999, fontId: 'missing', columns: 3 }
          }
        ]
      })
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.songs[0].settings).toEqual(
      sanitizeSettings({ textPt: 999, fontId: 'missing', columns: 3 as unknown as 1 })
    );
    expect(parsed.backup.songs[0].createdAt).toBe(0);
    expect(parsed.backup.songs[0].updatedAt).toBe(0);
  });
});
