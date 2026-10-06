export type SnippetId =
  | 'verse'
  | 'chorus'
  | 'bridge'
  | 'rit'
  | 'comment'
  | 'grid'
  | 'tab'
  | 'capo';

export interface Snippet {
  id: SnippetId;
  label: string;
  title: string;
  build(selection: string): { text: string; selection: [number, number] };
}

export interface SnippetEdit {
  text: string;
  insertText: string;
  selectionStart: number;
  selectionEnd: number;
}

const GRID_TEMPLATE = [
  '{start_of_grid: Intro}',
  '| C . . . | G . . . |',
  '| Am . . . | F . . . |',
  '{end_of_grid}'
].join('\n');

const TAB_TEMPLATE = [
  '{start_of_tab: Solo}',
  'e|--0--1--0--|',
  'B|--1--1--1--|',
  'G|--0--2--0--|',
  'D|--2--3--2--|',
  'A|--3--3--3--|',
  'E|-----------|',
  '{end_of_tab}'
].join('\n');

function sectionSnippet(id: SnippetId, label: string, name: string): Snippet {
  return {
    id,
    label,
    title: label,
    build(selection) {
      const content = selection.trim();
      const before = `{start_of_${name}}\n`;
      return {
        text: `${before}${content}\n{end_of_${name}}`,
        selection: [before.length, before.length + content.length]
      };
    }
  };
}

function templateSnippet(id: SnippetId, label: string, template: string): Snippet {
  const firstLineEnd = template.indexOf('\n');
  const openLength = template.indexOf(': ');
  return {
    id,
    label,
    title: label,
    build() {
      const labelStart = openLength + 2;
      const labelText = template
        .slice(labelStart, firstLineEnd)
        .replace(/\}+$/, '')
        .trimEnd();
      return { text: template, selection: [labelStart, labelStart + labelText.length] };
    }
  };
}

export const SNIPPETS: Snippet[] = [
  sectionSnippet('verse', 'Verse', 'verse'),
  sectionSnippet('chorus', 'Chorus', 'chorus'),
  sectionSnippet('bridge', 'Bridge', 'bridge'),
  {
    id: 'rit',
    label: 'Rit.',
    title: 'Compact chorus recall ({chorus: Rit.})',
    build() {
      const text = '{chorus: Rit.}';
      return { text, selection: [9, 13] };
    }
  },
  {
    id: 'comment',
    label: 'Comment',
    title: 'Comment line ({comment: ...})',
    build(selection) {
      const text = selection ? `{comment: ${selection}}` : '{comment: }';
      return { text, selection: [10, 10 + selection.length] };
    }
  },
  templateSnippet('grid', 'Grid', GRID_TEMPLATE),
  templateSnippet('tab', 'Tab', TAB_TEMPLATE),
  {
    id: 'capo',
    label: 'Capo',
    title: 'Capo directive ({capo: N})',
    build() {
      const text = '{capo: 2}';
      return { text, selection: [7, 8] };
    }
  }
];

export function snippetById(id: string): Snippet | undefined {
  return SNIPPETS.find((snippet) => snippet.id === id);
}

export function applySnippet(
  source: string,
  start: number,
  end: number,
  snippet: Snippet
): SnippetEdit {
  const { text, selection } = snippet.build(source.slice(start, end));
  return {
    text: source.slice(0, start) + text + source.slice(end),
    insertText: text,
    selectionStart: start + selection[0],
    selectionEnd: start + selection[1]
  };
}
