import path from 'node:path';
import { parseChordPro } from '../../../../src/core/chordpro';
import { fileBaseName } from '../../../../src/core/persistence';

export function outputPathFor(outDir: string, source: string, override?: string): string {
  if (override) return path.resolve(override);
  const title = parseChordPro(source).title;
  return path.resolve(outDir, `${fileBaseName(title)}.pdf`);
}
