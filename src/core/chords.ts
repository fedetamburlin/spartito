const SUFFIX = /^(?:maj|min|dim|aug|sus|add|no|m|M|°|\+|-|[#b]|\d)*$/i;
const INTL_ROOT = /^[A-G][#b]?/;
const IT_ROOT = /^(?:DO|RE|MI|FA|SOL|LA|SI)[#b]?/;
const BASS = /^(?:[A-G][#b]?|DO|RE|MI|FA|SOL|LA|SI|do|re|mi|fa|sol|la|si)(?:[#b])?$|^\d+$/;
const NO_CHORD = /^(?:N\.?C\.?|N\/C)$/i;
const SEPARATOR = /^(?:\|+|\|?[:.]\|?|:|%|x\d+|\d+x|[（(]\s*\d+\s*[x×]\s*[)）]|\/|,|;|\.{2,}|–|—|-)$/i;

export type ChordSystem = 'intl' | 'it';

export interface SplitChord {
  system: ChordSystem;
  root: string;
  suffix: string;
  bass?: string;
}

export function splitChord(token: string): SplitChord | null {
  if (!token || NO_CHORD.test(token)) return null;

  let body = token;
  let bass: string | undefined;
  const slash = body.lastIndexOf('/');
  if (slash > 0) {
    const candidate = body.slice(slash + 1);
    if (!BASS.test(candidate)) return null;
    bass = candidate;
    body = body.slice(0, slash);
  }

  const intl = INTL_ROOT.exec(body);
  if (intl && SUFFIX.test(body.slice(intl[0].length))) {
    return { system: 'intl', root: intl[0], suffix: body.slice(intl[0].length), bass };
  }

  const it = IT_ROOT.exec(body);
  if (it && SUFFIX.test(body.slice(it[0].length))) {
    return { system: 'it', root: it[0], suffix: body.slice(it[0].length), bass };
  }

  return null;
}

export function isChordToken(token: string): boolean {
  if (!token) return false;
  if (NO_CHORD.test(token)) return true;
  return splitChord(token) !== null;
}

export function isSeparatorToken(token: string): boolean {
  return SEPARATOR.test(token);
}

export interface ChordAt {
  chord: string;
  col: number;
}

export function chordLineTokens(line: string): ChordAt[] | null {
  const tokens: ChordAt[] = [];
  let hasChord = false;
  const re = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line))) {
    const token = match[0];
    if (isChordToken(token)) {
      tokens.push({ chord: token, col: match.index });
      hasChord = true;
    } else if (!isSeparatorToken(token)) {
      return null;
    }
  }
  return hasChord ? tokens : null;
}

interface Word {
  text: string;
  start: number;
  end: number;
  chords: string[];
}

export function mergeChordLine(chordLine: string, lyricLine: string): string {
  const chords = chordLineTokens(chordLine) ?? [];
  const words: Word[] = [];
  const re = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(lyricLine))) {
    words.push({ text: match[0], start: match.index, end: match.index + match[0].length - 1, chords: [] });
  }
  if (words.length === 0) return lyricLine;

  for (const { chord, col } of chords) {
    let target = words.findIndex((word) => col >= word.start && col <= word.end);
    if (target === -1) target = words.findIndex((word) => word.start > col);
    if (target === -1) target = words.length - 1;
    words[target].chords.push(chord);
  }

  return words
    .map((word) => word.chords.map((chord) => `[${chord}]`).join('') + word.text)
    .join(' ');
}
