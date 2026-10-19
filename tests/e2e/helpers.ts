import { expect, type Page } from '@playwright/test';

/**
 * Shared helpers for the E2E smoke suite. Shared documents use the
 * deeplink path (ephemeral, no IndexedDB) so editor tests never depend
 * on the library.
 */

export function shareLink(source: string): string {
  const payload = Buffer.from(JSON.stringify({ source }), 'utf8').toString('base64url');
  return `/#doc=${payload}`;
}

export async function openShared(page: Page, source: string): Promise<void> {
  await page.goto(shareLink(source));
  await expect(page.locator('.cm-editor')).toBeVisible();
  await expect(page.locator('.page')).toBeVisible();
}

export const editorContent = (page: Page) => page.locator('.cm-content');
export const previewPage = (page: Page) => page.locator('.page');

/** Put the caret at the end of the document, then insert literal text. */
export async function typeInEditor(page: Page, text: string): Promise<void> {
  await editorContent(page).click();
  await page.keyboard.press('Control+End');
  await page.keyboard.insertText(text);
}

/** Collect page errors and console errors for a "boots cleanly" assertion. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

export async function openLibrary(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.cm-editor')).toBeVisible();
}
