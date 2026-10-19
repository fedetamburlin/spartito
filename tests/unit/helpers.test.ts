import { describe, expect, it } from 'vitest';
import { semanticChord } from '../helpers/semantic';
import { squeeze } from '../helpers/text';

/**
 * The semantic comparison is the backbone of the transposition invariants:
 * if it were too permissive, those tests would pass on broken output.
 */

describe('semanticChord', () => {
  it('treats enharmonic spellings as equal', () => {
    expect(semanticChord('Bb')).toEqual(semanticChord('A#'));
    expect(semanticChord('C#m')).toEqual(semanticChord('Dbm'));
  });

  it('keeps the written suffix', () => {
    expect(semanticChord('Am')).not.toEqual(semanticChord('A'));
    expect(semanticChord('Cadd9')).not.toEqual(semanticChord('C'));
  });

  it('keeps the bass note', () => {
    expect(semanticChord('C/G')).not.toEqual(semanticChord('C'));
    expect(semanticChord('C#/G')).toEqual(semanticChord('Db/G'));
  });

  it('keeps the notation system', () => {
    expect(semanticChord('MIm')).toMatchObject({ system: 'it', root: 4 });
    expect(semanticChord('Em')).toMatchObject({ system: 'intl', root: 4 });
    expect(semanticChord('MIm')).not.toEqual(semanticChord('Em'));
  });

  it('leaves non-chords untouched', () => {
    expect(semanticChord('N.C.')).toBe('N.C.');
    expect(semanticChord('not-a-chord')).toBe('not-a-chord');
  });
});

describe('squeeze', () => {
  it('collapses runs of whitespace and trims', () => {
    expect(squeeze('  a  b\n\tc  ')).toBe('a b c');
  });
});
