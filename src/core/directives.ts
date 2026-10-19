import type { SectionType } from './model';

/**
 * Single source of truth for the supported ChordPro subset:
 * directive names (used by the parser), menu insertion actions and the
 * syntax help panel are all derived from this file.
 */

export const SECTION_DIRECTIVES: Record<SectionType, { start: string; end: string }> = {
  verse: { start: 'start_of_verse', end: 'end_of_verse' },
  chorus: { start: 'start_of_chorus', end: 'end_of_chorus' },
  bridge: { start: 'start_of_bridge', end: 'end_of_bridge' }
};

export const BLOCK_DIRECTIVES = {
  tab: { start: 'start_of_tab', end: 'end_of_tab' },
  grid: { start: 'start_of_grid', end: 'end_of_grid' }
} as const;

export const TITLE_DIRECTIVE = 'title';
export const SUBTITLE_DIRECTIVE = 'subtitle';
export const COMMENT_DIRECTIVE = 'comment';
export const CAPO_DIRECTIVE = 'capo';

/** Compact chorus recall: directive name -> rendered label. */
export const RECALL_DIRECTIVES: Record<string, string> = {
  chorus: 'Chorus',
  rit: 'Rit.'
};

export type DirectiveGroupId = 'song' | 'sections' | 'blocks' | 'chords';

export interface DirectiveGroup {
  id: DirectiveGroupId;
  label: string;
  /** Groups with menu: true appear in the Insert menu. */
  menu: boolean;
}

export const DIRECTIVE_GROUPS: DirectiveGroup[] = [
  { id: 'song', label: 'Song', menu: true },
  { id: 'sections', label: 'Sections', menu: true },
  { id: 'blocks', label: 'Blocks', menu: true },
  { id: 'chords', label: 'Chords', menu: false }
];

export interface SnippetBuild {
  text: string;
  selection: [number, number];
}

export interface SnippetEdit {
  text: string;
  insertText: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface Directive {
  id: string;
  group: DirectiveGroupId;
  label: string;
  syntax: string[];
  description: string;
  /** Canonical source parsed by the guard tests. */
  example: string;
  build(selection: string): SnippetBuild;
}

export interface ReferenceEntry {
  id: string;
  syntax: string;
  description: string;
  /** Canonical source parsed by the guard tests. */
  example: string;
}

function valueBuild(name: string, selection: string): SnippetBuild {
  const open = `{${name}: `;
  const text = selection ? `${open}${selection}}` : `{${name}: }`;
  return { text, selection: [open.length, open.length + selection.length] };
}

function sectionBuild(type: SectionType, selection: string): SnippetBuild {
  const { start, end } = SECTION_DIRECTIVES[type];
  const content = selection.trim();
  const before = `{${start}}\n`;
  return {
    text: `${before}${content}\n{${end}}`,
    selection: [before.length, before.length + content.length]
  };
}

function templateBuild(template: string): SnippetBuild {
  const firstLineEnd = template.indexOf('\n');
  const labelStart = template.indexOf(': ') + 2;
  const labelText = template.slice(labelStart, firstLineEnd).replace(/\}+$/, '').trimEnd();
  return { text: template, selection: [labelStart, labelStart + labelText.length] };
}

export const GRID_TEMPLATE = [
  '{start_of_grid: Intro}',
  '| C . . . | G . . . |',
  '| Am . . . | F . . . |',
  '{end_of_grid}'
].join('\n');

export const TAB_TEMPLATE = [
  '{start_of_tab: Solo}',
  'e|--0--1--0--|',
  'B|--1--1--1--|',
  'G|--0--2--0--|',
  'D|--2--3--2--|',
  'A|--3--3--3--|',
  'E|-----------|',
  '{end_of_tab}'
].join('\n');

export const DIRECTIVES: Directive[] = [
  {
    id: 'title',
    group: 'song',
    label: 'Title',
    syntax: ['{title: My song}'],
    description: 'Song title',
    example: '{title: My song}',
    build: (selection) => valueBuild(TITLE_DIRECTIVE, selection)
  },
  {
    id: 'subtitle',
    group: 'song',
    label: 'Subtitle',
    syntax: ['{subtitle: ...}'],
    description: 'Subtitle or artist, shown under the title',
    example: '{subtitle: Niccolò Fabi}',
    build: (selection) => valueBuild(SUBTITLE_DIRECTIVE, selection)
  },
  {
    id: 'capo',
    group: 'song',
    label: 'Capo',
    syntax: ['{capo: 2}', '{capo: II}'],
    description: 'Capo 0–12 (digits or Roman numerals), shown under the title',
    example: '{capo: II}',
    build: () => ({
      text: `{${CAPO_DIRECTIVE}: 2}`,
      selection: [`{${CAPO_DIRECTIVE}: `.length, `{${CAPO_DIRECTIVE}: `.length + 1]
    })
  },
  {
    id: 'comment',
    group: 'song',
    label: 'Comment',
    syntax: ['{comment: ...}'],
    description: 'Comment line (italic, dedicated colour)',
    example: '{comment: dal vivo}',
    build: (selection) => valueBuild(COMMENT_DIRECTIVE, selection)
  },
  {
    id: 'verse',
    group: 'sections',
    label: 'Verse',
    syntax: [`{${SECTION_DIRECTIVES.verse.start}}`, `{${SECTION_DIRECTIVES.verse.end}}`],
    description: 'Verse section; optional label, e.g. {start_of_verse: Verse 1}',
    example: `{${SECTION_DIRECTIVES.verse.start}}\n[Am]Ciao [F]mondo\n{${SECTION_DIRECTIVES.verse.end}}`,
    build: (selection) => sectionBuild('verse', selection)
  },
  {
    id: 'chorus',
    group: 'sections',
    label: 'Chorus',
    syntax: [`{${SECTION_DIRECTIVES.chorus.start}}`, `{${SECTION_DIRECTIVES.chorus.end}}`],
    description: 'Chorus section (bold); optional label',
    example: `{${SECTION_DIRECTIVES.chorus.start}}\n[F]Ritornello\n{${SECTION_DIRECTIVES.chorus.end}}`,
    build: (selection) => sectionBuild('chorus', selection)
  },
  {
    id: 'bridge',
    group: 'sections',
    label: 'Bridge',
    syntax: [`{${SECTION_DIRECTIVES.bridge.start}}`, `{${SECTION_DIRECTIVES.bridge.end}}`],
    description: 'Bridge section; optional label',
    example: `{${SECTION_DIRECTIVES.bridge.start}}\n[G]Ponte\n{${SECTION_DIRECTIVES.bridge.end}}`,
    build: (selection) => sectionBuild('bridge', selection)
  },
  {
    id: 'rit',
    group: 'sections',
    label: 'Rit.',
    syntax: ['{chorus}', '{rit}', '{chorus: Final}'],
    description: 'Compact chorus recall: {chorus} renders "Chorus", {rit} renders "Rit."',
    example: '{chorus: Rit.}',
    build: () => {
      const text = '{chorus: Rit.}';
      return { text, selection: [9, 13] };
    }
  },
  {
    id: 'tab',
    group: 'blocks',
    label: 'Tab',
    syntax: [`{${BLOCK_DIRECTIVES.tab.start}}`, `{${BLOCK_DIRECTIVES.tab.end}}`],
    description: 'Tab block: lines kept exactly as typed; label optional',
    example: TAB_TEMPLATE,
    build: () => templateBuild(TAB_TEMPLATE)
  },
  {
    id: 'grid',
    group: 'blocks',
    label: 'Grid',
    syntax: [`{${BLOCK_DIRECTIVES.grid.start}}`, `{${BLOCK_DIRECTIVES.grid.end}}`],
    description: 'Chord grid: bars |, empty ., repeat %; label optional',
    example: GRID_TEMPLATE,
    build: () => templateBuild(GRID_TEMPLATE)
  }
];

/** Inline syntax shown in the help panel; covered by the guard tests too. */
export const REFERENCE: ReferenceEntry[] = [
  {
    id: 'inline',
    syntax: '[Am]Hello [C]world',
    description: 'Chord above the word that follows it',
    example: '[Am]Hello [C]world'
  },
  {
    id: 'multi',
    syntax: '[C][G]word',
    description: 'Several chords on one word',
    example: '[C][G]word'
  },
  {
    id: 'italian',
    syntax: '[Do] [Lam] [Sol]',
    description: 'Italian note names work too',
    example: '[Do] [Lam] [Sol]'
  },
  {
    id: 'chordline',
    syntax: '[C] [G] [Am]',
    description: 'Chord-only line (on a line of its own)',
    example: '[C] [G] [Am]'
  }
];

export interface HelpRow {
  id: string;
  syntax: string[];
  description: string;
}

/** Rows the help panel shows for a group (menu groups come from DIRECTIVES). */
export function rowsForGroup(group: DirectiveGroup): HelpRow[] {
  if (group.id === 'chords') {
    return REFERENCE.map((entry) => ({
      id: entry.id,
      syntax: [entry.syntax],
      description: entry.description
    }));
  }
  return DIRECTIVES.filter((directive) => directive.group === group.id).map((directive) => ({
    id: directive.id,
    syntax: directive.syntax,
    description: directive.description
  }));
}

export function directiveById(id: string): Directive | undefined {
  return DIRECTIVES.find((directive) => directive.id === id);
}

export function applySnippet(
  source: string,
  start: number,
  end: number,
  directive: Directive
): SnippetEdit {
  const { text, selection } = directive.build(source.slice(start, end));
  return {
    text: source.slice(0, start) + text + source.slice(end),
    insertText: text,
    selectionStart: start + selection[0],
    selectionEnd: start + selection[1]
  };
}
