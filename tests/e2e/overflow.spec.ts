import { expect, test, type Page } from '@playwright/test';
import { extractText, getDocumentProxy } from 'unpdf';
import { editorContent, openLibrary, openShared } from './helpers';

// The product promise is one page per song. When even the minimum size
// overflows, printing must be an explicit choice: the PDF would be cut off.

type PrintWindow = Window & { __printed?: boolean; __guardAtPrint?: boolean };

const longSource = (title: string, lines: number, prefix = 'line') =>
  `{title: ${title}}\n${Array.from(
    { length: lines },
    (_, index) => `[C]${prefix} ${index} with a few words`
  ).join('\n')}`;

async function stubPrint(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as PrintWindow;
    target.__printed = false;
    target.__guardAtPrint = undefined;
    window.print = () => {
      target.__printed = true;
      target.__guardAtPrint = Boolean(document.querySelector('.modal-backdrop'));
    };
  });
}

const printed = (page: Page) => page.evaluate(() => Boolean((window as PrintWindow).__printed));
const guardAtPrint = (page: Page) =>
  page.evaluate(() => Boolean((window as PrintWindow).__guardAtPrint));

test.describe('one-page guard', () => {
  test('keeps every line of a long song in the one-page PDF', async ({ page }) => {
    const lines = 90;
    await openShared(page, longSource('Long Print', lines));
    await expect(page.locator('.preview')).toHaveAttribute('data-fit-status', /columns|shrunk/);

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true
    });
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    expect(pdf.numPages).toBe(1);

    const { text } = await extractText(pdf, { mergePages: true });
    const found = new Set([...text.matchAll(/line (\d+)/g)].map((match) => Number(match[1])));
    expect([...found].sort((a, b) => a - b)).toEqual(
      Array.from({ length: lines }, (_, index) => index)
    );
  });

  test('prints a fitting song without asking', async ({ page }) => {
    await openShared(page, '{title: Fitting Song}\n[Am]one short line');
    await expect(page.locator('.preview')).toHaveAttribute('data-fit-status', 'fits');
    await stubPrint(page);

    await page.getByRole('button', { name: 'Print PDF' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => printed(page)).toBe(true);
  });

  test('asks before printing a song that overflows', async ({ page }) => {
    await openShared(page, longSource('Overflow Print', 400, 'riga'));
    await expect(page.locator('.preview')).toHaveAttribute('data-fit-status', 'overflow');
    await expect(page.locator('.preview-meta.warning')).toContainText('printing will cut off');
    await stubPrint(page);

    await page.getByRole('button', { name: 'Print PDF' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading')).toContainText("won't fit on one page");
    await expect(dialog).toContainText('cut off');
    expect(await printed(page)).toBe(false);

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    expect(await printed(page)).toBe(false);

    await page.getByRole('button', { name: 'Print PDF' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Print anyway' }).click();
    await expect.poll(() => printed(page)).toBe(true);
  });

  test('lists overflowing songs before exporting a songbook', async ({ page }) => {
    await openLibrary(page);
    await page.locator('.sidebar-head button[title="New song"]').click();
    const active = page.locator('.song-item.active');
    await active.locator('button[title="Rename"]').click();
    await active.locator('input.song-rename').fill('Long Book Song');
    await active.locator('input.song-rename').press('Enter');

    await editorContent(page).click();
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText(longSource('Long Book Song', 400, 'riga'));
    await expect(page.locator('.preview')).toHaveAttribute('data-fit-status', 'overflow');

    await page.getByRole('button', { name: 'Songbook' }).click();
    const songbook = page.locator('.songbook-modal');
    await songbook.locator('.songbook-pick').filter({ hasText: 'Long Book Song' }).click();
    await stubPrint(page);
    await songbook.getByRole('button', { name: 'Export PDF' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole('heading')).toContainText("won't fit on one page");
    await expect(dialog).toContainText('Long Book Song');
    expect(await printed(page)).toBe(false);

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('.songbook')).toHaveCount(0);
    expect(await printed(page)).toBe(false);

    // Confirming must remove the guard before the print snapshot.
    await page.getByRole('button', { name: 'Songbook' }).click();
    const again = page.locator('.songbook-modal');
    await again.locator('.songbook-pick').filter({ hasText: 'Long Book Song' }).click();
    await again.getByRole('button', { name: 'Export PDF' }).click();

    const confirm = page.getByRole('dialog');
    await expect(confirm).toBeVisible({ timeout: 15_000 });
    await confirm.getByRole('button', { name: 'Print anyway' }).click();
    await expect.poll(() => printed(page)).toBe(true);
    expect(await guardAtPrint(page)).toBe(false);

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true
    });
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    expect(text).not.toContain("won't fit on one page");
    expect(text).toContain('Long Book Song');
  });
});
