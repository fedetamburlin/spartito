import { describe, expect, it } from 'vitest';
import { loadThemePref, parseTheme, resolveTheme } from '../../src/core/theme';

describe('theme preference', () => {
  it('parses stored values, falling back to auto', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('auto')).toBe('auto');
    expect(parseTheme('weird')).toBe('auto');
    expect(parseTheme(null)).toBe('auto');
    expect(parseTheme(undefined)).toBe('auto');
  });

  it('resolves auto against the system preference', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('loads safely without a browser storage', () => {
    expect(loadThemePref()).toBe('auto');
  });
});
