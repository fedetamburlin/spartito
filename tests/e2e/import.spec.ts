import { expect, test } from '@playwright/test';
import { editorContent, openLibrary } from './helpers';

const PASTED = `My Fake Song Chords
The Fake Band

Capo: 2

[Verse 1]
[ch]Am[/ch]Walking down the empty road
[ch]F[/ch]With a guitar on my back

[Chorus]
[ch]C[/ch]Sing it loud [ch]G[/ch]sing it clear`;

test.describe('import from text', () => {
  test('converts a pasted Ultimate Guitar page into a new song', async ({ page }) => {
    await openLibrary(page);
    await page.getByRole('button', { name: 'From text' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('textarea').fill(PASTED);
    await dialog.getByRole('button', { name: 'Convert' }).click();

    await expect(dialog.locator('.preview')).toContainText('{capo: 2}');
    await expect(dialog.locator('.preview')).toContainText('{start_of_verse: Verse 1}');
    await dialog.getByRole('button', { name: 'Replace in editor' }).click();

    await expect(editorContent(page)).toContainText('{capo: 2}');
    await expect(editorContent(page)).toContainText('{start_of_verse: Verse 1}');
    await expect(editorContent(page)).toContainText('[Am]Walking');
    await expect(editorContent(page)).not.toContainText('[ch]');
    await expect(page.locator('.song-item.active .song-select')).toHaveText('My Fake Song');
  });

  test('imports a PDF with a text layer', async ({ page }) => {
    await openLibrary(page);
    await page
      .locator('.song-import-input')
      .setInputFiles('tests/fixtures/generated/generated-single-column.pdf');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading')).toContainText('Import PDF');
    await dialog.getByRole('button', { name: 'Convert' }).click();
    await expect(dialog.locator('.preview')).toContainText('{title: Generated Song}');
    await dialog.getByRole('button', { name: 'Replace in editor' }).click();

    await expect(editorContent(page)).toContainText('{title: Generated Song}');
    await expect(editorContent(page)).toContainText('{capo: 2}');
    await expect(editorContent(page)).toContainText('[Am]Walking');
    await expect(page.locator('.song-item.active .song-select')).toHaveText('Generated Song');
  });

  test('rejects an unreadable PDF with an alert', async ({ page }) => {
    await openLibrary(page);
    const dialogPromise = page.waitForEvent('dialog');
    await page.locator('.song-import-input').setInputFiles({
      name: 'broken.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('this is not a pdf')
    });
    const alert = await dialogPromise;
    expect(alert.message()).toContain('PDF not readable');
    await alert.dismiss();
  });
});
