export interface Word {
  text: string;
  chords: string[];
}

export interface Line {
  kind: 'line';
  words: Word[];
}

export interface CommentItem {
  kind: 'comment';
  text: string;
}

export interface UnknownItem {
  kind: 'unknown';
  raw: string;
}

export type SectionItem = Line | CommentItem | UnknownItem;

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
  blocks: Block[];
}
