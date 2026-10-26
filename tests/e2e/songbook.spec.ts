import { expect, test, type Page } from '@playwright/test';
import { extractText, getDocumentProxy } from 'unpdf';
import { openLibrary } from './helpers';

// A songbook is the library made printable: the picked songs, one sheet each,
// in the order set in the dialog, with an optional cover listing them.

type PrintWindow = Window & { __printed?: boolean };

/** Replace the blocking print dialog with a flag the test can observe. */
async function stubPrint(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as PrintWindow;
    target.__printed = false;
    window.print = () => {
      target.__printed = true;
    };
  });
}

async function waitForPrint(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => Boolean((window as PrintWindow).__printed)), {
      timeout: 10_000
    })
    .toBe(true);
}

test.describe('songbook export', () => {
  test('prints the picked songs in the chosen order', async ({ page }) => {
    await openLibrary(page);

    for (const title of ['Alpha Song', 'Beta Song']) {
      await page.locator('.sidebar-head button[title="New song"]').click();
      const active = page.locator('.song-item.active');
      await active.locator('button[title="Rename"]').click();
      await active.locator('input.song-rename').fill(title);
      await active.locator('input.song-rename').press('Enter');
      await expect(active.locator('.song-select')).toHaveText(title);
    }

    await page.getByRole('button', { name: 'Songbook' }).click();
    const dialog = page.locator('.songbook-modal');
    await expect(dialog).toBeVisible();

    for (const title of ['Alpha Song', 'Beta Song', 'The Road Back Home']) {
      await dialog.locator('.songbook-pick').filter({ hasText: title }).click();
    }
    const order = dialog.locator('.songbook-order .songbook-title');
    await expect(order).toHaveText(['Alpha Song', 'Beta Song', 'The Road Back Home']);

    // Move the demo song to the top of the book.
    const moveUp = dialog.getByRole('button', { name: 'Move The Road Back Home up' });
    await moveUp.click();
    await moveUp.click();
    await expect(order).toHaveText(['The Road Back Home', 'Alpha Song', 'Beta Song']);

    await stubPrint(page);
    await dialog.getByRole('button', { name: 'Export PDF' }).click();
    await waitForPrint(page);

    // Cover + one sheet per song.
    await expect(page.locator('.songbook .page')).toHaveCount(4);

    // Cover titles stack vertically, one per line.
    const coverItems = page.locator('.songbook-cover li');
    await expect(coverItems).toHaveCount(3);
    const coverBoxes = await coverItems.evaluateAll((items) =>
      items.map((item) => {
        const box = item.getBoundingClientRect();
        return { x: box.x, y: box.y };
      })
    );
    for (const box of coverBoxes) {
      expect(Math.abs(box.x - coverBoxes[0].x)).toBeLessThan(1);
    }
    for (let index = 1; index < coverBoxes.length; index++) {
      expect(coverBoxes[index].y).toBeGreaterThan(coverBoxes[index - 1].y);
    }

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true
    });
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    expect(pdf.numPages).toBe(4);

    const { text: sheets } = await extractText(pdf);
    expect(sheets[0]).toContain('Songbook');
    expect(sheets[1]).toContain('The Road Back Home');
    expect(sheets[2]).toContain('Alpha Song');
    expect(sheets[3]).toContain('Beta Song');
    for (const sheet of sheets) expect(sheet).not.toContain('{title');
  });

  test('exports only the songs picked', async ({ page }) => {
    await openLibrary(page);
    await page.getByRole('button', { name: 'Songbook' }).click();

    const dialog = page.locator('.songbook-modal');
    await dialog.locator('.songbook-pick').filter({ hasText: 'The Road Back Home' }).click();
    await dialog.locator('input[type="checkbox"]').uncheck();
    await expect(dialog.locator('.songbook-order .songbook-title')).toHaveCount(1);

    await stubPrint(page);
    await dialog.getByRole('button', { name: 'Export PDF' }).click();
    await waitForPrint(page);
    await expect(page.locator('.songbook .page')).toHaveCount(1);

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true
    });
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    expect(pdf.numPages).toBe(1);

    const { text: sheets } = await extractText(pdf);
    expect(sheets[0]).toContain('The Road Back Home');
  });

  test('warns when the songbook cover cannot fit its titles', async ({ page }) => {
    await openLibrary(page);

    // A real library with many long titles: the cover is one fixed A4 page.
    await page.evaluate(async (count) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('spartito');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const existing = await new Promise<Array<{ settings: unknown }>>((resolve, reject) => {
        const request = db.transaction('songs', 'readonly').objectStore('songs').getAll();
        request.onsuccess = () => resolve(request.result as Array<{ settings: unknown }>);
        request.onerror = () => reject(request.error);
      });
      const settings = existing[0]?.settings ?? {};
      const now = Date.now();
      const transaction = db.transaction('songs', 'readwrite');
      const store = transaction.objectStore('songs');
      for (let index = 0; index < count; index++) {
        store.put({
          id: `cover-${index}`,
          source: `{title: A very long songbook cover title number ${index} that wraps over several lines because it keeps going and going and going without any reason at all, just to test the cover guard properly}\n[Am]one short line`,
          settings,
          createdAt: now + index,
          updatedAt: now + index
        });
      }
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    }, 40);
    await page.reload();
    await expect(page.locator('.cm-editor')).toBeVisible();

    await page.getByRole('button', { name: 'Songbook', exact: true }).click();
    const dialog = page.locator('.songbook-modal');
    await dialog
      .locator('.songbook-pick')
      .evaluateAll((buttons) =>
        (buttons as HTMLButtonElement[]).forEach((button) => button.click())
      );
    await expect(dialog.locator('.songbook-order .songbook-title')).toHaveCount(41);

    await stubPrint(page);
    await dialog.getByRole('button', { name: 'Export PDF' }).click();

    const guard = page.getByRole('dialog');
    await expect(guard).toBeVisible({ timeout: 15_000 });
    await expect(guard.getByRole('heading')).toContainText("won't fit on one page");
    await expect(guard.locator('.summary li')).toHaveText(['Cover page (too many titles)']);
    expect(await page.evaluate(() => Boolean((window as PrintWindow).__printed))).toBe(false);

    await guard.getByRole('button', { name: 'Cancel' }).click();
    await expect(guard).toBeHidden();
    await expect(page.locator('.songbook')).toHaveCount(0);
  });
});
