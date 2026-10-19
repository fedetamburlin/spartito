import { splitChord } from '../../src/core/chords';
import type { Block, SectionItem, SongDocument } from '../../src/core/model';

/**
 * Semantic comparison for transposition tests.
 *
 * Exact string round-trips are not guaranteed: a flat chord that lands on a
 * natural note loses its flat preference (Bb +1 -> B, then B -1 -> A#).
 * The contract we can verify is pitch class + written suffix + bass.
 */

const NOTE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ITALIAN_PC: Record<string, number> = { DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, SI: 11 };

export function pitchClass(note: string): number | null {
  const intl = /^([A-G])([#b]?)$/.exec(note);
  if (intl) {
    const accidental = intl[2] === '#' ? 1 : intl[2] === 'b' ? -1 : 0;
    return (NOTE_PC[intl[1]] + accidental + 12) % 12;
  }
  const it = /^(DO|RE|MI|FA|SOL|LA|SI)([#b]?)$/i.exec(note);
  if (it) {
    const accidental = it[2] === '#' ? 1 : it[2] === 'b' ? -1 : 0;
    return (ITALIAN_PC[it[1].toUpperCase()] + accidental + 12) % 12;
  }
  return null;
}

export function semanticChord(chord: string): unknown {
  const parts = splitChord(chord);
  if (!parts) return chord;
  return {
    system: parts.system,
    root: pitchClass(parts.root),
    suffix: parts.suffix,
    bass: parts.bass === undefined ? undefined : pitchClass(parts.bass)
  };
}

function normalizeItem(item: SectionItem): unknown {
  if (item.kind === 'line') {
    return {
      ...item,
      words: item.words.map((word) => ({
        text: word.text,
        chords: word.chords.map(semanticChord)
      }))
    };
  }
  if (item.kind === 'grid') {
    return { ...item, chords: item.chords.map(semanticChord) };
  }
  if (item.kind === 'grid-block') {
    return {
      ...item,
      rows: item.rows.map((row) =>
        row.map((token) =>
          token.kind === 'chord' ? { ...token, chord: semanticChord(token.chord) } : token
        )
      )
    };
  }
  return item;
}

function normalizeBlock(block: Block): unknown {
  if (block.kind !== 'section') return block;
  return { ...block, items: block.items.map(normalizeItem) };
}

export function normalizeDocument(doc: SongDocument): unknown {
  return {
    title: doc.title,
    subtitle: doc.subtitle,
    capo: doc.capo,
    blocks: doc.blocks.map(normalizeBlock)
  };
}
