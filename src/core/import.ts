import importDefaults from '../../config/import.json';
import { parseCapoValue } from './chordpro';
import { chordLineTokens, isChordToken, mergeChordLine } from './chords';
import { BLOCK_DIRECTIVES } from './directives';

const SECTION_MAP = importDefaults.sections as Record<string, 'verse' | 'chorus' | 'bridge'>;
const METADATA = new Set(importDefaults.metadata.map((label) => label.toLowerCase()));
const NOISE = ((importDefaults.noise ?? []) as string[]).map((pattern) => new RegExp(pattern, 'i'));
const METADATA_RE = new RegExp(`^(${[...METADATA].join('|')})\\b\\s*[:=]\\s*(.+)`, 'i');
const TITLE_MARKERS = ((importDefaults.titleMarkers ?? []) as string[]).map((marker) =>
  marker.toLowerCase()
);
const LOOSE_METADATA = ((importDefaults.metadataLoose ?? []) as string[]).map((label) =>
  label.toLowerCase()
);
const LOOSE_METADATA_RE = LOOSE_METADATA.length
  ? new RegExp(`^(?:${LOOSE_METADATA.join('|')})\\b`, 'i')
  : /$^/;
const TITLE_LABELS = new Set(['song', 'title', 'titolo']);
const ARTIST_LABELS = new Set(['artist', 'artista']);

const DIRECTIVE_RE = /^\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*(?::[\s\S]*?)?\}$/;
const BRACKET_HEADER_RE = /^\[([^\]]+)\]$/;
const BRACKET_HEADER_WITH_MARKER_RE =
  /^\[([^\]]+)\]\s*(?:x\s*\d+|\d+\s*x|\(\s*\d+\s*x\s*\)|\(\s*x\s*\d+\s*\)|\[\s*x\s*\d+\s*\])$/i;
const INLINE_CHORD_RE = /\[([^\]]+)\]/g;
const ANNOTATION_RE = /^\([^)]*\)$/;

export interface ImportStats {
  merged: number;
  grids: number;
  sections: number;
  comments: number;
  tabs: number;
}

export interface ImportResult {
  chordpro: string;
  warnings: string[];
  stats: ImportStats;
}

/** True for lines that look like tablature rather than chord/lyric text. */
function looksLikeTablature(lines: string[]): boolean {
  return lines.some((line) => /^\s*(?:[eBGDAE]\s*\||\|)/.test(line) && /--/.test(line));
}

function normalize(raw: string): { text: string; tabs: number } {
  let text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\t/g, '    ');

  // The current Ultimate Guitar copy format wraps each line in
  // [tab]...[/tab] and chords in [ch]...[/ch]. Unwrap single-line
  // wrappers first, then convert chord tags; genuine multi-line blocks
  // are only kept as tablature when their body looks like tablature.
  text = text.replace(/^[ \t]*\[tab\]([^\n]*?)\[\/tab\][ \t]*$/gim, '$1');
  text = text.replace(/\[ch\]([\s\S]*?)\[\/ch\]/gi, '[$1]');
  text = text.replace(/\[\/?ch\]/gi, '');
  // Repeat markers such as [8x] / [x2] are annotations, not chords.
  text = text.replace(/\[(\d+x|x\d+)\]/gi, '$1');

  const lines = text.split('\n');
  const out: string[] = [];
  let tabs = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!/^\[tab\]/i.test(trimmed)) {
      out.push(line.replace(/\[\/?tab\]/gi, ''));
      continue;
    }

    if (/\[\/tab\]/i.test(trimmed)) {
      out.push(trimmed.replace(/^\[tab\]/i, '').replace(/\[\/tab\]$/i, ''));
      continue;
    }

    const body: string[] = [trimmed.replace(/^\[tab\]/i, '')];
    for (i += 1; i < lines.length; i += 1) {
      const current = lines[i];
      if (/\[\/tab\]/i.test(current.trim())) {
        body.push(current.replace(/\[\/tab\]/gi, ''));
        break;
      }
      body.push(current);
    }

    const content = body.join('\n').replace(/^\n+|\n+$/g, '');
    if (looksLikeTablature(body)) {
      tabs += 1;
      out.push(`{start_of_tab}\n${content}\n{end_of_tab}`);
    } else {
      out.push(content);
    }
  }

  text = out.join('\n').replace(/<[^>]+>/g, '');
  return { text, tabs };
}

function normalizeKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[（(]\s*x?\s*\d+\s*[)）]/g, '')
    .replace(/\s*\d+\s*$/, '')
    .replace(/[:.]+$/, '')
    .trim();
}

function sectionType(label: string): 'verse' | 'chorus' | 'bridge' | null {
  return SECTION_MAP[normalizeKey(label)] ?? null;
}

function headerLabel(line: string): string | null {
  const bracket = BRACKET_HEADER_WITH_MARKER_RE.exec(line) ?? BRACKET_HEADER_RE.exec(line);
  if (bracket) {
    const label = bracket[1].trim();
    return isChordToken(label) ? null : label;
  }
  const cleaned = line
    .replace(/^[\s[(]+/, '')
    .replace(/[\s\])]+$/, '')
    .trim();
  if (cleaned && cleaned.split(/\s+/).length <= 3 && sectionType(cleaned)) return cleaned;
  return null;
}

function hasInlineChords(lines: string[]): boolean {
  return lines.some((line) =>
    [...line.matchAll(INLINE_CHORD_RE)].some((match) => isChordToken(match[1].trim()))
  );
}

/**
 * A line made only of bracketed chords ([Em]  [G]) is how the current UG
 * copy format writes chord lines. Convert it back to a plain chord line
 * while keeping every chord at its original column, so mergeChordLine can
 * align it with the lyrics below.
 */
function plainChordLine(line: string): string | null {
  const matches = [...line.matchAll(/\[([^\]]+)\]/g)];
  if (matches.length === 0) return null;
  if (line.replace(/\[[^\]]*\]/g, '').trim() !== '') return null;
  if (!matches.every((match) => isChordToken(match[1].trim()))) return null;
  return line.replace(/\[([^\]]*)\]/g, (match, chord: string) => {
    const text = chord.trim();
    return text + ' '.repeat(Math.max(0, match.length - text.length));
  });
}

function titleFromMarker(line: string): string | null {
  const lower = line.toLowerCase();
  for (const marker of TITLE_MARKERS) {
    if (lower.endsWith(marker) && line.length > marker.length) {
      const title = line
        .slice(0, line.length - marker.length)
        .replace(/[\s\-–—|]+$/, '')
        .trim();
      return title || null;
    }
  }
  return null;
}

function isYearLine(line: string): boolean {
  return /\b(?:19|20)\d{2}\b/.test(line) && line.split(/\s+/).length <= 4;
}

function capoFromLine(line: string): number | null {
  if (!/\bcapo\b/i.test(line)) return null;
  const afterLabel = line
    .replace(/^.*?\b(?:capo|capotasto)\b/i, '')
    .replace(/^\s*[:=]?\s*/, '')
    .trim();
  const token =
    /^(\d{1,2}|[ivx]+)/i.exec(afterLabel)?.[1] ??
    /\b(?:capo|fret)\b[^\dIVX]{0,12}(\d{1,2}|[ivx]+)\b/i.exec(line)?.[1];
  if (!token) return null;
  return parseCapoValue(token.replace(/(?:st|nd|rd|th)$/i, ''));
}

export function importSong(raw: string): ImportResult {
  const warnings: string[] = [];
  const stats: ImportStats = { merged: 0, grids: 0, sections: 0, comments: 0, tabs: 0 };

  const { text, tabs } = normalize(raw);
  stats.tabs = tabs;
  if (tabs > 0)
    warnings.push(`Imported ${tabs} tab block${tabs === 1 ? '' : 's'}: check alignment`);

  const lines = text.split('\n').map((line) => line.trimEnd());
  const out: string[] = [];
  let openSection: string | null = null;
  let titleFound = false;
  let subtitleFound = false;
  let bodyStarted = false;
  let inTab = false;

  const beginBody = () => {
    if (bodyStarted) return;
    bodyStarted = true;
    if (out.length > 0 && out[out.length - 1] !== '') out.push('');
  };

  const closeSection = () => {
    if (openSection) {
      out.push(`{end_of_${openSection}}`);
      openSection = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (inTab) {
      if (/^\{\s*(?:end_of_tab|eot)\s*\}$/i.test(trimmed)) {
        out.push(trimmed);
        inTab = false;
      } else {
        out.push(rawLine);
      }
      continue;
    }

    if (!trimmed) {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      continue;
    }

    if (NOISE.some((pattern) => pattern.test(trimmed))) continue;

    if (ANNOTATION_RE.test(trimmed)) {
      out.push(`{comment: ${trimmed}}`);
      stats.comments += 1;
      continue;
    }

    const metadata = METADATA_RE.exec(trimmed);
    if (metadata) {
      const label = metadata[1].toLowerCase();
      const value = metadata[2].replace(/\s+/g, ' ').trim();
      if (TITLE_LABELS.has(label) && !titleFound) {
        out.push(`{title: ${value}}`);
        titleFound = true;
        continue;
      }
      if (ARTIST_LABELS.has(label) && !subtitleFound) {
        out.push(`{subtitle: ${value}}`);
        subtitleFound = true;
        continue;
      }
    }

    if (!bodyStarted) {
      if (!titleFound) {
        const title = titleFromMarker(trimmed);
        if (title) {
          out.push(`{title: ${title}}`);
          titleFound = true;
          continue;
        }
        beginBody();
      } else if (isYearLine(trimmed)) {
        continue;
      } else if (
        !subtitleFound &&
        trimmed.split(/\s+/).length <= 5 &&
        !chordLineTokens(trimmed) &&
        headerLabel(trimmed) === null &&
        !DIRECTIVE_RE.test(trimmed) &&
        !LOOSE_METADATA_RE.test(trimmed)
      ) {
        out.push(`{subtitle: ${trimmed}}`);
        subtitleFound = true;
        continue;
      } else {
        beginBody();
      }
    }

    if (DIRECTIVE_RE.test(trimmed)) {
      closeSection();
      out.push(trimmed);
      const directiveName = /^\{\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(trimmed)?.[1].toLowerCase();
      if (directiveName === BLOCK_DIRECTIVES.tab.start) inTab = true;
      continue;
    }

    const label = headerLabel(trimmed);
    if (label !== null) {
      const clean = label.replace(/[:.]+$/, '').trim();
      const type = sectionType(clean);
      closeSection();
      if (type) {
        const key = normalizeKey(clean);
        const plain = [
          'verse',
          'verso',
          'strofa',
          'estrofe',
          'parte',
          'primeira parte',
          'chorus',
          'coro',
          'ritornello',
          'refrao',
          'refrão',
          'bridge',
          'ponte',
          'puente'
        ].includes(key);
        const needsLabel = /[0-9]/.test(clean) || !plain;
        out.push(`{start_of_${type}${needsLabel ? `: ${clean}` : ''}}`);
        openSection = type;
        stats.sections += 1;
      } else {
        out.push(`{comment: ${clean}}`);
        stats.comments += 1;
      }
      continue;
    }

    const capo = capoFromLine(trimmed);
    if (capo !== null) {
      out.push(`{capo: ${capo}}`);
      continue;
    }

    if (LOOSE_METADATA_RE.test(trimmed) && trimmed.split(/\s+/).length <= 5) {
      out.push(`{comment: ${trimmed}}`);
      stats.comments += 1;
      continue;
    }

    if (METADATA_RE.test(trimmed)) {
      out.push(`{comment: ${trimmed}}`);
      stats.comments += 1;
      continue;
    }

    const plain = plainChordLine(trimmed);
    const chords = chordLineTokens(plain ?? trimmed);
    if (chords) {
      const nextRaw = i + 1 < lines.length ? lines[i + 1] : '';
      const next = nextRaw.trim();
      const nextPlain = plainChordLine(next);
      const nextIsLyric =
        next.length > 0 &&
        nextPlain === null &&
        !chordLineTokens(next) &&
        !hasInlineChords([next]) &&
        !DIRECTIVE_RE.test(next) &&
        !ANNOTATION_RE.test(next) &&
        headerLabel(next) === null;
      if (nextIsLyric) {
        out.push(mergeChordLine(plain ?? rawLine, nextRaw));
        stats.merged += 1;
        i += 1;
      } else {
        out.push(chords.map(({ chord }) => `[${chord}]`).join(' '));
        stats.grids += 1;
      }
      continue;
    }

    out.push(trimmed);
  }
  closeSection();

  const compact: string[] = [];
  for (const line of out) {
    if (line === '' && compact[compact.length - 1] === '') continue;
    compact.push(line);
  }
  const chordpro = compact.join('\n').trim() + '\n';

  if (stats.merged + stats.grids === 0 && !hasInlineChords(lines)) {
    warnings.push('No chords recognized: text imported as-is');
  }

  return { chordpro, warnings, stats };
}
