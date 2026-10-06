import { describe, expect, it } from 'vitest';
import { parseCapoValue, parseChordPro, serializeChordPro } from '../src/core/chordpro';
import { importSong } from '../src/core/import';
import type { SongDocument } from '../src/core/model';
import { transposedForDisplay } from '../src/core/transpose';

const baseDoc: SongDocument = {
  title: 'Prova',
  subtitle: '',
  blocks: [
    {
      kind: 'section',
      type: 'verse',
      explicit: false,
      items: [
        {
          kind: 'line',
          words: [
            { text: 'Ciao', chords: ['C'] },
            { text: 'mondo', chords: ['G'] }
          ]
        }
      ]
    }
  ]
};

function firstChords(doc: SongDocument): string[] {
  const block = doc.blocks[0];
  if (block.kind !== 'section') throw new Error('section expected');
  const line = block.items[0];
  if (line.kind !== 'line') throw new Error('line expected');
  return line.words.flatMap((word) => word.chords);
}

describe('parseCapoValue', () => {
  it('accepts Arabic and Roman numerals', () => {
    expect(parseCapoValue('3')).toBe(3);
    expect(parseCapoValue('III')).toBe(3);
    expect(parseCapoValue('xii')).toBe(12);
  });

  it('rejects invalid values', () => {
    expect(parseCapoValue('')).toBeNull();
    expect(parseCapoValue('chitarra')).toBeNull();
    expect(parseCapoValue('99')).toBeNull();
  });
});

describe('capo in the parser', () => {
  it('reads {capo: N} and serializes it back', () => {
    const doc = parseChordPro('{title: X}\n{capo: 2}\n[C]Ciao\n');
    expect(doc.capo).toBe(2);
    const out = serializeChordPro(doc);
    expect(out).toContain('{capo: 2}');
    expect(parseChordPro(out).capo).toBe(2);
  });

  it('accepts Roman numerals', () => {
    expect(parseChordPro('{capo: V}\n[C]Ciao\n').capo).toBe(5);
  });

  it('preserves an invalid capo directive', () => {
    const doc = parseChordPro('{capo: chitarra}\n[C]Ciao\n');
    expect(doc.capo).toBeUndefined();
    expect(serializeChordPro(doc)).toContain('{capo: chitarra}');
  });
});

describe('capo import', () => {
  it('converts the capo line into a directive', () => {
    const result = importSong('Capo: 2\n[C]Ciao\n');
    expect(result.chordpro).toContain('{capo: 2}');
    expect(result.chordpro).not.toContain('{comment: Capo: 2}');
  });

  it('normalizes Roman numerals', () => {
    expect(importSong('capo at V\n[C]Ciao\n').chordpro).toContain('{capo: 5}');
  });

  it('keeps an unparsable capo as a comment', () => {
    const result = importSong('Capo: chitarra in D\n[C]Ciao\n');
    expect(result.chordpro).toContain('{comment: Capo: chitarra in D}');
    expect(result.chordpro).not.toContain('{capo:');
  });
});

describe('transposedForDisplay', () => {
  it('without capo transposes the chords', () => {
    const result = transposedForDisplay(baseDoc, 2);
    expect(firstChords(result.doc)).toEqual(['D', 'A']);
    expect(result.capo).toBe(0);
  });

  it('with capo keeps the shapes and moves the capo', () => {
    const doc = { ...baseDoc, capo: 2 };
    const result = transposedForDisplay(doc, 2);
    expect(result.doc).toBe(doc);
    expect(firstChords(result.doc)).toEqual(['C', 'G']);
    expect(result.capo).toBe(4);
  });

  it('with capo exactly zero does not show the line', () => {
    const doc = { ...baseDoc, capo: 2 };
    const result = transposedForDisplay(doc, -2);
    expect(result.doc).toBe(doc);
    expect(result.capo).toBe(0);
  });

  it('if the capo would go below zero transposes the chords', () => {
    const doc = { ...baseDoc, capo: 2 };
    const result = transposedForDisplay(doc, -3);
    expect(firstChords(result.doc)).toEqual(['B', 'F#']);
    expect(result.capo).toBe(0);
  });

  it('ignores explicit capo 0', () => {
    const doc = { ...baseDoc, capo: 0 };
    const result = transposedForDisplay(doc, 2);
    expect(firstChords(result.doc)).toEqual(['D', 'A']);
    expect(result.capo).toBe(0);
  });
});
