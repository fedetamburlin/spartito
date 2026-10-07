import path from 'node:path';
import { parseChordPro } from '../../../../src/core/chordpro';
import { fileBaseName } from '../../../../src/core/persistence';

export function outputPathFor(outDir: string, source: string, override?: string): string {
  const base = path.resolve(outDir);
  if (override) {
    const target = path.resolve(base, override);
    const relative = path.relative(base, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Output path must be inside ${base}`);
    }
    return target;
  }
  const title = parseChordPro(source).title;
  return path.join(base, `${fileBaseName(title)}.pdf`);
}
