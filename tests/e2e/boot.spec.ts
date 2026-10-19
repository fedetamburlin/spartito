import { expect, test, type Page } from '@playwright/test';
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

const LONG = `{title: Long Song}

${Array.from({ length: 100 }, (_, index) => `[C]line ${index} with a few words to wrap`).join(
  '\n'
)}`;

const textPtOf = (page: Page) =>
  page
    .locator('.page')
    .evaluate((el) => (el as HTMLElement).style.getPropertyValue('--text-pt').trim());

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

  test('uses the text size chosen in the toolbar', async ({ page }) => {
    await openShared(page, SHORT);
    const input = page.getByRole('spinbutton', { name: 'Text pt' });

    await input.fill('13');
    await input.blur();
    await expect.poll(() => textPtOf(page)).toBe('13pt');

    await input.fill('9');
    await input.blur();
    await expect.poll(() => textPtOf(page)).toBe('9pt');
  });

  test('stops the text size at the largest one that fits', async ({ page }) => {
    await openShared(page, LONG);
    const input = page.getByRole('spinbutton', { name: 'Text pt' });

    await input.fill('14');
    await input.blur();

    await expect.poll(async () => Number(await input.getAttribute('max'))).toBeLessThan(14);
    const max = Number(await input.getAttribute('max'));
    await expect.poll(async () => Number(await input.inputValue())).toBe(max);
    await expect.poll(() => textPtOf(page)).toBe(`${max}pt`);
    await expect(page.locator('.preview-meta.warning')).toHaveCount(0);
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
