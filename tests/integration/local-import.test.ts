import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseChordPro } from '../../src/core/chordpro';
import { importSong } from '../../src/core/import';
import { invalidChords } from '../helpers/chords';
import { fixturesDir } from '../helpers/fixtures';

/**
 * Real Ultimate Guitar pages, downloaded locally by
 * `node scripts/fetch-fixtures.mjs`.
 *
 * The files are copyrighted and gitignored: this suite only runs when the
 * corpus is present, and CI skips it. Assertions are structural (title,
 * capo, sections, chord validity, idempotence, word retention), never
 * comparisons of the lyrics themselves.
 */

const corpusDir = join(fixturesDir, 'local/ug');
const manifestPath = join(fixturesDir, 'local/manifest.json');

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
const MIN_WORD_RETENTION = 0.65;

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

describe.skipIf(files.length === 0)('local Ultimate Guitar corpus (copyrighted, not in git)', () => {
  it('has every listed sample, so the corpus is complete', () => {
    expect(files.sort()).toEqual(sources.map((source) => `${source.slug}.txt`).sort());
  });

  it.each(sources)('$slug imports cleanly and stably', (source) => {
    const raw = readFileSync(join(corpusDir, `${source.slug}.txt`), 'utf8');
    const result = importSong(raw);
    const doc = parseChordPro(result.chordpro);
    const expected = source.expect ?? {};

    for (const marker of LEFTOVER_MARKUP) {
      expect(result.chordpro, `${source.slug} still contains ${marker}`).not.toContain(marker);
    }
    expect(result.chordpro, `${source.slug} contains pagination noise`).not.toMatch(
      /^Page\s+\d+\s*\/\s*\d+$/m
    );
    expect(result.chordpro.trim(), `${source.slug} imported nothing`).not.toBe('');

    expect(result.stats.merged, `${source.slug} merged too few chord lines`).toBeGreaterThanOrEqual(
      expected.minMerged ?? 0
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

    expect(invalidChords(doc), `${source.slug} produced invalid chords`).toEqual([]);

    const starts = (result.chordpro.match(/\{start_of_/g) ?? []).length;
    const ends = (result.chordpro.match(/\{end_of_/g) ?? []).length;
    expect(starts, `${source.slug} has unbalanced sections`).toBe(ends);

    const secondPass = importSong(result.chordpro).chordpro;
    expect(secondPass, `${source.slug} is not idempotent`).toBe(result.chordpro);

    const rawWords = wordCount(
      raw.replace(/\[ch\]|\[\/ch\]|\[tab\]|\[\/tab\]|<ch>|<\/ch>/gi, ' ')
    );
    const retention = wordCount(result.chordpro) / Math.max(1, rawWords);
    expect(retention, `${source.slug} lost too much content`).toBeGreaterThanOrEqual(
      MIN_WORD_RETENTION
    );
  });

  it.skipIf(!existsSync(manifestPath))('matches the download manifest checksums', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      files: Array<{ path: string; sha256: string }>;
    };
    for (const entry of manifest.files) {
      if (!entry.path.startsWith('ug/')) continue;
      const data = readFileSync(join(fixturesDir, 'local', entry.path));
      const digest = createHash('sha256').update(data).digest('hex');
      expect(digest, `${entry.path} changed since download`).toBe(entry.sha256);
    }
  });
});
