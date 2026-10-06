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
  if (block.kind !== 'section') throw new Error('sezione attesa');
  const line = block.items[0];
  if (line.kind !== 'line') throw new Error('linea attesa');
  return line.words.flatMap((word) => word.chords);
}

describe('parseCapoValue', () => {
  it('accetta numeri arabi e romani', () => {
    expect(parseCapoValue('3')).toBe(3);
    expect(parseCapoValue('III')).toBe(3);
    expect(parseCapoValue('xii')).toBe(12);
  });

  it('rifiuta valori non validi', () => {
    expect(parseCapoValue('')).toBeNull();
    expect(parseCapoValue('chitarra')).toBeNull();
    expect(parseCapoValue('99')).toBeNull();
  });
});

describe('capo nel parser', () => {
  it('legge {capo: N} e lo riserializza', () => {
    const doc = parseChordPro('{title: X}\n{capo: 2}\n[C]Ciao\n');
    expect(doc.capo).toBe(2);
    const out = serializeChordPro(doc);
    expect(out).toContain('{capo: 2}');
    expect(parseChordPro(out).capo).toBe(2);
  });

  it('accetta i numeri romani', () => {
    expect(parseChordPro('{capo: V}\n[C]Ciao\n').capo).toBe(5);
  });

  it('preserva una direttiva capo non valida', () => {
    const doc = parseChordPro('{capo: chitarra}\n[C]Ciao\n');
    expect(doc.capo).toBeUndefined();
    expect(serializeChordPro(doc)).toContain('{capo: chitarra}');
  });
});

describe('import del capo', () => {
  it('converte la riga capo in direttiva', () => {
    const result = importSong('Capo: 2\n[C]Ciao\n');
    expect(result.chordpro).toContain('{capo: 2}');
    expect(result.chordpro).not.toContain('{comment: Capo: 2}');
  });

  it('normalizza i numeri romani', () => {
    expect(importSong('capo at V\n[C]Ciao\n').chordpro).toContain('{capo: 5}');
  });

  it('lascia come commento il capo non interpretabile', () => {
    const result = importSong('Capo: chitarra in D\n[C]Ciao\n');
    expect(result.chordpro).toContain('{comment: Capo: chitarra in D}');
    expect(result.chordpro).not.toContain('{capo:');
  });
});

describe('transposedForDisplay', () => {
  it('senza capo traspone gli accordi', () => {
    const result = transposedForDisplay(baseDoc, 2);
    expect(firstChords(result.doc)).toEqual(['D', 'A']);
    expect(result.capo).toBe(0);
  });

  it('con capo tiene le forme e sposta il capo', () => {
    const doc = { ...baseDoc, capo: 2 };
    const result = transposedForDisplay(doc, 2);
    expect(result.doc).toBe(doc);
    expect(firstChords(result.doc)).toEqual(['C', 'G']);
    expect(result.capo).toBe(4);
  });

  it('con capo esatto zero non mostra la riga', () => {
    const doc = { ...baseDoc, capo: 2 };
    const result = transposedForDisplay(doc, -2);
    expect(result.doc).toBe(doc);
    expect(result.capo).toBe(0);
  });

  it('se il capo andrebbe sotto zero trasporta gli accordi', () => {
    const doc = { ...baseDoc, capo: 2 };
    const result = transposedForDisplay(doc, -3);
    expect(firstChords(result.doc)).toEqual(['B', 'F#']);
    expect(result.capo).toBe(0);
  });

  it('ignora capo 0 esplicito', () => {
    const doc = { ...baseDoc, capo: 0 };
    const result = transposedForDisplay(doc, 2);
    expect(firstChords(result.doc)).toEqual(['D', 'A']);
    expect(result.capo).toBe(0);
  });
});
