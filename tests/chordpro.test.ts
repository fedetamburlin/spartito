import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseChordPro, serializeChordPro } from '../src/core/chordpro';
import type { Section, UnknownItem } from '../src/core/model';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (name: string) => readFileSync(join(fixturesDir, name), 'utf8');

function unknownRaws(doc: ReturnType<typeof parseChordPro>): string[] {
  const raws: string[] = [];
  for (const block of doc.blocks) {
    if (block.kind === 'section') {
      for (const item of block.items) {
        if (item.kind === 'unknown') raws.push((item as UnknownItem).raw);
      }
    } else if (block.kind === 'unknown') {
      raws.push(block.raw);
    }
  }
  return raws;
}

describe('parseChordPro', () => {
  it('legge titolo e accordi inline', () => {
    const doc = parseChordPro(load('minimal.cho'));
    expect(doc.title).toBe('Canzone Minima');
    const section = doc.blocks[0] as Section;
    expect(section.kind).toBe('section');
    expect(section.type).toBe('verse');
    expect(section.explicit).toBe(false);
    const line = section.items[0];
    if (line.kind !== 'line') throw new Error('atteso una riga');
    expect(line.words).toEqual([
      { text: 'Ciao', chords: ['Am'] },
      { text: 'mondo', chords: ['F'] }
    ]);
  });

  it('gestisce ritornello esplicito, commenti e sottotitolo', () => {
    const doc = parseChordPro(load('complete.cho'));
    expect(doc.subtitle).toBe('Testo inventato');
    const chorus = doc.blocks.find(
      (block) => block.kind === 'section' && block.type === 'chorus'
    ) as Section;
    expect(chorus.explicit).toBe(true);
    expect(chorus.items.filter((item) => item.kind === 'line')).toHaveLength(2);
    const first = doc.blocks[0];
    if (first.kind !== 'section') throw new Error('attesa una sezione implicita');
    expect(first.items[0].kind).toBe('comment');
  });

  it('preserva le direttive sconosciute in ordine', () => {
    const doc = parseChordPro(load('unknown.cho'));
    expect(unknownRaws(doc)).toEqual(['{key: G}', '{x_custom: 42}', '{capo: 3}']);
    const serialized = serializeChordPro(doc);
    expect(serialized).toContain('{key: G}');
    expect(serialized).toContain('{x_custom: 42}');
    expect(serialized).toContain('{capo: 3}');
  });

  it('gestisce accenti, alterati, slash e accordi multipli', () => {
    const doc = parseChordPro(load('edge.cho'));
    expect(doc.title).toBe('Accenti È À Ò');
    const section = doc.blocks[0] as Section;
    const first = section.items[0];
    if (first.kind !== 'line') throw new Error('attesa una riga');
    expect(first.words.map((word) => word.chords)).toEqual([
      ['F#m'],
      ['Bb'],
      ['C/G'],
      [],
      ['N.C.']
    ]);
    const second = section.items[1];
    if (second.kind !== 'line') throw new Error('attesa una riga');
    expect(second.words[0].chords).toEqual(['C', 'G']);
  });

  it('accetta fine riga CRLF', () => {
    const doc = parseChordPro('{title: X}\r\n\r\n[Am]Ciao\r\n');
    expect(doc.title).toBe('X');
    const section = doc.blocks[0] as Section;
    const line = section.items[0];
    if (line.kind !== 'line') throw new Error('attesa una riga');
    expect(line.words).toEqual([{ text: 'Ciao', chords: ['Am'] }]);
  });

  it('gestisce righe di soli accordi (grid) e le preserva al roundtrip', () => {
    const doc = parseChordPro('[C] [G]\n[Am]Testo\n');
    const section = doc.blocks[0] as Section;
    expect(section.items[0]).toEqual({ kind: 'grid', chords: ['C', 'G'] });
    const roundtripped = parseChordPro(serializeChordPro(doc));
    expect(roundtripped).toEqual(doc);
  });
});

describe('roundtrip parse/serialize', () => {
  for (const name of ['minimal.cho', 'complete.cho', 'edge.cho', 'unknown.cho']) {
    it(`preserva il modello per ${name}`, () => {
      const doc = parseChordPro(load(name));
      const roundtripped = parseChordPro(serializeChordPro(doc));
      expect(roundtripped).toEqual(doc);
      expect(serializeChordPro(roundtripped)).toBe(serializeChordPro(doc));
    });
  }
});
