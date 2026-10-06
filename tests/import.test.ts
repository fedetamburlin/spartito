import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chordLineTokens, isChordToken, mergeChordLine } from '../src/core/chords';
import { importSong } from '../src/core/import';
import { parseChordPro } from '../src/core/chordpro';
import type { Section } from '../src/core/model';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (name: string) => readFileSync(join(fixturesDir, name), 'utf8');

describe('grammatica degli accordi', () => {
  it('riconosce accordi internazionali e italiani', () => {
    const chords = [
      'C', 'Cm', 'C7', 'Cmaj7', 'Cm7b5', 'C/G', 'F#m', 'Bb',
      'G7+', 'Dsus4', 'A7sus4', 'Cadd9', 'E5', 'N.C.',
      'DO', 'MIm', 'LAm7', 'DO7+', 'MIm/RE', 'SI7', 'SOL', 'LAm6'
    ];
    for (const chord of chords) {
      expect(isChordToken(chord), chord).toBe(true);
    }
  });

  it('accetta qualità con maiuscole miste', () => {
    for (const chord of ['AMaj7', 'CSus4', 'FMin7', 'Bsus2', 'CMIN7', 'EMaj9']) {
      expect(isChordToken(chord), chord).toBe(true);
    }
  });

  it('rifiuta parole e testo', () => {
    for (const word of ['Dove', 'Walking', 'home', 'Ciao', 'Hello', 'ove', 'mi', 'la']) {
      expect(isChordToken(word), word).toBe(false);
    }
  });

  it('distingue righe di soli accordi da righe di testo', () => {
    expect(chordLineTokens('Am   F   |  C  (2x)')).not.toBeNull();
    expect(chordLineTokens('MIm   LAm7')).not.toBeNull();
    expect(chordLineTokens('Walking down the road')).toBeNull();
    expect(chordLineTokens('Dove cammino senza fretta')).toBeNull();
  });

  it('allinea gli accordi alla parola giusta', () => {
    expect(mergeChordLine('C        G', 'Walking home tonight')).toBe(
      '[C]Walking [G]home tonight'
    );
    expect(mergeChordLine('      LAm6       SI7        MIm', 'il ricordo di una estate')).toBe(
      'il [LAm6]ricordo di una [SI7][MIm]estate'
    );
  });
});

describe('importSong', () => {
  it('converte un copia-incolla in stile Ultimate Guitar', () => {
    const result = importSong(load('import-ug.txt'));
    expect(result.chordpro).toContain('{start_of_verse: Verse 1}');
    expect(result.chordpro).toContain('{start_of_chorus}');
    expect(result.chordpro).toContain('[Am]Walking down the empty road');
    expect(result.chordpro).toContain('[C]Sing it loud [G]sing it clear');
    expect(result.chordpro).toContain('{comment: Capo: 2}');
    expect(result.chordpro).not.toContain('[tab]');
    expect(result.warnings.some((warning) => warning.includes('tablatura'))).toBe(true);
  });

  it('converte accordi sopra il testo (notazione internazionale)', () => {
    const result = importSong(load('import-above.txt'));
    expect(result.chordpro).toContain('{start_of_verse: Intro}');
    expect(result.chordpro).toContain('[C] [G] [Am] [F]');
    expect(result.chordpro).toContain('[C]Walking [G]home tonight');
    expect(result.chordpro).toContain('[Am]Singing [F]in the rain');
    expect(result.stats.merged).toBe(2);
    expect(result.stats.grids).toBe(1);
  });

  it('converte accordi sopra il testo (notazione italiana)', () => {
    const result = importSong(load('import-it-above.txt'));
    expect(result.chordpro).toContain('[MIm]Dove cammino senza [LAm7]fretta');
    expect(result.chordpro).toContain('il [LAm6]ricordo di una [SI7][MIm]estate');
    expect(result.stats.merged).toBe(2);
  });

  it('lascia passare il ChordPro già valido', () => {
    const result = importSong('{title: X}\n[Am]Ciao [F]mondo\n');
    expect(result.chordpro).toContain('{title: X}');
    expect(result.chordpro).toContain('[Am]Ciao [F]mondo');
    expect(result.warnings).toHaveLength(0);
  });

  it('segnala quando non trova accordi', () => {
    const result = importSong('Ciao mondo\ncome stai\n');
    expect(result.warnings.some((warning) => warning.includes('Nessun accordo'))).toBe(true);
  });

  it('riconosce intestazioni con parentesi spaiate e scarta il rumore', () => {
    const result = importSong('Intro]\nC  G\nWalking home\n\nPage 1/2\n');
    expect(result.chordpro).toContain('{start_of_verse: Intro}');
    expect(result.chordpro).not.toContain('Page 1/2');
  });

  it('converte una pagina reale (Intro], AMaj7, paginazione, cluster di accordi)', () => {
    const result = importSong(load('import-real-shape.txt'));
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

  it('tratta le annotazioni tra parentesi come commenti', () => {
    const result = importSong(load('import-annotations.txt'));
    expect(result.chordpro).toContain('[G] [D] [Am7]');
    expect(result.chordpro).toContain('{comment: (instrumental)}');
    expect(result.chordpro).toContain('{comment: (quick fade)}');
    expect(result.chordpro).not.toContain('[Am7](instrumental)');
    expect(result.chordpro).toContain('[G]La [D]la, [C]la-la');
    expect(result.stats.comments).toBe(2);
  });

  it('riconosce titolo, artista e capo; scarta anno e decorazioni', () => {
    const result = importSong(load('import-ug-header.txt'));
    expect(result.chordpro).toContain('{title: My Fake Song}');
    expect(result.chordpro).toContain('{subtitle: The Fake Band}');
    expect(result.chordpro).toContain('{comment: capo at III}');
    expect(result.chordpro).toContain('{start_of_verse: Intro}');
    expect(result.chordpro).toContain('[C] [G]');
    expect(result.chordpro).toContain('[C]La la la [G]la tonight');
    expect(result.chordpro).not.toContain('Fake Album');
    expect(result.chordpro).not.toContain('——');
    expect(result.chordpro).not.toContain('Chords');
  });

  it('produce ChordPro rileggibile dal parser', () => {
    for (const fixture of ['import-ug.txt', 'import-above.txt', 'import-it-above.txt']) {
      const { chordpro } = importSong(load(fixture));
      const doc = parseChordPro(chordpro);
      expect(doc.blocks.length, fixture).toBeGreaterThan(0);
      const sections = doc.blocks.filter((block): block is Section => block.kind === 'section');
      expect(sections.length, fixture).toBeGreaterThan(0);
    }
  });
});
