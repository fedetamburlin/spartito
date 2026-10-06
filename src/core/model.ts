export interface Word {
  text: string;
  chords: string[];
}

export interface Line {
  kind: 'line';
  words: Word[];
}

export interface GridLine {
  kind: 'grid';
  chords: string[];
}

export interface CommentItem {
  kind: 'comment';
  text: string;
}

export interface TabItem {
  kind: 'tab';
  label?: string;
  lines: string[];
}

export type GridToken =
  | { kind: 'chord'; chord: string }
  | { kind: 'bar'; symbol: string }
  | { kind: 'empty'; symbol: string }
  | { kind: 'text'; text: string };

export interface GridBlock {
  kind: 'grid-block';
  label?: string;
  rows: GridToken[][];
}

export interface ChorusRecall {
  kind: 'chorus-recall';
  label: string;
}

export interface UnknownItem {
  kind: 'unknown';
  raw: string;
}

export type SectionItem =
  | Line
  | GridLine
  | CommentItem
  | TabItem
  | GridBlock
  | ChorusRecall
  | UnknownItem;

export type SectionType = 'verse' | 'chorus' | 'bridge';

export interface Section {
  kind: 'section';
  type: SectionType;
  explicit: boolean;
  label?: string;
  items: SectionItem[];
}

export type Block = Section | CommentItem | UnknownItem;

export interface SongDocument {
  title: string;
  subtitle: string;
  capo?: number;
  blocks: Block[];
}
