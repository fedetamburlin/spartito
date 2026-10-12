import { describe, expect, it } from 'vitest';
import {
  applySnippet,
  DIRECTIVE_GROUPS,
  DIRECTIVES,
  directiveById,
  REFERENCE,
  rowsForGroup,
  type Directive
} from '../src/core/directives';
import { parseChordPro, serializeChordPro, unknownDirectives } from '../src/core/chordpro';
import type { Section, SectionItem, SongDocument } from '../src/core/model';

function items(doc: SongDocument): SectionItem[] {
  const out: SectionItem[] = [];
  for (const block of doc.blocks) {
    if (block.kind === 'section') out.push(...block.items);
  }
  return out;
}

function explicitSection(doc: SongDocument): Section {
  const section = doc.blocks.find(
    (block): block is Section => block.kind === 'section' && block.explicit
  );
  if (!section) throw new Error('explicit section expected');
  return section;
}

/** What every menu entry must produce when its example is parsed. */
const expected: Record<string, (doc: SongDocument) => void> = {
  title: (doc) => expect(doc.title).toBe('My song'),
  subtitle: (doc) => expect(doc.subtitle).toBe('Niccolò Fabi'),
  capo: (doc) => expect(doc.capo).toBe(2),
  comment: (doc) => expect(items(doc)[0]).toEqual({ kind: 'comment', text: 'dal vivo' }),
  verse: (doc) => {
    expect(explicitSection(doc).type).toBe('verse');
    expect(explicitSection(doc).items.some((item) => item.kind === 'line')).toBe(true);
  },
  chorus: (doc) => expect(explicitSection(doc).type).toBe('chorus'),
  bridge: (doc) => expect(explicitSection(doc).type).toBe('bridge'),
  rit: (doc) => expect(items(doc)[0]).toEqual({ kind: 'chorus-recall', label: 'Rit.' }),
  tab: (doc) => {
    const item = items(doc)[0];
    expect(item.kind).toBe('tab');
    if (item.kind === 'tab') expect(item.label).toBe('Solo');
  },
  grid: (doc) => {
    const item = items(doc)[0];
    expect(item.kind).toBe('grid-block');
    if (item.kind === 'grid-block') expect(item.label).toBe('Intro');
  }
};

/** What every inline syntax example must produce. */
const referenceExpected: Record<string, (doc: SongDocument) => void> = {
  inline: (doc) => {
    const item = items(doc)[0];
    expect(item.kind).toBe('line');
    if (item.kind === 'line') {
      expect(item.words).toEqual([
        { text: 'Hello', chords: ['Am'] },
        { text: 'world', chords: ['C'] }
      ]);
    }
  },
  multi: (doc) => {
    const item = items(doc)[0];
    expect(item.kind).toBe('line');
    if (item.kind === 'line') expect(item.words).toEqual([{ text: 'word', chords: ['C', 'G'] }]);
  },
  italian: (doc) => expect(items(doc)[0]).toEqual({ kind: 'grid', chords: ['Do', 'Lam', 'Sol'] }),
  chordline: (doc) => expect(items(doc)[0]).toEqual({ kind: 'grid', chords: ['C', 'G', 'Am'] })
};

const REMOVED_ALIASES = [
  'soc',
  'eoc',
  'sov',
  'eov',
  'sob',
  'eob',
  'sot',
  'eot',
  'sog',
  'eog',
  't',
  'st',
  'artist',
  'c',
  'refrain'
];

describe('directives registry', () => {
  it('lists the insert menu in semantic groups', () => {
    expect(DIRECTIVES.map((directive) => directive.id)).toEqual([
      'title',
      'subtitle',
      'capo',
      'comment',
      'verse',
      'chorus',
      'bridge',
      'rit',
      'tab',
      'grid'
    ]);
    for (const group of DIRECTIVE_GROUPS) {
      expect(rowsForGroup(group).length).toBeGreaterThan(0);
      expect(group.label.length).toBeGreaterThan(0);
    }
    expect(DIRECTIVE_GROUPS.filter((group) => group.menu).map((group) => group.id)).toEqual([
      'song',
      'sections',
      'blocks'
    ]);
    for (const group of DIRECTIVE_GROUPS.filter((entry) => !entry.menu)) {
      expect(DIRECTIVES.filter((directive) => directive.group === group.id)).toEqual([]);
    }
    expect(new Set(DIRECTIVES.map((directive) => directive.id)).size).toBe(DIRECTIVES.length);
    for (const directive of DIRECTIVES) {
      expect(directive.label.length).toBeGreaterThan(0);
      expect(directive.syntax.length).toBeGreaterThan(0);
      expect(directive.description.length).toBeGreaterThan(0);
    }
    expect(directiveById('nope')).toBeUndefined();
  });

  it('shows every directive and reference exactly once in the help', () => {
    const rows = DIRECTIVE_GROUPS.flatMap((group) => rowsForGroup(group));
    const ids = rows.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      ...DIRECTIVES.map((directive) => directive.id),
      ...REFERENCE.map((entry) => entry.id)
    ]);
    for (const row of rows) {
      expect(row.syntax.length).toBeGreaterThan(0);
      expect(row.description.length).toBeGreaterThan(0);
    }
  });

  for (const directive of DIRECTIVES) {
    it(`parses its documented example: ${directive.id}`, () => {
      const doc = parseChordPro(directive.example);
      expect(unknownDirectives(doc)).toEqual([]);
      expected[directive.id](doc);
      const roundtripped = parseChordPro(serializeChordPro(doc));
      expect(roundtripped).toEqual(doc);
      expect(serializeChordPro(roundtripped)).toBe(serializeChordPro(doc));
    });

    it(`inserts parsable source: ${directive.id}`, () => {
      for (const selection of ['', 'Prova [Am]testo']) {
        const { text } = directive.build(selection);
        const doc = parseChordPro(text);
        expect(unknownDirectives(doc)).toEqual([]);
        expect(parseChordPro(serializeChordPro(doc))).toEqual(doc);
      }
    });
  }

  it('every syntax token shown in the help works', () => {
    const tokens = [
      ...DIRECTIVES.flatMap((directive) => directive.syntax),
      ...REFERENCE.map((entry) => entry.syntax)
    ];
    for (const token of tokens) {
      if (!token.startsWith('{')) continue;
      const doc = parseChordPro(token);
      expect(unknownDirectives(doc)).toEqual([]);
    }
  });

  for (const entry of REFERENCE) {
    it(`parses its inline reference example: ${entry.id}`, () => {
      const doc = parseChordPro(entry.example);
      expect(unknownDirectives(doc)).toEqual([]);
      referenceExpected[entry.id](doc);
    });
  }

  it('keeps only the canonical names plus the chorus/rit recall', () => {
    for (const alias of REMOVED_ALIASES) {
      const doc = parseChordPro(`{${alias}: X}`);
      expect(unknownDirectives(doc)).toEqual([`{${alias}: X}`]);
    }
    const recall = parseChordPro('{chorus}\n{rit}\n');
    expect(unknownDirectives(recall)).toEqual([]);
  });
});

describe('insert actions', () => {
  const spawn = (id: string): Directive => {
    const directive = directiveById(id);
    if (!directive) throw new Error(`${id} expected`);
    return directive;
  };

  it('wraps the selection in a section and selects it back', () => {
    const source = '[Am]Ciao [F]mondo';
    const edit = applySnippet(source, 0, source.length, spawn('chorus'));
    expect(edit.text).toBe('{start_of_chorus}\n[Am]Ciao [F]mondo\n{end_of_chorus}');
    expect(edit.insertText).toBe(edit.text);
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe(source);
  });

  it('places the caret on the content line for an empty selection', () => {
    const edit = applySnippet('X', 1, 1, spawn('verse'));
    expect(edit.text).toBe('X{start_of_verse}\n\n{end_of_verse}');
    expect(edit.selectionStart).toBe(edit.selectionEnd);
    expect(edit.text[edit.selectionStart]).toBe('\n');
  });

  it('inserts a title with the caret inside the braces', () => {
    const empty = applySnippet('', 0, 0, spawn('title'));
    expect(empty.insertText).toBe('{title: }');
    expect(empty.selectionStart).toBe(empty.selectionEnd);
    expect(empty.insertText[empty.selectionStart]).toBe('}');
    const wrapped = applySnippet('My song', 0, 7, spawn('title'));
    expect(wrapped.insertText).toBe('{title: My song}');
    expect(wrapped.text.slice(wrapped.selectionStart, wrapped.selectionEnd)).toBe('My song');
  });

  it('inserts a subtitle with the caret inside the braces', () => {
    const empty = applySnippet('', 0, 0, spawn('subtitle'));
    expect(empty.insertText).toBe('{subtitle: }');
    expect(empty.insertText[empty.selectionStart]).toBe('}');
  });

  it('inserts a compact chorus recall with the label selected', () => {
    const edit = applySnippet('', 0, 0, spawn('rit'));
    expect(edit.insertText).toBe('{chorus: Rit.}');
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('Rit.');
  });

  it('wraps the selection in a comment', () => {
    const edit = applySnippet('dal vivo', 0, 8, spawn('comment'));
    expect(edit.insertText).toBe('{comment: dal vivo}');
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('dal vivo');
  });

  it('inserts an empty comment with the caret inside', () => {
    const edit = applySnippet('', 0, 0, spawn('comment'));
    expect(edit.insertText).toBe('{comment: }');
    expect(edit.selectionStart).toBe(edit.selectionEnd);
    expect(edit.text[edit.selectionStart]).toBe('}');
  });

  it('inserts templates for grid, tab and capo', () => {
    const gridEdit = applySnippet('src', 0, 3, spawn('grid'));
    expect(gridEdit.insertText).toContain('{start_of_grid: Intro}');
    expect(gridEdit.insertText).toContain('{end_of_grid}');
    expect(gridEdit.text.slice(gridEdit.selectionStart, gridEdit.selectionEnd)).toBe('Intro');

    const tabEdit = applySnippet('', 0, 0, spawn('tab'));
    expect(tabEdit.insertText).toContain('{start_of_tab: Solo}');
    expect(tabEdit.text.slice(tabEdit.selectionStart, tabEdit.selectionEnd)).toBe('Solo');

    const capoEdit = applySnippet('', 0, 0, spawn('capo'));
    expect(capoEdit.insertText).toBe('{capo: 2}');
    expect(capoEdit.text.slice(capoEdit.selectionStart, capoEdit.selectionEnd)).toBe('2');
  });
});
