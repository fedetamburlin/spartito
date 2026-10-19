import { describe, expect, it } from 'vitest';
import { scanChordProLine } from '../src/core/highlight';

describe('scanChordProLine', () => {
  it('returns no tokens for plain lyrics', () => {
    expect(scanChordProLine('Hello world')).toEqual([]);
    expect(scanChordProLine('')).toEqual([]);
  });

  it('finds inline chords with absolute ranges', () => {
    expect(scanChordProLine('[Am]Hello [C]world')).toEqual([
      { from: 0, to: 4, kind: 'chord' },
      { from: 10, to: 13, kind: 'chord' }
    ]);
  });

  it('finds adjacent chords on one word', () => {
    expect(scanChordProLine('[C][G]word')).toEqual([
      { from: 0, to: 3, kind: 'chord' },
      { from: 3, to: 6, kind: 'chord' }
    ]);
  });

  it('finds directives', () => {
    expect(scanChordProLine('{start_of_chorus}')).toEqual([
      { from: 0, to: 17, kind: 'directive' }
    ]);
  });

  it('labels comment directives separately', () => {
    expect(scanChordProLine('{comment: dal vivo}')).toEqual([
      { from: 0, to: 19, kind: 'comment' }
    ]);
  });

  it('mixes chords and directives on one line', () => {
    expect(scanChordProLine('[F]{chorus}')).toEqual([
      { from: 0, to: 3, kind: 'chord' },
      { from: 3, to: 11, kind: 'directive' }
    ]);
  });

  it('keeps brackets inside a directive inside it', () => {
    const tokens = scanChordProLine('{title: [Live] Set}');
    expect(tokens).toEqual([{ from: 0, to: 19, kind: 'directive' }]);
  });

  it('ignores unclosed tokens', () => {
    expect(scanChordProLine('broken [Am and {title:')).toEqual([]);
  });

  it('does not treat a later directive as part of an unclosed chord', () => {
    expect(scanChordProLine('[Am {title: x}')).toEqual([
      { from: 4, to: 14, kind: 'directive' }
    ]);
  });

  it('handles chord-only lines and grid bars', () => {
    expect(scanChordProLine('[C] [G] [Am]')).toEqual([
      { from: 0, to: 3, kind: 'chord' },
      { from: 4, to: 7, kind: 'chord' },
      { from: 8, to: 12, kind: 'chord' }
    ]);
    expect(scanChordProLine('| C . . . |')).toEqual([]);
  });

  it('keeps ranges in ascending order for every token kind', () => {
    const tokens = scanChordProLine('{comment: [x]} [Am] {chorus}');
    expect(tokens.map((token) => token.from)).toEqual(
      [...tokens].map((token) => token.from).sort((a, b) => a - b)
    );
    expect(tokens).toEqual([
      { from: 0, to: 14, kind: 'comment' },
      { from: 15, to: 19, kind: 'chord' },
      { from: 20, to: 28, kind: 'directive' }
    ]);
  });
});
