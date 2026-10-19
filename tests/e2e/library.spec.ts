import { expect, test } from '@playwright/test';
import { editorContent, openLibrary } from './helpers';

// Library flows use a real IndexedDB in an isolated browser context per test.

test.describe('song library', () => {
  test('creates, renames, duplicates and switches songs', async ({ page }) => {
    await openLibrary(page);
    await expect(page.locator('.song-item')).toHaveCount(1);

    await page.getByTitle('New song').click();
    await expect(page.locator('.song-item')).toHaveCount(2);
    await expect(page.locator('.song-item.active .song-select')).toHaveText('New song');

    const active = page.locator('.song-item.active');
    await active.locator('button[title="Rename"]').click();
    await active.locator('input.song-rename').fill('Test Song');
    await active.locator('input.song-rename').press('Enter');

    await expect(page.locator('.song-item.active .song-select')).toHaveText('Test Song');
    await expect(editorContent(page)).toContainText('{title: Test Song}');

    await page.locator('.song-item.active button[title="Duplicate"]').click();
    await expect(page.locator('.song-item')).toHaveCount(3);
    await expect(page.locator('.song-item.active .song-select')).toHaveText('Test Song (2)');

    await page.locator('.song-select').filter({ hasText: /^Test Song$/ }).click();
    await expect(page.locator('.song-item.active .song-select')).toHaveText('Test Song');
    await expect(editorContent(page)).toContainText('{title: Test Song}');
  });

  test('deletes a song after confirmation', async ({ page }) => {
    await openLibrary(page);
    await page.locator('.sidebar-head button[title="New song"]').click();
    await expect(page.locator('.song-item')).toHaveCount(2);

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.song-item.active button[title="Delete"]').click();

    await expect(page.locator('.song-item')).toHaveCount(1);
    await expect(page.locator('.song-item.active')).toContainText('The Road Back Home');
    await expect(editorContent(page)).toContainText('The Road Back Home');
  });

  test('keeps the active song across a reload', async ({ page }) => {
    await openLibrary(page);
    await page.locator('.sidebar-head button[title="New song"]').click();
    const active = page.locator('.song-item.active');
    await active.locator('button[title="Rename"]').click();
    await active.locator('input.song-rename').fill('Persisted Song');
    await active.locator('input.song-rename').press('Enter');

    await page.reload();

    await expect(page.locator('.song-item.active .song-select')).toHaveText('Persisted Song');
    await expect(editorContent(page)).toContainText('{title: Persisted Song}');
  });
});
