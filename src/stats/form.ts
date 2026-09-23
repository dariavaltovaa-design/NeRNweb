// Daily Form — SPEC «Калібрування» and «Форма дня». The person is compared only with herself,
// on the same device (a new device starts a new baseline, rule 10).

import type { Session } from '../db/schema';
import { daysBetween } from './dates';
import { quantile } from './quantile';

export const CALIBRATION_SESSIONS = 5;
export const WINDOW_DAYS = 60;
/** Decision 2026-09-23: the usual range needs at least this many post-calibration sessions. */
export const MIN_SESSIONS_FOR_RANGE = 5;

export type Position = 'above' | 'within' | 'below';

export type FormResult =
  | { kind: 'calibration'; done: number; total: number }
  | {
      kind: 'form';
      value: number;
      newPeak: boolean;
      /** Interquartile range of Form over 60 days; null while there is too little data. */
      range: { low: number; high: number } | null;
      position: Position | null;
      /** Ceiling C, used to place other sessions on the same scale (history chart). */
      ceiling: number;
      /** Post-calibration sessions in the 60-day window (the usual range needs 5). */
      poolSize: number;
    };

function isCountable(s: Session): s is Session & { metrics: NonNullable<Session['metrics']> } {
  return s.mode === 'daily' && s.validity.ok && s.metrics !== undefined;
}

/** Valid daily sessions of one device, oldest first. */
export function segment(sessions: readonly Session[], fingerprint: string) {
  return sessions
    .filter(isCountable)
    .filter((s) => s.device.fingerprint === fingerprint)
    .sort((a, b) => a.startedAt - b.startedAt);
}

/** Ids of calibration sessions: the first 5 valid daily sessions on each device. */
export function calibrationIds(sessions: readonly Session[]): Set<string> {
  const ids = new Set<string>();
  const byDevice = new Map<string, Session[]>();
  for (const s of sessions.filter(isCountable).sort((a, b) => a.startedAt - b.startedAt)) {
    const list = byDevice.get(s.device.fingerprint) ?? [];
    list.push(s);
    byDevice.set(s.device.fingerprint, list);
  }
  for (const list of byDevice.values()) {
    list.slice(0, CALIBRATION_SESSIONS).forEach((s) => ids.add(s.id));
  }
  return ids;
}

export function formValue(speed: number, ceiling: number): number {
  return Math.min(100, Math.round((100 * speed) / ceiling));
}

export function evaluateForm(sessions: readonly Session[], target: Session): FormResult | null {
  if (!isCountable(target)) return null;
  const own = segment(sessions, target.device.fingerprint).filter(
    (s) => s.startedAt <= target.startedAt,
  );
  const index = own.findIndex((s) => s.id === target.id);
  if (index < CALIBRATION_SESSIONS) {
    return { kind: 'calibration', done: index + 1, total: CALIBRATION_SESSIONS };
  }

  // Ceiling C: 90th percentile of S over the last 60 days, calibration excluded.
  const pool = own
    .slice(CALIBRATION_SESSIONS)
    .filter((s) => daysBetween(s.localDate, target.localDate) < WINDOW_DAYS);
  const speeds = pool.map((s) => s.metrics.meanSpeed);
  const ceiling = quantile(speeds, 0.9);
  const speed = target.metrics.meanSpeed;
  const value = formValue(speed, ceiling);

  let range: { low: number; high: number } | null = null;
  let position: Position | null = null;
  if (pool.length >= MIN_SESSIONS_FOR_RANGE) {
    const forms = speeds.map((s) => formValue(s, ceiling));
    range = { low: Math.round(quantile(forms, 0.25)), high: Math.round(quantile(forms, 0.75)) };
    position = value > range.high ? 'above' : value < range.low ? 'below' : 'within';
  }

  return {
    kind: 'form',
    value,
    newPeak: speed > ceiling,
    range,
    position,
    ceiling,
    poolSize: pool.length,
  };
}
