export type ThemePref = 'auto' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'spartito-theme';

export function parseTheme(value: string | null | undefined): ThemePref {
  return value === 'light' || value === 'dark' ? value : 'auto';
}

export function resolveTheme(pref: ThemePref, prefersDark: boolean): Theme {
  if (pref === 'auto') return prefersDark ? 'dark' : 'light';
  return pref;
}

export function loadThemePref(): ThemePref {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return 'auto';
  }
}

export function saveThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    // preference stays for this session only
  }
}

export function systemPrefersDark(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Applies the resolved theme to <html> and returns it. */
export function applyTheme(pref: ThemePref): Theme {
  const theme = resolveTheme(pref, systemPrefersDark());
  document.documentElement.dataset.theme = theme;
  return theme;
}
