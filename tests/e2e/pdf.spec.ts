import { expect, test } from '@playwright/test';
import { getDocumentProxy, extractText } from 'unpdf';
import { openShared } from './helpers';

// The exported PDF is the actual product: one A4 page, selectable text,
// and none of the editor source.

const SONG = `{title: Print Me}
{subtitle: The Band}
{capo: 2}
{start_of_verse}
[Am]Hello [F]world
{end_of_verse}
{chorus}`;

test.describe('PDF export', () => {
  test('prints one A4 page with text and without editor source', async ({ page }) => {
    await openShared(page, SONG);
    await expect(page.locator('.preview-meta .badge').first()).toBeVisible();

    const buffer = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    const pdf = await getDocumentProxy(new Uint8Array(buffer));

    expect(pdf.numPages).toBe(1);

    const firstPage = await pdf.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1 });
    expect(viewport.width).toBeCloseTo(595, 0);
    expect(viewport.height).toBeCloseTo(842, 0);

    const { text } = await extractText(pdf, { mergePages: true });
    expect(text).toContain('Print Me');
    expect(text).toContain('The Band');
    expect(text).toContain('Capo 2');
    expect(text).not.toContain('start_of_');
    expect(text).not.toContain('{title');
  });
});
