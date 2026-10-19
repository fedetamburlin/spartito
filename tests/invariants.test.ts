import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { splitChord } from '../src/core/chords';
import { parseChordPro } from '../src/core/chordpro';
import { config } from '../src/core/config';
import { decideLayout } from '../src/core/fit';
import { songTitle, withTitle } from '../src/core/library';
import type { Block, SectionItem, SongDocument } from '../src/core/model';
import { fileBaseName } from '../src/core/persistence';
import { sanitizeSettings } from '../src/core/settings';
import { transposeChord, transposeDocument } from '../src/core/transpose';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (name: string) => readFileSync(join(fixturesDir, name), 'utf8');

/* ------------------------------------------------------------------ *
 * Semantic chord comparison.
 *
 * Exact string round-trips are NOT an invariant of the transposer: a
 * flat chord that lands on a natural note loses its flat preference
 * (Bb +1 -> B, then B -1 -> A#). The contract we can guarantee is the
 * sounding pitch plus the written suffix and bass, so that is what we
 * compare. The known spelling limitation is documented in the README.
 * ------------------------------------------------------------------ */

const NOTE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ITALIAN_PC: Record<string, number> = { DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, SI: 11 };

function pitchClass(note: string): number | null {
  const intl = /^([A-G])([#b]?)$/.exec(note);
  if (intl) {
    const accidental = intl[2] === '#' ? 1 : intl[2] === 'b' ? -1 : 0;
    return (NOTE_PC[intl[1]] + accidental + 12) % 12;
  }
  const it = /^(DO|RE|MI|FA|SOL|LA|SI)([#b]?)$/i.exec(note);
  if (it) {
    const accidental = it[2] === '#' ? 1 : it[2] === 'b' ? -1 : 0;
    return (ITALIAN_PC[it[1].toUpperCase()] + accidental + 12) % 12;
  }
  return null;
}

function semanticChord(chord: string): unknown {
  const parts = splitChord(chord);
  if (!parts) return chord;
  return {
    system: parts.system,
    root: pitchClass(parts.root),
    suffix: parts.suffix,
    bass: parts.bass === undefined ? undefined : pitchClass(parts.bass)
  };
}

function normalizeItem(item: SectionItem): unknown {
  if (item.kind === 'line') {
    return {
      ...item,
      words: item.words.map((word) => ({
        text: word.text,
        chords: word.chords.map(semanticChord)
      }))
    };
  }
  if (item.kind === 'grid') {
    return { ...item, chords: item.chords.map(semanticChord) };
  }
  if (item.kind === 'grid-block') {
    return {
      ...item,
      rows: item.rows.map((row) =>
        row.map((token) =>
          token.kind === 'chord' ? { ...token, chord: semanticChord(token.chord) } : token
        )
      )
    };
  }
  return item;
}

function normalizeBlock(block: Block): unknown {
  if (block.kind !== 'section') return block;
  return { ...block, items: block.items.map(normalizeItem) };
}

function normalizeDocument(doc: SongDocument): unknown {
  return {
    title: doc.title,
    subtitle: doc.subtitle,
    capo: doc.capo,
    blocks: doc.blocks.map(normalizeBlock)
  };
}

const FIXTURES = ['complete.cho', 'edge.cho', 'grid.cho', 'minimal.cho', 'tab.cho', 'unknown.cho'];

describe('transpose invariants', () => {
  it.each(FIXTURES)('%s survives a +n / -n round-trip', (file) => {
    const doc = parseChordPro(load(file));
    for (let delta = -11; delta <= 11; delta += 1) {
      const there = transposeDocument(doc, delta);
      const back = transposeDocument(there, -delta);
      expect(normalizeDocument(back), `delta ${delta}`).toEqual(normalizeDocument(doc));
    }
  });

  const CHORDS = [
    'C', 'Cm', 'C7', 'Cmaj7', 'Cm7b5', 'C/G', 'F#m', 'Bb', 'G7+', 'Dsus4',
    'A7sus4', 'Cadd9', 'E5', 'N.C.', 'DO', 'MIm', 'LAm7', 'DO7+', 'MIm/RE',
    'SI7', 'SOL', 'LAm6', 'AMaj7', 'CSus4', 'Dadd4/F#', 'G#dim'
  ];

  it.each(CHORDS)('%s keeps its sounding pitch across +n / -n', (chord) => {
    for (let delta = -11; delta <= 11; delta += 1) {
      const back = transposeChord(transposeChord(chord, delta), -delta);
      expect(semanticChord(back), `delta ${delta}`).toEqual(semanticChord(chord));
    }
  });

  it('keeps the notation system of every chord', () => {
    expect(splitChord(transposeChord('MIm', 2))?.system).toBe('it');
    expect(splitChord(transposeChord('LAm7', -3))?.system).toBe('it');
    expect(splitChord(transposeChord('F#m', 1))?.system).toBe('intl');
    expect(transposeChord('N.C.', 5)).toBe('N.C.');
    expect(transposeChord('not-a-chord', 5)).toBe('not-a-chord');
  });

  it('returns the same document for a zero delta', () => {
    const doc = parseChordPro(load('complete.cho'));
    expect(transposeDocument(doc, 0)).toBe(doc);
  });
});

describe('settings invariants', () => {
  const cases = [
    {},
    { textPt: config.layout.textPtMax + 10 },
    { textPt: config.layout.textPtMin - 10 },
    { textPt: Number.NaN },
    { textPt: Number.POSITIVE_INFINITY },
    { marginsMm: 999 },
    { marginsMm: Number.NaN },
    { transpose: 99 },
    { transpose: Number.NEGATIVE_INFINITY },
    { columns: 3 as unknown as 1 },
    { fontId: 'does-not-exist' }
  ];

  it.each(cases)('sanitizes then stays stable (%o)', (partial) => {
    const once = sanitizeSettings(partial as never);
    const twice = sanitizeSettings(once);
    expect(twice).toEqual(once);
    expect(Number.isFinite(once.textPt)).toBe(true);
    expect(Number.isFinite(once.marginsMm)).toBe(true);
    expect(Number.isFinite(once.transpose)).toBe(true);
  });

  it('clamps every numeric setting into its documented range', () => {
    const settings = sanitizeSettings({
      textPt: 1,
      marginsMm: 100,
      transpose: -99
    });
    expect(settings.textPt).toBe(config.layout.textPtMin);
    expect(settings.marginsMm).toBe(config.page.marginsMaxMm);
    expect(settings.transpose).toBe(-11);
  });

  it('falls back to a known font', () => {
    const settings = sanitizeSettings({ fontId: 'nope' });
    expect(config.typography.fonts.some((font) => font.id === settings.fontId)).toBe(true);
  });
});

describe('fit invariants', () => {
  const maxPt = config.layout.textPtMax;
  const minPt = config.layout.textPtMin;
  const thresholds: number[] = [];
  for (let pt = minPt - 0.5; pt <= maxPt + 0.5; pt += 0.5) thresholds.push(pt);

  it.each(thresholds)('picks the largest size that fits (threshold %spt)', (threshold) => {
    const measure = (params: { textPt: number }) => params.textPt > threshold;
    const result = decideLayout(measure, config, {
      columns: 1,
      textPt: config.layout.textPtDefault,
      allowGrow: true
    });
    if (threshold < minPt) {
      expect(result.status).toBe('overflow');
      expect(result.params.textPt).toBe(minPt);
      return;
    }
    const expected = Math.min(config.layout.textPtMax, threshold);
    expect(result.params.textPt).toBe(expected);
  });

  it('never grows past textPtMax', () => {
    const result = decideLayout(() => false, config, {
      columns: 1,
      textPt: config.layout.textPtDefault,
      allowGrow: true
    });
    expect(result.params.textPt).toBe(config.layout.textPtMax);
  });

  it('keeps the old behaviour when growth is disabled', () => {
    const result = decideLayout(() => false, config, { columns: 1, textPt: config.layout.textPtDefault });
    expect(result.status).toBe('fits');
    expect(result.params.textPt).toBe(config.layout.textPtDefault);
    expect(result.attempts).toBe(1);
  });
});

describe('title invariants', () => {
  const titles = ['Simple', 'Con {graffe}', 'Spazi  doppi', 'Città con accenti', '日本語', 'A/B'];

  it.each(titles)('withTitle / songTitle round-trips %s', (title) => {
    expect(songTitle(withTitle('{title: Old}\n\n[Am]body', title))).toBe(title);
  });

  it('adds a title to a source that has none', () => {
    expect(withTitle('[Am]body', 'New')).toBe('{title: New}\n\n[Am]body');
    expect(withTitle('', 'New')).toBe('{title: New}\n');
  });
});

describe('fileBaseName', () => {
  const cases: Array<[string, string]> = [
    ['Città di notte', 'citta-di-notte'],
    ['AC/DC', 'ac-dc'],
    ['../etc/passwd', 'etc-passwd'],
    ['Canzone (live) [2024]', 'canzone-live-2024'],
    ['---', 'song'],
    ['🎵', 'song'],
    ['', 'song'],
    ['ÀÈÌÒÙ', 'aeiou'],
    ['Già   visto', 'gia-visto']
  ];

  it.each(cases)('%s -> %s', (title, expected) => {
    expect(fileBaseName(title)).toBe(expected);
  });
});
