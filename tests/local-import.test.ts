import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseChordPro } from '../src/core/chordpro';
import { importSong } from '../src/core/import';

/**
 * Real Ultimate Guitar pages, downloaded locally by
 * `node tools/fetch-ug-fixtures.mjs`.
 *
 * The files are copyrighted and gitignored: this suite only runs when the
 * corpus is present, and CI skips it. What we assert here is structural
 * (title, capo, sections, no leftover markup), never the lyrics.
 */

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const corpusDir = join(fixturesDir, 'local/ug');

interface Expectation {
  title?: string;
  subtitle?: string;
  capo?: number;
  minMerged?: number;
  minSections?: number;
  minTabs?: number;
}

interface Source {
  slug: string;
  title: string;
  artist: string;
  url: string;
  expect?: Expectation;
}

const sources: Source[] = JSON.parse(readFileSync(join(fixturesDir, 'ug-sources.json'), 'utf8'));
const files = existsSync(corpusDir)
  ? readdirSync(corpusDir).filter((file) => file.endsWith('.txt'))
  : [];

const LEFTOVER_MARKUP = ['[ch]', '[/ch]', '[tab]', '[/tab]', '<ch>', '</ch>'];

describe.skipIf(files.length === 0)('local Ultimate Guitar corpus (copyrighted, not in git)', () => {
  it('has every listed sample, so the corpus is complete', () => {
    expect(files.sort()).toEqual(sources.map((source) => `${source.slug}.txt`).sort());
  });

  it.each(sources)('$slug imports cleanly', (source) => {
    const raw = readFileSync(join(corpusDir, `${source.slug}.txt`), 'utf8');
    const result = importSong(raw);
    const doc = parseChordPro(result.chordpro);
    const expected = source.expect ?? {};

    for (const marker of LEFTOVER_MARKUP) {
      expect(result.chordpro, `${source.slug} still contains ${marker}`).not.toContain(marker);
    }
    expect(result.chordpro, `${source.slug} contains pagination noise`).not.toMatch(
      /^Page \d+\s*\/\s*\d+$/m
    );
    expect(result.chordpro.trim(), `${source.slug} imported nothing`).not.toBe('');
    expect(result.stats.merged, `${source.slug} merged too few chord lines`).toBeGreaterThanOrEqual(
      expected.minMerged ?? 1
    );

    if (expected.title !== undefined) expect(doc.title).toBe(expected.title);
    if (expected.subtitle !== undefined) expect(doc.subtitle).toBe(expected.subtitle);
    if (expected.capo !== undefined) expect(doc.capo).toBe(expected.capo);
    if (expected.minSections !== undefined) {
      expect(result.stats.sections).toBeGreaterThanOrEqual(expected.minSections);
    }
    if (expected.minTabs !== undefined) {
      expect(result.stats.tabs).toBeGreaterThanOrEqual(expected.minTabs);
    }
  });
});
