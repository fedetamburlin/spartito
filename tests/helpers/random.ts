/**
 * Deterministic generator for stress tests. The seed makes failures
 * reproducible; the vocabulary is invented, so no third-party content.
 */

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const CHORDS = [
  'C',
  'Am',
  'F',
  'G',
  'Dm',
  'Em',
  'G7',
  'Cmaj7',
  'F#m',
  'Bb',
  'C/G',
  'Dsus4',
  'MIm',
  'LAm7'
];
const WORDS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota'];
const SECTIONS = ['verse', 'chorus', 'bridge'];

function pick<T>(random: () => number, values: T[]): T {
  return values[Math.floor(random() * values.length)];
}

function lyricLine(random: () => number): string {
  const words = Array.from({ length: 3 + Math.floor(random() * 4) }, () => pick(random, WORDS));
  return words
    .map((word) => (random() < 0.45 ? `[${pick(random, CHORDS)}]${word}` : word))
    .join(' ');
}

function chordLine(random: () => number): string {
  return Array.from(
    { length: 2 + Math.floor(random() * 3) },
    () => `[${pick(random, CHORDS)}]`
  ).join(' ');
}

export function randomSong(random: () => number): string {
  const lines: string[] = [];
  const title = `Generated ${Math.floor(random() * 1000)}`;
  lines.push(`{title: ${title}}`);

  if (random() < 0.5) lines.push(`{subtitle: Test ${Math.floor(random() * 100)}}`);
  if (random() < 0.4) lines.push(`{capo: ${Math.floor(random() * 8)}}`);

  const sectionCount = 1 + Math.floor(random() * 4);
  for (let s = 0; s < sectionCount; s += 1) {
    const type = pick(random, SECTIONS);
    const explicit = random() < 0.7;
    const label = random() < 0.3 ? `: ${type} ${s + 1}` : '';
    if (explicit) lines.push(`{start_of_${type}${label}}`);

    const itemCount = 2 + Math.floor(random() * 5);
    for (let i = 0; i < itemCount; i += 1) {
      const roll = random();
      if (roll < 0.15) lines.push('');
      else if (roll < 0.3) lines.push(chordLine(random));
      else if (roll < 0.38) lines.push(`{comment: note ${i}}`);
      else if (roll < 0.44) lines.push('{chorus}');
      else if (roll < 0.48) {
        lines.push('{start_of_tab}');
        lines.push('e|--0--1--0--|');
        lines.push('{end_of_tab}');
      } else if (roll < 0.52) {
        lines.push('{start_of_grid}');
        lines.push('| C . . . | G . . . |');
        lines.push('{end_of_grid}');
      } else lines.push(lyricLine(random));
    }

    if (explicit) lines.push(`{end_of_${type}}`);
    if (random() < 0.4) lines.push('');
  }

  return lines.join('\n');
}
