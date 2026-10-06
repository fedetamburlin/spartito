import type {
  Line,
  Section,
  SectionItem,
  SectionType,
  SongDocument,
  Word
} from './model';

const SECTION_START: Record<string, SectionType> = {
  start_of_chorus: 'chorus',
  soc: 'chorus',
  start_of_verse: 'verse',
  sov: 'verse',
  start_of_bridge: 'bridge',
  sob: 'bridge'
};

const SECTION_END = new Set([
  'end_of_chorus',
  'eoc',
  'end_of_verse',
  'eov',
  'end_of_bridge',
  'eob'
]);

const DIRECTIVE_RE = /^\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*(.*?))?\s*\}$/;
const CHORD_RE = /\[([^\]]*)\]/g;

export function parseLine(text: string): Line {
  const words: Word[] = [];
  let pending: string[] = [];

  const pushText = (chunk: string) => {
    const parts = chunk.split(/\s+/).filter((part) => part.length > 0);
    parts.forEach((part, index) => {
      words.push({ text: part, chords: index === 0 ? pending : [] });
      pending = [];
    });
  };

  let last = 0;
  let match: RegExpExecArray | null;
  CHORD_RE.lastIndex = 0;
  while ((match = CHORD_RE.exec(text))) {
    pushText(text.slice(last, match.index));
    const chord = match[1].trim();
    if (chord) pending.push(chord);
    last = CHORD_RE.lastIndex;
  }
  pushText(text.slice(last));

  return { kind: 'line', words };
}

export function serializeLine(line: Line): string {
  return line.words
    .map((word) => word.chords.map((chord) => `[${chord}]`).join('') + word.text)
    .join(' ');
}

export function bracketChords(text: string): string[] {
  const chords: string[] = [];
  const re = /\[([^\]]*)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const chord = match[1].trim();
    if (chord) chords.push(chord);
  }
  return chords;
}

export function parseChordPro(source: string): SongDocument {
  const doc: SongDocument = { title: '', subtitle: '', blocks: [] };
  let current: Section | null = null;
  let implicit: Section | null = null;

  const closeImplicit = () => {
    if (implicit) {
      if (implicit.items.length > 0) doc.blocks.push(implicit);
      implicit = null;
    }
  };

  const closeCurrent = () => {
    if (current) {
      doc.blocks.push(current);
      current = null;
    }
  };

  const pushItem = (item: SectionItem) => {
    if (current) {
      current.items.push(item);
      return;
    }
    if (!implicit) {
      implicit = { kind: 'section', type: 'verse', explicit: false, items: [] };
    }
    implicit.items.push(item);
  };

  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      closeImplicit();
      continue;
    }

    const directive = DIRECTIVE_RE.exec(trimmed);
    if (directive) {
      const name = directive[1].toLowerCase();
      const value = (directive[2] ?? '').trim();
      switch (name) {
        case 'title':
        case 't':
          doc.title = value;
          closeImplicit();
          break;
        case 'subtitle':
        case 'st':
        case 'artist':
          doc.subtitle = value;
          closeImplicit();
          break;
        case 'comment':
        case 'c':
          pushItem({ kind: 'comment', text: value });
          break;
        default:
          if (name in SECTION_START) {
            closeImplicit();
            closeCurrent();
            current = {
              kind: 'section',
              type: SECTION_START[name],
              explicit: true,
              label: value || undefined,
              items: []
            };
          } else if (SECTION_END.has(name)) {
            closeCurrent();
          } else {
            pushItem({ kind: 'unknown', raw: trimmed });
          }
      }
      continue;
    }

    const parsed = parseLine(line);
    if (parsed.words.length === 0) {
      const chords = bracketChords(line);
      if (chords.length > 0) {
        pushItem({ kind: 'grid', chords });
      } else {
        closeImplicit();
      }
      continue;
    }
    pushItem(parsed);
  }

  closeCurrent();
  closeImplicit();
  return doc;
}

export function serializeChordPro(doc: SongDocument): string {
  const out: string[] = [];
  if (doc.title) out.push(`{title: ${doc.title}}`);
  if (doc.subtitle) out.push(`{subtitle: ${doc.subtitle}}`);

  const pushItem = (item: SectionItem) => {
    if (item.kind === 'line') {
      out.push(serializeLine(item));
    } else if (item.kind === 'grid') {
      out.push(item.chords.map((chord) => `[${chord}]`).join(' '));
    } else if (item.kind === 'comment') {
      out.push(`{comment: ${item.text}}`);
    } else {
      out.push(item.raw);
    }
  };

  for (const block of doc.blocks) {
    if (out.length > 0) out.push('');
    if (block.kind === 'section') {
      if (block.explicit) {
        const start = `start_of_${block.type}`;
        out.push(block.label ? `{${start}: ${block.label}}` : `{${start}}`);
        block.items.forEach(pushItem);
        out.push(`{end_of_${block.type}}`);
      } else {
        block.items.forEach(pushItem);
      }
    } else if (block.kind === 'comment') {
      out.push(`{comment: ${block.text}}`);
    } else {
      out.push(block.raw);
    }
  }

  return out.join('\n') + '\n';
}
