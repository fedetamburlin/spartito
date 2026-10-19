import { expect, test } from '@playwright/test';
import { collectErrors, editorContent, openShared, previewPage } from './helpers';

// Boot, rendering and theme: the app must come up cleanly from a share link.

const SONG = `{title: Smoke Song}
{subtitle: Test Artist}
{capo: 2}
{start_of_verse}
[Am]Hello [F]world
{end_of_verse}
{chorus}`;

const SHORT = `{title: Small Song}
[Am]one short line`;

test.describe('boot', () => {
  test('loads a shared song with editor and preview', async ({ page }) => {
    const errors = collectErrors(page);
    await openShared(page, SONG);

    await expect(editorContent(page)).toContainText('Smoke Song');
    await expect(previewPage(page)).toContainText('Smoke Song');
    await expect(previewPage(page)).toContainText('Test Artist');
    await expect(previewPage(page)).toContainText('Capo 2');
    expect(errors).toEqual([]);
  });

  test('grows the font for a short song', async ({ page }) => {
    await openShared(page, SHORT);

    const badge = page.locator('.preview-meta .badge').first();
    await expect(badge).toContainText('(grown)');
    await expect(badge).toContainText('14pt');
  });

  test('theme toggle persists across a reload', async ({ page }) => {
    await openShared(page, SONG);
    const toggle = page.getByRole('button', { name: /Switch to .* theme/ });
    const before = await page.locator('html').getAttribute('data-theme');

    await toggle.click();
    const after = await page.locator('html').getAttribute('data-theme');
    expect(after).not.toBe(before);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', after ?? '');
  });
});
