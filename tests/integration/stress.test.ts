import { describe, expect, it } from 'vitest';
import { parseChordPro } from '../../src/core/chordpro';
import { config } from '../../src/core/config';
import { decideLayout } from '../../src/core/fit';
import { importSong } from '../../src/core/import';
import { transposeDocument } from '../../src/core/transpose';
import { invalidChords } from '../helpers/chords';
import { mulberry32, randomSong } from '../helpers/random';
import { normalizeDocument } from '../helpers/semantic';

const SEEDS = Array.from({ length: 300 }, (_, index) => index + 1);

describe('seeded stress', () => {
  it('keeps parsing, transposition and import invariants on 300 songs', () => {
    for (const seed of SEEDS) {
      const random = mulberry32(seed);
      const source = randomSong(random);
      const doc = parseChordPro(source);

      expect(doc.title, `seed ${seed}`).toContain('Generated');
      expect(invalidChords(doc), `seed ${seed} produced invalid chords`).toEqual([]);

      const delta = Math.floor(random() * 23) - 11;
      const roundTrip = transposeDocument(transposeDocument(doc, delta), -delta);
      expect(normalizeDocument(roundTrip), `seed ${seed} delta ${delta}`).toEqual(
        normalizeDocument(doc)
      );

      const imported = importSong(source);
      expect(imported.chordpro.trim(), `seed ${seed}`).not.toBe('');
      expect(importSong(imported.chordpro).chordpro, `seed ${seed} not idempotent`).toBe(
        imported.chordpro
      );
    }
  });

  it('always terminates in the layout search and respects the font bounds', () => {
    for (let step = 0; step < 100; step += 1) {
      const threshold = config.layout.textPtMin - 1 + step * 0.17;
      const result = decideLayout((params) => params.textPt > threshold, config, {
        columns: 'auto',
        textPt: config.layout.textPtDefault,
        allowGrow: true
      });
      expect(result.attempts).toBeLessThan(100);
      expect(result.params.textPt).toBeGreaterThanOrEqual(config.layout.textPtMin);
      expect(result.params.textPt).toBeLessThanOrEqual(config.layout.textPtMax);
    }
  });
});

const longLine = 'x'.repeat(10_000);
const manyLines = Array.from({ length: 5_000 }, (_, index) => `[C]line ${index}`).join('\n');

const ADVERSARIAL: Array<[string, string]> = [
  ['empty', ''],
  ['whitespace', '   \n\n\t\n'],
  ['BOM + CRLF', '\uFEFF{title: BOM}\r\n[C]line\r\n'],
  ['non-breaking spaces', '{\u00a0title: NBSP}\n[C]\u00a0word'],
  ['zero-width characters', '[C]\u200bword\u200d'],
  ['emoji', '{title: 🎵}\n[C]la la 🎸'],
  ['RTL text', '{title: שלום}\n[C]مرحبا'],
  ['unbalanced braces', '{title: broken\n[C]line'],
  ['unbalanced brackets', '[Am\n{C]line'],
  ['unclosed section', '{start_of_verse}\n[C]line'],
  ['unclosed tab', '{start_of_tab}\ne|--0--'],
  ['invalid capo', '{capo: abc}\n[C]line'],
  ['directive without value', '{title}\n[C]line'],
  ['HTML tags', '<b>{title: Tag}</b>\n[C]line<br>'],
  ['repeat markers', '[Refrão] x2\n[8x]\n[C]line'],
  ['long single line', longLine],
  ['many lines', manyLines]
];

describe('adversarial inputs', () => {
  it.each(ADVERSARIAL)('does not throw on %s', (_name, source) => {
    expect(() => parseChordPro(source)).not.toThrow();
    expect(() => importSong(source)).not.toThrow();
  });
});
