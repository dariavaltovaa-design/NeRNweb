import { createContext, useContext, useState, type ReactNode } from 'react';
import { readPref, writePref } from '../app/preferences';
import { en } from './en';
import { detectLocale, plural, type Locale, type PluralForms } from './format';
import type { Messages } from './messages';
import { uk } from './uk';

const DICTIONARIES: Record<Locale, Messages> = { uk, en };

interface I18n {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** All texts of the current language: m.nav.today, m.settings.title, … */
  m: Messages;
  plural: (n: number, forms: PluralForms) => string;
  formatNumber: (n: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => string;
}

const I18nContext = createContext<I18n | null>(null);

function initialLocale(): Locale {
  const saved = readPref('locale');
  if (saved === 'uk' || saved === 'en') return saved;
  return detectLocale(navigator.languages);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  function setLocale(next: Locale): void {
    document.documentElement.lang = next;
    writePref('locale', next);
    setLocaleState(next);
  }

  const value: I18n = {
    locale,
    setLocale,
    m: DICTIONARIES[locale],
    plural: (n, forms) => plural(locale, n, forms),
    formatNumber: (n, options) => new Intl.NumberFormat(locale, options).format(n),
    formatDate: (date, options) => new Intl.DateTimeFormat(locale, options).format(date),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error('useI18n must be used inside <I18nProvider>');
  return i18n;
}
