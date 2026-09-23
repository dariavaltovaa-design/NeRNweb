// «Ціна скролу» — SPEC: a quick test before and after a scrolling session the person marks herself.
// Pairs never enter the Form. The average appears only after 5 complete pairs.

import type { Session } from '../db/schema';
import { mean } from './quantile';

export const MIN_PAIRS = 5;

export interface ScrollPair {
  id: string;
  date: string;
  before: Session;
  after: Session | null;
  /** Change in speed after scrolling, percent; null until both tests are valid. */
  change: number | null;
}

export function scrollPairs(sessions: readonly Session[]): ScrollPair[] {
  const byId = new Map<string, { before?: Session; after?: Session }>();
  for (const s of sessions) {
    if (!s.scrollPair) continue;
    const entry = byId.get(s.scrollPair.id) ?? {};
    entry[s.scrollPair.phase] = s;
    byId.set(s.scrollPair.id, entry);
  }
  const pairs: ScrollPair[] = [];
  for (const [id, { before, after }] of byId) {
    if (!before) continue;
    const bothValid =
      before.validity.ok && after?.validity.ok && before.metrics && after.metrics ? true : false;
    const change =
      bothValid && before.metrics && after?.metrics
        ? (100 * (after.metrics.meanSpeed - before.metrics.meanSpeed)) / before.metrics.meanSpeed
        : null;
    pairs.push({ id, date: before.localDate, before, after: after ?? null, change });
  }
  return pairs.sort((a, b) => b.before.startedAt - a.before.startedAt);
}

export function averageChange(pairs: readonly ScrollPair[]): number | null {
  const changes = pairs.flatMap((p) => (p.change === null ? [] : [p.change]));
  return changes.length >= MIN_PAIRS ? mean(changes) : null;
}
