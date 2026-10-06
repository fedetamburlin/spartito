import importDefaults from '../../config/import.json';
import { parseCapoValue } from './chordpro';
import { chordLineTokens, isChordToken, mergeChordLine } from './chords';

const SECTION_MAP = importDefaults.sections as Record<string, 'verse' | 'chorus' | 'bridge'>;
const METADATA = new Set(importDefaults.metadata.map((label) => label.toLowerCase()));
const NOISE = ((importDefaults.noise ?? []) as string[]).map((pattern) => new RegExp(pattern, 'i'));
const METADATA_RE = new RegExp(`^(${[...METADATA].join('|')})\\b\\s*[:=]\\s*(.+)`, 'i');
const TITLE_MARKERS = ((importDefaults.titleMarkers ?? []) as string[]).map((marker) => marker.toLowerCase());
const LOOSE_METADATA = ((importDefaults.metadataLoose ?? []) as string[]).map((label) => label.toLowerCase());
const LOOSE_METADATA_RE = LOOSE_METADATA.length
  ? new RegExp(`^(?:${LOOSE_METADATA.join('|')})\\b`, 'i')
  : /$^/;

const DIRECTIVE_RE = /^\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*(?::[\s\S]*?)?\}$/;
const BRACKET_HEADER_RE = /^\[([^\]]+)\]$/;
const INLINE_CHORD_RE = /\[([^\]]+)\]/g;
const ANNOTATION_RE = /^\([^)]*\)$/;

export interface ImportStats {
  merged: number;
  grids: number;
  sections: number;
  comments: number;
  tabsRemoved: number;
}

export interface ImportResult {
  chordpro: string;
  warnings: string[];
  stats: ImportStats;
}

function normalize(raw: string): { text: string; tabsRemoved: number } {
  let text = raw.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').replace(/\t/g, '    ');
  const tabsRemoved = text.match(/\[tab\][\s\S]*?\[\/tab\]/gi)?.length ?? 0;
  text = text.replace(/\[tab\][\s\S]*?\[\/tab\]/gi, '');
  text = text.replace(/\[ch\]([\s\S]*?)\[\/ch\]/gi, '[$1]');
  text = text.replace(/\[\/?(?:ch|tab)\]/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  return { text, tabsRemoved };
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
  const bracket = BRACKET_HEADER_RE.exec(line);
  if (bracket) {
    const label = bracket[1].trim();
    return isChordToken(label) ? null : label;
  }
  const cleaned = line.replace(/^[\s[(]+/, '').replace(/[\s\])]+$/, '').trim();
  if (cleaned && cleaned.split(/\s+/).length <= 3 && sectionType(cleaned)) return cleaned;
  return null;
}

function hasInlineChords(lines: string[]): boolean {
  return lines.some((line) =>
    [...line.matchAll(INLINE_CHORD_RE)].some((match) => isChordToken(match[1].trim()))
  );
}

function titleFromMarker(line: string): string | null {
  const lower = line.toLowerCase();
  for (const marker of TITLE_MARKERS) {
    if (lower.endsWith(marker) && line.length > marker.length) {
      const title = line.slice(0, line.length - marker.length).replace(/[\s\-–—|]+$/, '').trim();
      return title || null;
    }
  }
  return null;
}

function isYearLine(line: string): boolean {
  return /\b(?:19|20)\d{2}\b/.test(line) && line.split(/\s+/).length <= 4;
}

function capoFromLine(line: string): number | null {
  if (!LOOSE_METADATA_RE.test(line)) return null;
  const value = line
    .replace(/^(?:capo|capotasto)\b/i, '')
    .replace(/^\s*[:=]?\s*/, '')
    .replace(/^(?:at|on|al|sul|fret|tasto|no\.?)\s+/i, '')
    .trim();
  return parseCapoValue(value);
}

export function importSong(raw: string): ImportResult {
  const warnings: string[] = [];
  const stats: ImportStats = { merged: 0, grids: 0, sections: 0, comments: 0, tabsRemoved: 0 };

  const { text, tabsRemoved } = normalize(raw);
  stats.tabsRemoved = tabsRemoved;
  if (tabsRemoved > 0) warnings.push(`Rimossi ${tabsRemoved} blocchi di tablatura`);

  const lines = text.split('\n').map((line) => line.trimEnd());
  const out: string[] = [];
  let openSection: string | null = null;
  let titleFound = false;
  let subtitleFound = false;
  let bodyStarted = false;

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
      continue;
    }

    const label = headerLabel(trimmed);
    if (label !== null) {
      const clean = label.replace(/[:.]+$/, '').trim();
      const type = sectionType(clean);
      closeSection();
      if (type) {
        const key = normalizeKey(clean);
        const plain = ['verse', 'verso', 'strofa', 'estrofe', 'parte', 'primeira parte', 'chorus', 'coro', 'ritornello', 'refrao', 'refrão', 'bridge', 'ponte', 'puente'].includes(key);
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
    if (capo !== null && trimmed.split(/\s+/).length <= 5) {
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

    const chords = chordLineTokens(trimmed);
    if (chords) {
      const nextRaw = i + 1 < lines.length ? lines[i + 1] : '';
      const next = nextRaw.trim();
      const nextIsLyric =
        next.length > 0 &&
        !chordLineTokens(next) &&
        !DIRECTIVE_RE.test(next) &&
        !ANNOTATION_RE.test(next) &&
        headerLabel(next) === null;
      if (nextIsLyric) {
        out.push(mergeChordLine(rawLine, nextRaw));
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
    warnings.push('Nessun accordo riconosciuto: il testo è stato importato così com\u2019è');
  }

  return { chordpro, warnings, stats };
}
