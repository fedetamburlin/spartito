import { expect, test, type Page } from '@playwright/test';
import { openLibrary, openShared } from './helpers';

// Dialogs must be usable without a mouse: focus starts inside, Tab cycles
// within the dialog, Escape closes it and focus returns to the trigger.

async function expectFocusInsideDialog(page: Page): Promise<void> {
  const inside = await page.evaluate(() => {
    const active = document.activeElement;
    return Boolean(active?.closest('[role="dialog"]'));
  });
  expect(inside).toBe(true);
}

test.describe('modal accessibility', () => {
  test('import dialog traps focus and restores it on Escape', async ({ page }) => {
    await openLibrary(page);
    const trigger = page.getByRole('button', { name: 'From text' });
    await trigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('textarea')).toBeFocused();

    for (let index = 0; index < 12; index++) {
      await page.keyboard.press('Tab');
      await expectFocusInsideDialog(page);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('songbook dialog starts on search and restores the trigger', async ({ page }) => {
    await openLibrary(page);
    const trigger = page.getByRole('button', { name: 'Songbook', exact: true });
    await trigger.click();

    const dialog = page.locator('.songbook-modal');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('searchbox', { name: 'Search songs' })).toBeFocused();

    for (let index = 0; index < 15; index++) {
      await page.keyboard.press('Tab');
      await expectFocusInsideDialog(page);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('print guard starts on Cancel and returns focus to Print PDF', async ({ page }) => {
    const source = `{title: Overflow}\n${Array.from(
      { length: 400 },
      (_, index) => `[C]line ${index} with a few words`
    ).join('\n')}`;
    await openShared(page, source);
    await expect(page.locator('.preview')).toHaveAttribute('data-fit-status', 'overflow');

    const trigger = page.getByRole('button', { name: 'Print PDF' });
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();

    // Global transpose shortcuts must not reach the app behind the guard.
    const transpose = page.locator('.stepper-value');
    await expect(transpose).toHaveText('0');
    await page.keyboard.press('+');
    await expect(transpose).toHaveText('0');

    await page.keyboard.press('Tab');
    await expectFocusInsideDialog(page);
    await page.keyboard.press('Shift+Tab');
    await expectFocusInsideDialog(page);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
