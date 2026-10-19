import { expect, test } from '@playwright/test';

// Storage can hang forever in privacy modes or embedded webviews. The app
// must still boot in demo mode and tell the user that saving is disabled.

test.describe('library fallback', () => {
  test('boots in demo mode when IndexedDB never answers', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        value: { open: () => ({}) }
      });
    });

    await page.goto('/');

    const notice = page.locator('.app-notice');
    await expect(notice).toBeVisible({ timeout: 10_000 });
    await expect(notice).toContainText("songs won't be saved");
    await expect(page.locator('.cm-editor')).toBeVisible();
    await expect(page.locator('.page')).toContainText('The Road Back Home');
  });
});
