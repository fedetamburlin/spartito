/** Collapse all whitespace for assertions that do not care about spacing. */
export function squeeze(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
