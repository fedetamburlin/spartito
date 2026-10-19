import { describe, expect, it } from 'vitest';
import { chordLineTokens, isChordToken, mergeChordLine } from '../../src/core/chords';
import { importSong } from '../../src/core/import';
import { parseChordPro } from '../../src/core/chordpro';
import type { Section } from '../../src/core/model';
import { loadFixture } from '../helpers/fixtures';

describe('chord grammar', () => {
  it('recognizes international and Italian chords', () => {
    const chords = [
      'C', 'Cm', 'C7', 'Cmaj7', 'Cm7b5', 'C/G', 'F#m', 'Bb',
      'G7+', 'Dsus4', 'A7sus4', 'Cadd9', 'E5', 'N.C.',
      'DO', 'MIm', 'LAm7', 'DO7+', 'MIm/RE', 'SI7', 'SOL', 'LAm6'
    ];
    for (const chord of chords) {
      expect(isChordToken(chord), chord).toBe(true);
    }
  });

  it('accepts mixed-case qualities', () => {
    for (const chord of ['AMaj7', 'CSus4', 'FMin7', 'Bsus2', 'CMIN7', 'EMaj9']) {
      expect(isChordToken(chord), chord).toBe(true);
    }
  });

  it('rejects words and lyrics', () => {
    for (const word of ['Dove', 'Walking', 'home', 'Ciao', 'Hello', 'ove', 'mi', 'la']) {
      expect(isChordToken(word), word).toBe(false);
    }
  });

  it('tells chord-only lines from lyric lines', () => {
    expect(chordLineTokens('Am   F   |  C  (2x)')).not.toBeNull();
    expect(chordLineTokens('MIm   LAm7')).not.toBeNull();
    expect(chordLineTokens('Walking down the road')).toBeNull();
    expect(chordLineTokens('Dove cammino senza fretta')).toBeNull();
  });

  it('aligns chords to the right word', () => {
    expect(mergeChordLine('C        G', 'Walking home tonight')).toBe(
      '[C]Walking [G]home tonight'
    );
    expect(mergeChordLine('      LAm6       SI7        MIm', 'il ricordo di una estate')).toBe(
      'il [LAm6]ricordo di una [SI7][MIm]estate'
    );
  });
});

describe('importSong', () => {
  it('converts the current UG [tab]/[ch] line wrapper format', () => {
    const result = importSong(
      [
        '[tab][ch]Em[/ch]            [ch]G[/ch][/tab]',
        '[tab]  Today is gonna be the day[/tab]',
        '[tab][ch]D[/ch]                [ch]A[/ch][/tab]',
        '[tab]  That they will throw it back to you[/tab]'
      ].join('\n')
    );
    expect(result.stats.merged).toBe(2);
    expect(result.stats.tabs).toBe(0);
    expect(result.chordpro).toContain('[Em]Today');
    expect(result.chordpro).not.toContain('[ch]');
    expect(result.chordpro).not.toContain('[tab]');
  });

  it('reads Song/Artist metadata from the pasted page', () => {
    const result = importSong(
      [
        'Song: My Fake Song',
        'Artist: The Fake Band',
        'Composer: Someone Else',
        'Album: Fake Album',
        'CAPO: 3rd fret',
        '',
        '[Verse]',
        '[ch]Am[/ch]Walking down the empty road'
      ].join('\n')
    );
    const doc = parseChordPro(result.chordpro);
    expect(doc.title).toBe('My Fake Song');
    expect(doc.subtitle).toBe('The Fake Band');
    expect(doc.capo).toBe(3);
    expect(result.chordpro).toContain('{comment: Composer: Someone Else}');
  });

  it('recognizes common capo spellings', () => {
    const cases: Array<[string, number]> = [
      ['CAPO: 3rd fret', 3],
      ['Capo 2nd fret', 2],
      ['Capo: III', 3],
      ['Recommend Capo Fret 2', 2],
      ['Capo III for original key or to play along at https://example.com', 3],
      ['Capo: 5th fret', 5]
    ];
    for (const [line, capo] of cases) {
      const result = importSong(`{title: T}\n${line}\n[Am]hello`);
      expect(parseChordPro(result.chordpro).capo, line).toBe(capo);
    }
  });

  it('keeps genuine multi-line tablature as a tab block', () => {
    const result = importSong(
      ['[Verse]', '[tab]', 'e|--0--1--0--|', 'B|--1--1--1--|', '[/tab]'].join('\n')
    );
    expect(result.stats.tabs).toBe(1);
    expect(result.chordpro).toContain('{start_of_tab}');
    expect(result.chordpro).toContain('e|--0--1--0--|');
  });

  it('treats a chord/lyric [tab] block as text, not tablature', () => {
    const result = importSong(
      ['[tab][ch]C[/ch]   [ch]G[/ch]', 'Sing it loud and clear[/tab]'].join('\n')
    );
    expect(result.stats.tabs).toBe(0);
    expect(result.stats.merged).toBe(1);
    expect(result.chordpro).not.toContain('{start_of_tab}');
  });

  it('converts an Ultimate Guitar style copy-paste', () => {
    const result = importSong(loadFixture('import-ug.txt'));
    expect(result.chordpro).toContain('{start_of_verse: Verse 1}');
    expect(result.chordpro).toContain('{start_of_chorus}');
    expect(result.chordpro).toContain('[Am]Walking down the empty road');
    expect(result.chordpro).toContain('[C]Sing it loud [G]sing it clear');
    expect(result.chordpro).toContain('{capo: 2}');
    expect(result.chordpro).toContain('{start_of_tab}');
    expect(result.chordpro).toContain('e|--0--1--0--|');
    expect(result.chordpro).toContain('{end_of_tab}');
    expect(result.chordpro).not.toContain('[tab]');
    expect(result.stats.tabs).toBe(1);
    expect(result.warnings.some((warning) => warning.includes('tab block'))).toBe(true);
  });

  it('converts chords above lyrics (international notation)', () => {
    const result = importSong(loadFixture('import-above.txt'));
    expect(result.chordpro).toContain('{start_of_verse: Intro}');
    expect(result.chordpro).toContain('[C] [G] [Am] [F]');
    expect(result.chordpro).toContain('[C]Walking [G]home tonight');
    expect(result.chordpro).toContain('[Am]Singing [F]in the rain');
    expect(result.stats.merged).toBe(2);
    expect(result.stats.grids).toBe(1);
  });

  it('converts chords above lyrics (Italian notation)', () => {
    const result = importSong(loadFixture('import-it-above.txt'));
    expect(result.chordpro).toContain('[MIm]Dove cammino senza [LAm7]fretta');
    expect(result.chordpro).toContain('il [LAm6]ricordo di una [SI7][MIm]estate');
    expect(result.stats.merged).toBe(2);
  });

  it('passes valid ChordPro through unchanged', () => {
    const result = importSong('{title: X}\n[Am]Ciao [F]mondo\n');
    expect(result.chordpro).toContain('{title: X}');
    expect(result.chordpro).toContain('[Am]Ciao [F]mondo');
    expect(result.warnings).toHaveLength(0);
  });

  it('warns when no chords are found', () => {
    const result = importSong('Ciao mondo\ncome stai\n');
    expect(result.warnings.some((warning) => warning.includes('No chords'))).toBe(true);
  });

  it('recognizes headers with unmatched brackets and drops noise', () => {
    const result = importSong('Intro]\nC  G\nWalking home\n\nPage 1/2\n');
    expect(result.chordpro).toContain('{start_of_verse: Intro}');
    expect(result.chordpro).not.toContain('Page 1/2');
  });

  it('converts a real page (Intro], AMaj7, pagination, chord clusters)', () => {
    const result = importSong(loadFixture('import-real-shape.txt'));
    expect(result.chordpro).toContain('{start_of_verse: Intro}');
    expect(result.chordpro).toContain('{start_of_chorus}');
    expect(result.chordpro).toContain('[Em]Walking down the open [D]road tonight');
    expect(result.chordpro).toContain('[E]In the middle there [AMaj7]is all the rest');
    expect(result.chordpro).toContain('{start_of_verse: Outro}');
    expect(result.chordpro).toContain('[Em] [D] [Am7] [Cadd9]');
    expect(result.chordpro).not.toContain('Page 1/2');
    expect(result.chordpro).not.toContain('E                    AMaj7');
    expect(result.stats.sections).toBe(4);
  });

  it('treats bracketed annotations as comments', () => {
    const result = importSong(loadFixture('import-annotations.txt'));
    expect(result.chordpro).toContain('[G] [D] [Am7]');
    expect(result.chordpro).toContain('{comment: (instrumental)}');
    expect(result.chordpro).toContain('{comment: (quick fade)}');
    expect(result.chordpro).not.toContain('[Am7](instrumental)');
    expect(result.chordpro).toContain('[G]La [D]la, [C]la-la');
    expect(result.stats.comments).toBe(2);
  });

  it('recognizes title, artist and capo; drops year and decorations', () => {
    const result = importSong(loadFixture('import-ug-header.txt'));
    expect(result.chordpro).toContain('{title: My Fake Song}');
    expect(result.chordpro).toContain('{subtitle: The Fake Band}');
    expect(result.chordpro).toContain('{capo: 3}');
    expect(result.chordpro).toContain('{start_of_verse: Intro}');
    expect(result.chordpro).toContain('[C] [G]');
    expect(result.chordpro).toContain('[C]La la la [G]la tonight');
    expect(result.chordpro).not.toContain('Fake Album');
    expect(result.chordpro).not.toContain('——');
    expect(result.chordpro).not.toContain('Chords');
  });

  it('produces ChordPro readable by the parser', () => {
    for (const fixture of ['import-ug.txt', 'import-above.txt', 'import-it-above.txt']) {
      const { chordpro } = importSong(loadFixture(fixture));
      const doc = parseChordPro(chordpro);
      expect(doc.blocks.length, fixture).toBeGreaterThan(0);
      const sections = doc.blocks.filter((block): block is Section => block.kind === 'section');
      expect(sections.length, fixture).toBeGreaterThan(0);
    }
  });
});
