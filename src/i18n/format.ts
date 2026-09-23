export type Locale = 'uk' | 'en';

export const LOCALES: readonly Locale[] = ['uk', 'en'];

/** Forms for Intl.PluralRules. Ukrainian uses one/few/many/other, English only one/other. */
export interface PluralForms {
  one: string;
  few?: string;
  many?: string;
  other: string;
}

export function isPluralForms(value: unknown): value is PluralForms {
  return typeof value === 'object' && value !== null && 'one' in value && 'other' in value;
}

/** plural('uk', 5, { one: '{n} день', few: '{n} дні', many: '{n} днів', other: '{n} дня' }) → '5 днів' */
export function plural(locale: Locale, n: number, forms: PluralForms): string {
  const category = new Intl.PluralRules(locale).select(n);
  const template =
    (category === 'one' || category === 'few' || category === 'many'
      ? forms[category]
      : undefined) ?? forms.other;
  return template.replace('{n}', new Intl.NumberFormat(locale).format(n));
}

/** First of uk/en in the browser's language list; English if neither is there. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const lang of languages) {
    const code = lang.toLowerCase();
    if (code.startsWith('uk')) return 'uk';
    if (code.startsWith('en')) return 'en';
  }
  return 'en';
}
