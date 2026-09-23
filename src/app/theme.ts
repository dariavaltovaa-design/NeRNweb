import { useState } from 'react';
import { readPref, writePref } from './preferences';

export type ThemePreference = 'system' | 'light' | 'dark';

// Status-bar colour for each theme; must match --bg in src/ui/tokens.css.
const STATUS_BAR = { light: '#F6F4EF', dark: '#0B0C10' } as const;

function savedTheme(): ThemePreference {
  const value = readPref('theme');
  return value === 'light' || value === 'dark' ? value : 'system';
}

function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;

  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const scheme = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = STATUS_BAR[theme === 'system' ? scheme : theme];
  });
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
