import { useState } from 'react';
import { readPref, writePref } from './preferences';

export type ThemePreference = 'system' | 'light' | 'dark';

// Status-bar colour for each theme; must match --bg in src/ui/tokens.css.
const STATUS_BAR = { light: '#EEEAE2', dark: '#0B0B0C' } as const;
const STIMULUS_BG = '#050507';

function savedTheme(): ThemePreference {
  const value = readPref('theme');
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** Paints the browser/status bar. `override` is used by the test screen, which is always dark. */
export function paintStatusBar(theme: ThemePreference, override?: 'stimulus'): void {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const scheme = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = override ? STIMULUS_BG : STATUS_BAR[theme === 'system' ? scheme : theme];
  });
}

export function currentTheme(): ThemePreference {
  return savedTheme();
}

function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  paintStatusBar(theme);
}

export function useThemePreference(): [ThemePreference, (theme: ThemePreference) => void] {
  const [theme, setThemeState] = useState<ThemePreference>(savedTheme);

  function setTheme(next: ThemePreference): void {
    applyTheme(next);
    writePref('theme', next === 'system' ? null : next);
    setThemeState(next);
  }

  return [theme, setTheme];
}
