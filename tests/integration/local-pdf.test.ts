import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importSong } from '../../src/core/import';
import { extractPdfText } from '../../src/core/pdf';
import { fixturesDir } from '../helpers/fixtures';

/**
 * Real PDFs downloaded by `node scripts/fetch-fixtures.mjs`.
 * Local-only because two of them are copyrighted; the public-domain
 * ones are still kept out of git to keep the suite's provenance policy
 * uniform. Assertions are structural: pages, text layer, import result.
 */

const pdfDir = join(fixturesDir, 'local/pdf');
const manifestPath = join(fixturesDir, 'local/manifest.json');

interface PdfSource {
  slug: string;
  url: string;
  origin: string;
  license: string;
  expect: { pages: number; hasText: boolean; minMerged: number };
}

const sources: PdfSource[] = JSON.parse(readFileSync(join(fixturesDir, 'pdf-sources.json'), 'utf8'));
const files = existsSync(pdfDir) ? readdirSync(pdfDir).filter((file) => file.endsWith('.pdf')) : [];

describe.skipIf(files.length === 0)('local PDF corpus (downloaded, not in git)', () => {
  it('has every listed PDF', () => {
    expect(files.sort()).toEqual(sources.map((source) => `${source.slug}.pdf`).sort());
  });

  it.each(sources)('$slug extracts and imports', async (source) => {
    const file = readFileSync(join(pdfDir, `${source.slug}.pdf`));
    const buffer = file.buffer.slice(
      file.byteOffset,
      file.byteOffset + file.byteLength
    ) as ArrayBuffer;
    const extracted = await extractPdfText(buffer);

    expect(extracted.pages).toBe(source.expect.pages);
    expect(extracted.hasText).toBe(source.expect.hasText);
    expect(extracted.text.trim().length).toBeGreaterThan(0);

    const result = importSong(extracted.text);
    expect(result.chordpro.trim()).not.toBe('');
    expect(result.stats.merged).toBeGreaterThanOrEqual(source.expect.minMerged);
  });

  it.skipIf(!existsSync(manifestPath))('matches the download manifest checksums', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      files: Array<{ path: string; sha256: string }>;
    };
    for (const entry of manifest.files) {
      if (!entry.path.startsWith('pdf/')) continue;
      const data = readFileSync(join(fixturesDir, 'local', entry.path));
      const digest = createHash('sha256').update(data).digest('hex');
      expect(digest, `${entry.path} changed since download`).toBe(entry.sha256);
    }
  });
});
