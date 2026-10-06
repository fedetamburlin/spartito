import { splitChord } from './chords';
import type { SectionItem, SongDocument } from './model';

export const TRANSPOSE_MIN = -11;
export const TRANSPOSE_MAX = 11;

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ITALIAN_PC: Record<string, number> = { DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, SI: 11 };

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP_ITALIAN = ['DO', 'DO#', 'RE', 'RE#', 'MI', 'FA', 'FA#', 'SOL', 'SOL#', 'LA', 'LA#', 'SI'];
const FLAT_ITALIAN = ['DO', 'REb', 'RE', 'MIb', 'MI', 'FA', 'SOLb', 'SOL', 'LAb', 'LA', 'SIb', 'SI'];

function parseNote(note: string): { system: 'intl' | 'it'; pc: number } | null {
  const intl = /^([A-G])([#b]?)$/.exec(note);
  if (intl) {
    const offset = intl[2] === '#' ? 1 : intl[2] === 'b' ? -1 : 0;
    return { system: 'intl', pc: (LETTER_PC[intl[1]] + offset + 12) % 12 };
  }

  const it = /^(DO|RE|MI|FA|SOL|LA|SI)([#b]?)$/i.exec(note);
  if (it) {
    const offset = it[2] === '#' ? 1 : it[2] === 'b' ? -1 : 0;
    return { system: 'it', pc: (ITALIAN_PC[it[1].toUpperCase()] + offset + 12) % 12 };
  }

  return null;
}

function transposeNote(note: string, delta: number, useFlats: boolean): string | null {
  const parsed = parseNote(note);
  if (!parsed) return null;
  const names = parsed.system === 'it'
    ? (useFlats ? FLAT_ITALIAN : SHARP_ITALIAN)
    : (useFlats ? FLAT_NAMES : SHARP_NAMES);
  const rendered = names[(((parsed.pc + delta) % 12) + 12) % 12];
  return note[0] === note[0].toLowerCase() ? rendered.toLowerCase() : rendered;
}

export function prefersFlats(chord: string): boolean {
  const parts = splitChord(chord);
  if (!parts) return false;
  return /b/.test(parts.root) || (parts.bass !== undefined && /b/.test(parts.bass));
}

export function transposeChord(chord: string, delta: number): string {
  if (!delta) return chord;
  const parts = splitChord(chord);
  if (!parts) return chord;

  const useFlats = prefersFlats(chord);
  const root = transposeNote(parts.root, delta, useFlats);
  if (!root) return chord;

  let bass = parts.bass;
  if (bass !== undefined) {
    const shifted = transposeNote(bass, delta, useFlats);
    if (!shifted) return chord;
    bass = shifted;
  }

  return root + parts.suffix + (bass !== undefined ? `/${bass}` : '');
}

function transposeItem(item: SectionItem, delta: number): SectionItem {
  if (item.kind === 'line') {
    return {
      ...item,
      words: item.words.map((word) => ({
        ...word,
        chords: word.chords.map((chord) => transposeChord(chord, delta))
      }))
    };
  }
  if (item.kind === 'grid') {
    return { ...item, chords: item.chords.map((chord) => transposeChord(chord, delta)) };
  }
  return item;
}

export function transposeDocument(doc: SongDocument, delta: number): SongDocument {
  if (!delta) return doc;
  return {
    ...doc,
    blocks: doc.blocks.map((block) =>
      block.kind === 'section'
        ? { ...block, items: block.items.map((item) => transposeItem(item, delta)) }
        : block
    )
  };
}

export interface DisplayTransform {
  doc: SongDocument;
  capo: number;
}

export function transposedForDisplay(doc: SongDocument, delta: number): DisplayTransform {
  const base = doc.capo ?? 0;
  if (!base) {
    return { doc: delta ? transposeDocument(doc, delta) : doc, capo: 0 };
  }
  const shown = base + delta;
  if (shown >= 0) return { doc, capo: shown };
  return { doc: transposeDocument(doc, shown), capo: 0 };
}
