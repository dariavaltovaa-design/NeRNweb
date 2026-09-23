// «Підпис дня» — one human sentence per day, chosen from templates by state. No AI, no generation.

import { daysBetween } from './dates';

export type CaptionState =
  'peak' | 'above' | 'within' | 'below' | 'calibration' | 'alert' | 'early';

/**
 * Same date → same sentence. Consecutive days step through the list, so the same template
 * never appears two days in a row (with at least two templates).
 */
export function pickCaption(templates: readonly string[], date: string): string {
  const n = templates.length;
  if (n === 0) return '';
  const day = daysBetween('2026-01-01', date);
  return templates[((day % n) + n) % n] ?? '';
}
