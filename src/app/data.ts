import { useState } from 'react';
import type { Experiment, Profile, Session } from '../db/schema';
import { allExperiments, allSessions, getProfile } from '../db/repo';
import { useLiveQuery } from '../db/useLiveQuery';

export const CONSENT_VERSION = '2026-09-23';
export const APP_VERSION = __APP_VERSION__;

export interface AppData {
  profile: Profile | null;
  sessions: Session[];
  experiments: Experiment[];
}

/** The moment the screen opened. Read once, so re-renders never shift "today" mid-screen. */
export function useNow(): number {
  const [now] = useState(() => Date.now());
  return now;
}

/** Everything the daily screens need, re-read whenever IndexedDB changes. */
export function useAppData(): AppData | undefined {
  return useLiveQuery(async () => ({
    profile: await getProfile(),
    sessions: await allSessions(),
    experiments: await allExperiments(),
  }));
}
