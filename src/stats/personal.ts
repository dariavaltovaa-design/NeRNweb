// Personal context that appears on its own, without a waiting period:
// the usual level (after 3 tests) and the streak of days in a row.

import type { Session } from '../db/schema';
import { addDays, daysBetween } from './dates';
import { median } from './quantile';

export const MIN_FOR_USUAL = 3;
const USUAL_WINDOW_DAYS = 30;

type Scored = Session & { metrics: NonNullable<Session['metrics']> };

export function scored(sessions: readonly Session[]): Scored[] {
  return sessions
    .filter((s): s is Scored => s.mode === 'daily' && s.validity.ok && s.metrics !== undefined)
    .sort((a, b) => a.startedAt - b.startedAt);
}

/** Mean RT of the session (older sessions without it fall back to the speed). */
export function meanRtOf(session: Scored): number {
  return session.metrics.meanRtMs ?? Math.round(1000 / session.metrics.meanSpeed);
}

/** Median of your mean RT over the last 30 days, other days only. Null until 3 such tests. */
export function usualRt(sessions: readonly Session[], today: string): number | null {
  const past = scored(sessions).filter(
    (s) => s.localDate !== today && daysBetween(s.localDate, today) <= USUAL_WINDOW_DAYS,
  );
  if (past.length < MIN_FOR_USUAL) return null;
  return Math.round(median(past.map(meanRtOf)));
}

/** Days in a row with a valid test, ending today (or yesterday, if today has none yet). */
export function streak(sessions: readonly Session[], today: string): number {
  const days = new Set(scored(sessions).map((s) => s.localDate));
  let day = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(day)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}
