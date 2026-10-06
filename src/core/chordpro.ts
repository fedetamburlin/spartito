import { isChordToken } from './chords';
import type {
  GridToken,
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

const TAB_START = new Set(['start_of_tab', 'sot']);
const TAB_END = new Set(['end_of_tab', 'eot']);
const GRID_START = new Set(['start_of_grid', 'sog']);
const GRID_END = new Set(['end_of_grid', 'eog']);
const CHORUS_RECALL: Record<string, string> = { chorus: 'Chorus', refrain: 'Chorus', rit: 'Rit.' };

const DIRECTIVE_RE = /^\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*(.*?))?\s*\}$/;
const CHORD_RE = /\[([^\]]*)\]/g;
const GRID_BAR_RE = /^[|:][|:.]*\d?\.?$/;
const ROMAN_VALUES: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12
};

export function parseCapoValue(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  if (/^\d{1,2}$/.test(normalized)) {
    const capo = Number(normalized);
    return capo >= 0 && capo <= 12 ? capo : null;
  }
  return ROMAN_VALUES[normalized] ?? null;
}

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

function envLabel(value: string): string | undefined {
  const attr = /label\s*=\s*(["'])(.*?)\1/i.exec(value);
  if (attr) return attr[2].trim() || undefined;
  const bare = value.replace(/shape\s*=\s*(["']).*?\1/i, '').replace(/\s+/g, ' ').trim();
  if (!bare || /^\d+[+\dx]*$/i.test(bare)) return undefined;
  return bare;
}

function gridTokens(line: string): GridToken[] {
  const tokens: GridToken[] = [];
  for (const part of line.split(/\s+/)) {
    if (!part) continue;
    if (part === '.' || /^%+$/.test(part)) {
      tokens.push({ kind: 'empty', symbol: part });
      continue;
    }
    if (GRID_BAR_RE.test(part)) {
      tokens.push({ kind: 'bar', symbol: part });
      continue;
    }
    for (const piece of part.split('~')) {
      if (!piece) continue;
      tokens.push(
        isChordToken(piece) ? { kind: 'chord', chord: piece } : { kind: 'text', text: piece }
      );
    }
  }
  return tokens;
}

function serializeGridRow(row: GridToken[]): string {
  return row
    .map((token) => {
      if (token.kind === 'chord') return token.chord;
      if (token.kind === 'bar' || token.kind === 'empty') return token.symbol;
      return token.text;
    })
    .join(' ');
}

export function parseChordPro(source: string): SongDocument {
  const doc: SongDocument = { title: '', subtitle: '', blocks: [] };
  let current: Section | null = null;
  let implicit: Section | null = null;
  let env: { kind: 'tab' | 'grid'; label?: string; lines: string[] } | null = null;

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

  const flushEnv = () => {
    if (!env) return;
    if (env.kind === 'tab') {
      pushItem({ kind: 'tab', label: env.label, lines: env.lines });
    } else {
      pushItem({ kind: 'grid-block', label: env.label, rows: env.lines.map(gridTokens) });
    }
    env = null;
  };

  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (env) {
      const endName = env.kind === 'tab' ? TAB_END : GRID_END;
      const closing = DIRECTIVE_RE.exec(trimmed);
      if (closing && endName.has(closing[1].toLowerCase())) {
        flushEnv();
        continue;
      }
      env.lines.push(line);
      continue;
    }

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
        case 'capo': {
          const capo = parseCapoValue(value);
          if (capo !== null) {
            doc.capo = capo;
          } else {
            pushItem({ kind: 'unknown', raw: trimmed });
          }
          break;
        }
        default:
          if (TAB_START.has(name) || GRID_START.has(name)) {
            env = {
              kind: TAB_START.has(name) ? 'tab' : 'grid',
              label: envLabel(value),
              lines: []
            };
          } else if (name in CHORUS_RECALL) {
            pushItem({ kind: 'chorus-recall', label: envLabel(value) ?? CHORUS_RECALL[name] });
          } else if (name in SECTION_START) {
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
  if (doc.capo !== undefined) out.push(`{capo: ${doc.capo}}`);

  const pushItem = (item: SectionItem) => {
    if (item.kind === 'line') {
      out.push(serializeLine(item));
    } else if (item.kind === 'grid') {
      out.push(item.chords.map((chord) => `[${chord}]`).join(' '));
    } else if (item.kind === 'comment') {
      out.push(`{comment: ${item.text}}`);
    } else if (item.kind === 'tab') {
      out.push(item.label ? `{start_of_tab: ${item.label}}` : '{start_of_tab}');
      out.push(...item.lines);
      out.push('{end_of_tab}');
    } else if (item.kind === 'grid-block') {
      out.push(item.label ? `{start_of_grid: ${item.label}}` : '{start_of_grid}');
      item.rows.forEach((row) => out.push(serializeGridRow(row)));
      out.push('{end_of_grid}');
    } else if (item.kind === 'chorus-recall') {
      out.push(item.label === 'Chorus' ? '{chorus}' : `{chorus: ${item.label}}`);
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
