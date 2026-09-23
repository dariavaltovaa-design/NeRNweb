import { describe, expect, it } from 'vitest';
import { uk } from './uk';
import { en } from './en';
import { detectLocale, isPluralForms, plural } from './format';

/** All leaf paths like "nav.today". Plural groups count as one leaf: uk needs few/many, en does not. */
function leafPaths(tree: object, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]: [string, unknown]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string' || isPluralForms(value)) return [path];
    return leafPaths(value as object, path);
  });
}

function leafStrings(tree: object, prefix = ''): Array<[string, string]> {
  return Object.entries(tree).flatMap(([key, value]: [string, unknown]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') return [[path, value] as [string, string]];
    return leafStrings(value as object, path);
  });
}

describe('dictionaries', () => {
  it('uk and en have exactly the same keys', () => {
    expect(leafPaths(en).sort()).toEqual(leafPaths(uk).sort());
  });

  it('no empty strings', () => {
    for (const [path, text] of [...leafStrings(uk), ...leafStrings(en)]) {
      expect(text.trim(), path).not.toBe('');
    }
  });

  it('no exclamation marks, except "New peak!"', () => {
    for (const [path, text] of [...leafStrings(uk), ...leafStrings(en)]) {
      if (path.endsWith('newPeak')) continue;
      expect(text, path).not.toContain('!');
    }
  });
});

describe('plural', () => {
  const days = { one: '{n} день', few: '{n} дні', many: '{n} днів', other: '{n} дня' };

  it('Ukrainian: 1 день, 2 дні, 5 днів, 11 днів, 21 день, 1,5 дня', () => {
    expect(plural('uk', 1, days)).toBe('1 день');
    expect(plural('uk', 2, days)).toBe('2 дні');
    expect(plural('uk', 5, days)).toBe('5 днів');
    expect(plural('uk', 11, days)).toBe('11 днів');
    expect(plural('uk', 21, days)).toBe('21 день');
    expect(plural('uk', 1.5, days)).toBe('1,5 дня');
  });

  it('English: 1 day, 2 days', () => {
    const enDays = { one: '{n} day', other: '{n} days' };
    expect(plural('en', 1, enDays)).toBe('1 day');
    expect(plural('en', 2, enDays)).toBe('2 days');
  });
});

describe('detectLocale', () => {
  it('picks the first of uk/en in browser preferences', () => {
    expect(detectLocale(['uk-UA', 'en-US'])).toBe('uk');
    expect(detectLocale(['en-GB', 'uk'])).toBe('en');
    expect(detectLocale(['pl-PL', 'uk-UA'])).toBe('uk');
  });

  it('falls back to English', () => {
    expect(detectLocale(['de-DE'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });
});
