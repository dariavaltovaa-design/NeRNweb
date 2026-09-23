// The first valid daily tests on a device are a warm-up: the brain is still learning the test,
// so experiments leave them out (SPEC «Калібрування», rule 10: a new device starts again).

import type { Session } from '../db/schema';

export const CALIBRATION_SESSIONS = 5;

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
