import { describe, expect, it } from 'vitest';
import { parseChordPro } from '../src/core/chordpro';
import type { SongDocument } from '../src/core/model';
import { defaultSettings, sanitizeSettings, withTranspose } from '../src/core/settings';
import {
  TRANSPOSE_MAX,
  TRANSPOSE_MIN,
  transposeChord,
  transposeDocument
} from '../src/core/transpose';

describe('transposeChord', () => {
  it('trasporta le note internazionali con wrap', () => {
    expect(transposeChord('C', 2)).toBe('D');
    expect(transposeChord('Am', -2)).toBe('Gm');
    expect(transposeChord('B', 1)).toBe('C');
    expect(transposeChord('C', -1)).toBe('B');
  });

  it('mantiene il suffisso e trasporta il basso', () => {
    expect(transposeChord('C/E', 2)).toBe('D/F#');
    expect(transposeChord('Am7/G', 2)).toBe('Bm7/A');
  });

  it('eredita lo stile bemolle dell\u2019accordo', () => {
    expect(transposeChord('Bb', 1)).toBe('B');
    expect(transposeChord('Eb', -1)).toBe('D');
    expect(transposeChord('Bb/D', 2)).toBe('C/E');
  });

  it('usa i diesis quando l\u2019accordo non ha bemolli', () => {
    expect(transposeChord('F', 1)).toBe('F#');
    expect(transposeChord('C7b5', 1)).toBe('C#7b5');
  });

  it('preserva la notazione italiana', () => {
    expect(transposeChord('MIm', 1)).toBe('FAm');
    expect(transposeChord('LAm', 2)).toBe('SIm');
    expect(transposeChord('DO', 2)).toBe('RE');
    expect(transposeChord('REb', 1)).toBe('RE');
    expect(transposeChord('MIm/RE', 2)).toBe('FA#m/MI');
  });

  it('lascia intatti N.C., token sconosciuti e delta zero', () => {
    expect(transposeChord('N.C.', 2)).toBe('N.C.');
    expect(transposeChord('xyz', 2)).toBe('xyz');
    expect(transposeChord('C#m7', 0)).toBe('C#m7');
  });
});

describe('transposeDocument', () => {
  const doc: SongDocument = {
    title: 'Prova',
    subtitle: 'Autore',
    blocks: [
      { kind: 'comment', text: 'Capo at V' },
      {
        kind: 'section',
        type: 'verse',
        explicit: false,
        items: [
          {
            kind: 'line',
            words: [
              { text: 'Ciao', chords: ['Am'] },
              { text: 'mondo', chords: ['C', 'G'] }
            ]
          },
          { kind: 'grid', chords: ['F', 'C'] },
          { kind: 'comment', text: '(x2)' },
          { kind: 'unknown', raw: '{key: G}' }
        ]
      }
    ]
  };

  it('trasporta accordi su parole e grid, non commenti e direttive', () => {
    const result = transposeDocument(doc, 2);
    expect(result.title).toBe('Prova');
    expect(result.blocks[0]).toEqual({ kind: 'comment', text: 'Capo at V' });

    const section = result.blocks[1];
    if (section.kind !== 'section') throw new Error('sezione attesa');
    expect(section.items[0]).toEqual({
      kind: 'line',
      words: [
        { text: 'Ciao', chords: ['Bm'] },
        { text: 'mondo', chords: ['D', 'A'] }
      ]
    });
    expect(section.items[1]).toEqual({ kind: 'grid', chords: ['G', 'D'] });
    expect(section.items[2]).toEqual({ kind: 'comment', text: '(x2)' });
    expect(section.items[3]).toEqual({ kind: 'unknown', raw: '{key: G}' });
  });

  it('con delta zero restituisce lo stesso documento', () => {
    expect(transposeDocument(doc, 0)).toBe(doc);
  });

  it('si integra con il parser ChordPro', () => {
    const parsed = parseChordPro('{title: X}\n[Am]Ciao [C]mondo\n');
    const result = transposeDocument(parsed, 3);
    const before = parsed.blocks[0];
    const after = result.blocks[0];
    if (before.kind !== 'section' || after.kind !== 'section') throw new Error('sezione attesa');
    const lineBefore = before.items[0];
    const lineAfter = after.items[0];
    if (lineBefore.kind !== 'line' || lineAfter.kind !== 'line') throw new Error('linea attesa');
    expect(lineBefore.words[0].chords).toEqual(['Am']);
    expect(lineAfter.words[0].chords).toEqual(['Cm']);
    expect(lineAfter.words[1].chords).toEqual(['D#']);
  });
});

describe('trasposizione nelle impostazioni', () => {
  it('applica default e limiti', () => {
    expect(defaultSettings().transpose).toBe(0);
    expect(sanitizeSettings({ transpose: 99 }).transpose).toBe(TRANSPOSE_MAX);
    expect(sanitizeSettings({ transpose: -99 }).transpose).toBe(TRANSPOSE_MIN);
    expect(sanitizeSettings({ transpose: 2.7 }).transpose).toBe(3);
  });

  it('incrementa e limita con withTranspose', () => {
    expect(withTranspose(defaultSettings(), 1).transpose).toBe(1);
    expect(withTranspose({ ...defaultSettings(), transpose: TRANSPOSE_MAX }, 1).transpose).toBe(
      TRANSPOSE_MAX
    );
    expect(withTranspose({ ...defaultSettings(), transpose: TRANSPOSE_MIN }, -1).transpose).toBe(
      TRANSPOSE_MIN
    );
  });
});
