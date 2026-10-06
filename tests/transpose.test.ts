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
  it('transposes international notes with wrap-around', () => {
    expect(transposeChord('C', 2)).toBe('D');
    expect(transposeChord('Am', -2)).toBe('Gm');
    expect(transposeChord('B', 1)).toBe('C');
    expect(transposeChord('C', -1)).toBe('B');
  });

  it('keeps the suffix and transposes the bass note', () => {
    expect(transposeChord('C/E', 2)).toBe('D/F#');
    expect(transposeChord('Am7/G', 2)).toBe('Bm7/A');
  });

  it('inherits the flat style of the chord', () => {
    expect(transposeChord('Bb', 1)).toBe('B');
    expect(transposeChord('Eb', -1)).toBe('D');
    expect(transposeChord('Bb/D', 2)).toBe('C/E');
  });

  it('uses sharps when the chord has no flats', () => {
    expect(transposeChord('F', 1)).toBe('F#');
    expect(transposeChord('C7b5', 1)).toBe('C#7b5');
  });

  it('preserves Italian notation', () => {
    expect(transposeChord('MIm', 1)).toBe('FAm');
    expect(transposeChord('LAm', 2)).toBe('SIm');
    expect(transposeChord('DO', 2)).toBe('RE');
    expect(transposeChord('REb', 1)).toBe('RE');
    expect(transposeChord('MIm/RE', 2)).toBe('FA#m/MI');
  });

  it('leaves N.C., unknown tokens and zero delta untouched', () => {
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

  it('transposes chords on words and grids, not comments and directives', () => {
    const result = transposeDocument(doc, 2);
    expect(result.title).toBe('Prova');
    expect(result.blocks[0]).toEqual({ kind: 'comment', text: 'Capo at V' });

    const section = result.blocks[1];
    if (section.kind !== 'section') throw new Error('section expected');
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

  it('returns the same document with zero delta', () => {
    expect(transposeDocument(doc, 0)).toBe(doc);
  });

  it('integrates with the ChordPro parser', () => {
    const parsed = parseChordPro('{title: X}\n[Am]Ciao [C]mondo\n');
    const result = transposeDocument(parsed, 3);
    const before = parsed.blocks[0];
    const after = result.blocks[0];
    if (before.kind !== 'section' || after.kind !== 'section') throw new Error('section expected');
    const lineBefore = before.items[0];
    const lineAfter = after.items[0];
    if (lineBefore.kind !== 'line' || lineAfter.kind !== 'line') throw new Error('line expected');
    expect(lineBefore.words[0].chords).toEqual(['Am']);
    expect(lineAfter.words[0].chords).toEqual(['Cm']);
    expect(lineAfter.words[1].chords).toEqual(['D#']);
  });

  it('transposes grid blocks but leaves tab and chorus recall untouched', () => {
    const parsed = parseChordPro(
      '{start_of_grid}\n| C . |\n{end_of_grid}\n{start_of_tab}\ne|--0--|\n{end_of_tab}\n{chorus: Rit.}\n'
    );
    const result = transposeDocument(parsed, 2);
    const section = result.blocks[0];
    if (section.kind !== 'section') throw new Error('section expected');
    expect(section.items).toHaveLength(3);

    const grid = section.items[0];
    if (grid.kind !== 'grid-block') throw new Error('grid-block expected');
    expect(grid.rows[0][1]).toEqual({ kind: 'chord', chord: 'D' });

    const tab = section.items[1];
    if (tab.kind !== 'tab') throw new Error('tab expected');
    expect(tab.lines).toEqual(['e|--0--|']);

    expect(section.items[2]).toEqual({ kind: 'chorus-recall', label: 'Rit.' });
  });
});

describe('transposition in settings', () => {
  it('applies defaults and limits', () => {
    expect(defaultSettings().transpose).toBe(0);
    expect(sanitizeSettings({ transpose: 99 }).transpose).toBe(TRANSPOSE_MAX);
    expect(sanitizeSettings({ transpose: -99 }).transpose).toBe(TRANSPOSE_MIN);
    expect(sanitizeSettings({ transpose: 2.7 }).transpose).toBe(3);
  });

  it('increments and clamps with withTranspose', () => {
    expect(withTranspose(defaultSettings(), 1).transpose).toBe(1);
    expect(withTranspose({ ...defaultSettings(), transpose: TRANSPOSE_MAX }, 1).transpose).toBe(
      TRANSPOSE_MAX
    );
    expect(withTranspose({ ...defaultSettings(), transpose: TRANSPOSE_MIN }, -1).transpose).toBe(
      TRANSPOSE_MIN
    );
  });
});
