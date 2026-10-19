import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path to tests/fixtures, independent of the spec location. */
export const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

export function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

export function loadFixtureBuffer(name: string): ArrayBuffer {
  const file = readFileSync(join(fixturesDir, name));
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
}
