import { expect, test } from '@playwright/test';
import { collectErrors, editorContent, openLibrary, openShared, previewPage } from './helpers';

// CI runs this file on Firefox and WebKit as a smoke test; Chromium also
// runs the full suite. Keep it free of print assertions: page.pdf() is
// Chromium-only.

const SONG = `{title: Cross Browser}
{start_of_verse}
[Am]Hello [F]world
{end_of_verse}`;

test.describe('cross-browser smoke', () => {
  test('boots cleanly', async ({ page }) => {
    const errors = collectErrors(page);
    await openLibrary(page);

    await expect(page.locator('.song-item.active .song-select')).toHaveText('The Road Back Home');
    await expect(previewPage(page)).toContainText('The Road Back Home');
    expect(errors).toEqual([]);
  });

  test('edits and transposes', async ({ page }) => {
    await openShared(page, SONG);

    await editorContent(page).click();
    await page.keyboard.press('Control+End');
    await page.keyboard.insertText('\n[Em]typed line');
    await expect(previewPage(page)).toContainText('typed line');

    const before = await editorContent(page).innerText();
    await page.locator('button[title="One semitone up"]').click();
    await expect(page.locator('.stepper-value')).toHaveText('+1');
    await expect(previewPage(page)).toContainText('A#m');
    expect(await editorContent(page).innerText()).toBe(before);
  });

  test('keeps the theme after reload', async ({ page }) => {
    await openShared(page, SONG);

    const toggle = page.getByRole('button', { name: /Switch to .* theme/ });
    const before = await page.locator('html').getAttribute('data-theme');
    await toggle.click();
    const after = await page.locator('html').getAttribute('data-theme');
    expect(after).not.toBe(before);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', after ?? '');
  });

  test('imports pasted Ultimate Guitar text', async ({ page }) => {
    await openLibrary(page);
    await page.getByRole('button', { name: 'From text' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.locator('textarea').fill(`Cross Browser Chords
Test Band

Capo: 2

[Verse 1]
[ch]Am[/ch]Walking home`);
    await dialog.getByRole('button', { name: 'Convert' }).click();
    await expect(dialog.locator('.preview')).toContainText('{capo: 2}');
    await dialog.getByRole('button', { name: 'Replace in editor' }).click();

    await expect(page.locator('.song-item.active .song-select')).toHaveText('Cross Browser');
    await expect(editorContent(page)).toContainText('[Am]Walking');
  });

  test.describe('tablet viewport', () => {
    test.use({ viewport: { width: 1024, height: 768 } });

    test('keeps editor and preview visible without horizontal overflow', async ({ page }) => {
      await openLibrary(page);

      await expect(editorContent(page)).toBeVisible();
      await expect(previewPage(page)).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(overflow).toBe(false);
    });
  });
});
