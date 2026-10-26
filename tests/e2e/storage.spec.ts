import { expect, test } from '@playwright/test';
import { openLibrary } from './helpers';

test('checks storage on load and asks only after the first write', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { __persistCalls?: number };
    state.__persistCalls = 0;
    Object.defineProperty(navigator.storage, 'persisted', {
      value: async () => false
    });
    Object.defineProperty(navigator.storage, 'persist', {
      value: async () => {
        state.__persistCalls = (state.__persistCalls ?? 0) + 1;
        return false;
      }
    });
  });

  await openLibrary(page);
  const note = page.locator('.storage-note');
  await expect(note).toHaveClass(/warning/);
  await expect(note).toContainText('best effort');
  expect(
    await page.evaluate(() => (window as unknown as { __persistCalls?: number }).__persistCalls)
  ).toBe(0);

  await page.locator('.sidebar-head button[title="New song"]').click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __persistCalls?: number }).__persistCalls)
    )
    .toBe(1);

  await page.locator('.sidebar-head button[title="New song"]').click();
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => (window as unknown as { __persistCalls?: number }).__persistCalls)
  ).toBe(1);
});
