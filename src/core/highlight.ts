/**
 * Pure tokenizer for the ChordPro source used by the editor highlighter.
 * Scans one line at a time: directives `{...}` (comments called out
 * separately) and inline chords `[...]`. Ranges are absolute in the line
 * and never overlap (a directive swallows brackets inside it).
 */

export type HighlightKind = 'chord' | 'directive' | 'comment';

export interface HighlightToken {
  from: number;
  to: number;
  kind: HighlightKind;
}

const TOKEN_PATTERN = /\{[^}\n]*\}|\[[^\]\n]*\]/g;

const COMMENT_PATTERN = /^\{comment\b/i;

export function scanChordProLine(line: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  TOKEN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_PATTERN.exec(line)) !== null) {
    const text = match[0];
    const from = match.index ?? 0;
    let kind: HighlightKind;
    if (text.startsWith('[')) {
      kind = 'chord';
    } else if (COMMENT_PATTERN.test(text)) {
      kind = 'comment';
    } else {
      kind = 'directive';
    }
    tokens.push({ from, to: from + text.length, kind });
  }
  return tokens;
}
