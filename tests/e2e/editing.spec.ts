import { expect, test } from '@playwright/test';
import {
  editorContent,
  openLibrary,
  openShared,
  previewPage,
  typeInEditor
} from './helpers';

const SONG = `{title: Edit Song}
{start_of_verse}
[Am]Hello [F]world
{end_of_verse}`;

test.describe('editing', () => {
  test('typing reaches the source and the preview', async ({ page }) => {
    await openShared(page, SONG);
    await typeInEditor(page, '\n[Em]typed line');

    await expect(editorContent(page)).toContainText('[Em]typed line');
    await expect(previewPage(page)).toContainText('typed line');
  });

  test('the Insert menu writes a ChordPro snippet', async ({ page }) => {
    await openShared(page, SONG);
    await page.getByRole('button', { name: 'Insert' }).click();
    await page.getByRole('menuitem', { name: 'Verse' }).click();

    await expect(editorContent(page)).toContainText('{start_of_verse}');
    await expect(editorContent(page)).toContainText('{end_of_verse}');
  });

  test('transposition changes the preview but not the source', async ({ page }) => {
    await openShared(page, SONG);
    const before = await editorContent(page).innerText();

    await page.locator('button[title="One semitone up"]').click();

    await expect(page.locator('.stepper-value')).toHaveText('+1');
    await expect(previewPage(page)).toContainText('A#m');
    expect(await editorContent(page).innerText()).toBe(before);
    await expect(editorContent(page)).toContainText('[Am]Hello');
  });

  test('a plus sign typed in the editor does not transpose', async ({ page }) => {
    await openShared(page, SONG);
    await typeInEditor(page, ' +');

    await expect(editorContent(page)).toContainText('+');
    await expect(page.locator('.stepper-value')).toHaveText('0');
  });

  test('undo does not cross a song switch', async ({ page }) => {
    await openLibrary(page);
    await page.locator('.sidebar-head button[title="New song"]').click();
    await typeInEditor(page, ' CONTENT TO FORGET');
    await expect(editorContent(page)).toContainText('CONTENT TO FORGET');

    await page.locator('.sidebar-head button[title="New song"]').click();
    await editorContent(page).click();
    await page.keyboard.press('Control+z');

    await expect(editorContent(page)).not.toContainText('CONTENT TO FORGET');
  });

  test('long songs switch to two columns', async ({ page }) => {
    const lines = Array.from({ length: 90 }, (_, index) => `[Am]line ${index} with a few words`);
    await openShared(page, `{title: Long Song}\n${lines.join('\n')}`);

    await expect(page.locator('.preview-meta .badge').first()).toContainText('2 columns');
  });
});
