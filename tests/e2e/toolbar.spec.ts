import { expect, test } from '@playwright/test';
import { openLibrary } from './helpers';

// Print PDF is the primary action; the songbook export shares its colour.

test('songbook uses the same primary colour as Print PDF', async ({ page }) => {
  await openLibrary(page);

  const styleOf = (name: string) =>
    page.getByRole('button', { name }).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        border: style.borderColor,
        color: style.color
      };
    });

  expect(await styleOf('Songbook')).toEqual(await styleOf('Print PDF'));
});
