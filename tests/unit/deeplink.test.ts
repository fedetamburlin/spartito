import { describe, expect, it } from 'vitest';
import { readDocumentFromHash } from '../../src/core/deeplink';

/**
 * Share links are base64url-encoded JSON in the URL hash. Anything
 * malformed must be ignored, never thrown: the app still has to boot.
 */

function encode(payload: unknown): string {
  const base64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `#doc=${urlSafe}`;
}

describe('readDocumentFromHash', () => {
  it('reads a source-only document', () => {
    expect(readDocumentFromHash(encode({ source: '[Am]ciao' }))).toEqual({
      source: '[Am]ciao',
      settings: undefined
    });
  });

  it('preserves the settings payload', () => {
    const settings = { transpose: 2, textPt: 13 };
    expect(readDocumentFromHash(encode({ source: '[C]x', settings }))).toEqual({
      source: '[C]x',
      settings
    });
  });

  it('round-trips accents and non-Latin text', () => {
    const source = '{title: Città}\n[Am]日本語';
    expect(readDocumentFromHash(encode({ source }))?.source).toBe(source);
  });

  it('accepts base64url without padding', () => {
    const hash = encode({ source: 'abc' });
    expect(hash.slice(5)).not.toContain('=');
    expect(readDocumentFromHash(hash)?.source).toBe('abc');
  });

  it.each([
    ['', 'empty hash'],
    ['#', 'bare hash'],
    ['#other=abc', 'unknown key'],
    ['#doc=!!!', 'invalid base64'],
    ['#doc=eyJzb3VyY2UiOn0', 'valid base64, invalid JSON'],
    ['#doc=bnVsbA', 'valid JSON, not an object'],
    ['#doc=' + Buffer.from('{}').toString('base64url'), 'missing source'],
    ['#doc=' + Buffer.from('{"source":42}').toString('base64url'), 'non-string source']
  ])('returns null for %s (%s)', (hash) => {
    expect(readDocumentFromHash(hash)).toBeNull();
  });
});
