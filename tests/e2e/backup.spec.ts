import { readFile } from 'node:fs/promises';
import { expect, test, type Download, type Page } from '@playwright/test';
import { openLibrary } from './helpers';

// The library only lives in the browser: a full backup must roundtrip every
// song, its settings and the active selection, with an explicit merge/replace
// choice on restore.

async function addSong(page: Page, title: string): Promise<void> {
  await page.locator('.sidebar-head button[title="New song"]').click();
  const active = page.locator('.song-item.active');
  await active.locator('button[title="Rename"]').click();
  await active.locator('input.song-rename').fill(title);
  await active.locator('input.song-rename').press('Enter');
  await expect(active.locator('.song-select')).toHaveText(title);
}

async function exportBackup(page: Page): Promise<{ download: Download; json: string }> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Backup', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^spartito-library-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  expect(path).not.toBeNull();
  return { download, json: await readFile(path as string, 'utf8') };
}

async function restore(page: Page, json: string, mode: 'Merge' | 'Replace library'): Promise<void> {
  await page.locator('.library-restore-input').setInputFiles({
    name: 'spartito-library.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json, 'utf8')
  });

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toHaveText('Restore library');
  await dialog.getByRole('button', { name: mode }).click();
  await expect(dialog).toBeHidden();
}

test.describe('library backup', () => {
  test('exports every song and the active selection', async ({ page }) => {
    await openLibrary(page);
    await addSong(page, 'Backup Song');
    await expect(page.locator('.song-item')).toHaveCount(2);

    const { json } = await exportBackup(page);
    const backup = JSON.parse(json) as {
      app: string;
      kind: string;
      schemaVersion: number;
      activeId: string;
      songs: Array<{ id: string; source: string; settings: Record<string, unknown> }>;
    };

    expect(backup.app).toBe('spartito-app');
    expect(backup.kind).toBe('library');
    expect(backup.schemaVersion).toBe(1);
    expect(backup.songs).toHaveLength(2);
    expect(backup.songs.some((song) => song.source.includes('Backup Song'))).toBe(true);
    expect(backup.songs.every((song) => typeof song.settings.textPt === 'number')).toBe(true);
    expect(backup.activeId).toBe(
      backup.songs.find((song) => song.source.includes('Backup Song'))?.id
    );
  });

  test('merges missing songs and keeps the current library', async ({ page }) => {
    await openLibrary(page);
    await addSong(page, 'Keep Me');
    const { json } = await exportBackup(page);

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.song-item.active button[title="Delete"]').click();
    await expect(page.locator('.song-item')).toHaveCount(1);

    await restore(page, json, 'Merge');
    await expect(page.locator('.song-item')).toHaveCount(2);
    await expect(page.locator('.song-item', { hasText: 'Keep Me' })).toHaveCount(1);
    await expect(page.locator('.song-item', { hasText: 'The Road Back Home' })).toHaveCount(1);
    await expect(page.getByRole('status')).toContainText('1 added');
  });

  test('replace swaps the whole library', async ({ page }) => {
    await openLibrary(page);
    await addSong(page, 'Keep Me');
    const { json } = await exportBackup(page);

    await addSong(page, 'Temporary');
    await expect(page.locator('.song-item')).toHaveCount(3);

    await restore(page, json, 'Replace library');
    await expect(page.locator('.song-item')).toHaveCount(2);
    await expect(page.locator('.song-item', { hasText: 'Keep Me' })).toHaveCount(1);
    await expect(page.locator('.song-item', { hasText: 'The Road Back Home' })).toHaveCount(1);
    await expect(page.locator('.song-item', { hasText: 'Temporary' })).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Library replaced: 2 songs');
  });

  test('rejects a single-song file with a clear message', async ({ page }) => {
    await openLibrary(page);
    const dialogPromise = page.waitForEvent('dialog');
    await page.locator('.library-restore-input').setInputFiles({
      name: 'song.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"source":"{title: X}\\n","settings":{}}', 'utf8')
    });
    const alert = await dialogPromise;
    expect(alert.message()).toContain('single-song file');
    await alert.dismiss();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
