import { describe, expect, it } from 'vitest';
import { applySnippet, SNIPPETS, snippetById } from '../src/core/snippets';

describe('snippets', () => {
  it('exposes the menu list', () => {
    expect(SNIPPETS.map((snippet) => snippet.id)).toEqual([
      'verse',
      'chorus',
      'bridge',
      'rit',
      'comment',
      'grid',
      'tab',
      'capo'
    ]);
    expect(snippetById('nope')).toBeUndefined();
  });

  it('wraps the selection in a section and selects it back', () => {
    const source = '[Am]Ciao [F]mondo';
    const snippet = snippetById('chorus');
    if (!snippet) throw new Error('chorus snippet expected');
    const edit = applySnippet(source, 0, source.length, snippet);
    expect(edit.text).toBe('{start_of_chorus}\n[Am]Ciao [F]mondo\n{end_of_chorus}');
    expect(edit.insertText).toBe(edit.text);
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe(source);
  });

  it('places the caret on the content line for an empty selection', () => {
    const snippet = snippetById('verse');
    if (!snippet) throw new Error('verse snippet expected');
    const edit = applySnippet('X', 1, 1, snippet);
    expect(edit.text).toBe('X{start_of_verse}\n\n{end_of_verse}');
    expect(edit.selectionStart).toBe(edit.selectionEnd);
    expect(edit.text[edit.selectionStart]).toBe('\n');
  });

  it('inserts a compact chorus recall with the label selected', () => {
    const snippet = snippetById('rit');
    if (!snippet) throw new Error('rit snippet expected');
    const edit = applySnippet('', 0, 0, snippet);
    expect(edit.insertText).toBe('{chorus: Rit.}');
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('Rit.');
  });

  it('wraps the selection in a comment', () => {
    const snippet = snippetById('comment');
    if (!snippet) throw new Error('comment snippet expected');
    const edit = applySnippet('dal vivo', 0, 8, snippet);
    expect(edit.insertText).toBe('{comment: dal vivo}');
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('dal vivo');
  });

  it('inserts an empty comment with the caret inside', () => {
    const snippet = snippetById('comment');
    if (!snippet) throw new Error('comment snippet expected');
    const edit = applySnippet('', 0, 0, snippet);
    expect(edit.insertText).toBe('{comment: }');
    expect(edit.selectionStart).toBe(edit.selectionEnd);
    expect(edit.text[edit.selectionStart]).toBe('}');
  });

  it('inserts templates for grid, tab and capo', () => {
    const grid = snippetById('grid');
    const tab = snippetById('tab');
    const capo = snippetById('capo');
    if (!grid || !tab || !capo) throw new Error('template snippets expected');

    const gridEdit = applySnippet('src', 0, 3, grid);
    expect(gridEdit.insertText).toContain('{start_of_grid: Intro}');
    expect(gridEdit.insertText).toContain('{end_of_grid}');
    expect(gridEdit.text.slice(gridEdit.selectionStart, gridEdit.selectionEnd)).toBe('Intro');

    const tabEdit = applySnippet('', 0, 0, tab);
    expect(tabEdit.insertText).toContain('{start_of_tab: Solo}');
    expect(tabEdit.text.slice(tabEdit.selectionStart, tabEdit.selectionEnd)).toBe('Solo');

    const capoEdit = applySnippet('', 0, 0, capo);
    expect(capoEdit.insertText).toBe('{capo: 2}');
    expect(capoEdit.text.slice(capoEdit.selectionStart, capoEdit.selectionEnd)).toBe('2');
  });
});
