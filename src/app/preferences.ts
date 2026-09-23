// Interface preferences (language, theme) live in localStorage, not in IndexedDB:
// they are not personal data and must work before the 18+ consent, when nothing else is saved.
// Keys are also read by public/theme-init.js before the first paint.

const KEYS = {
  locale: 'nern.locale',
  theme: 'nern.theme',
  pulse: 'nern.pulse', // 'off' = do not add my results to the anonymous average
  warmedUp: 'nern.warmedUp', // '1' after the first test: practice stimuli only the very first time
  challengeName: 'nern.name', // optional first name shown in challenges the person sends
} as const;

type PrefKey = keyof typeof KEYS;

export function readPref(key: PrefKey): string | null {
  try {
    return localStorage.getItem(KEYS[key]);
  } catch {
    return null; // storage blocked, e.g. private mode
  }
}

export function writePref(key: PrefKey, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(KEYS[key]);
    else localStorage.setItem(KEYS[key], value);
  } catch {
    // Storage blocked: the choice still applies until the tab is closed.
  }
}
