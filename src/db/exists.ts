// Tiny helpers that never import Dexie: screens open to visitors (landing, onboarding, privacy,
// settings) use them so people without a profile never download or create the database.

import { useEffect, useState } from 'react';
import type { Profile } from './schema';

export const DB_NAME = 'nern';

export async function databaseExists(): Promise<boolean> {
  if (typeof indexedDB.databases !== 'function') return true; // very old browsers: just open
  const list = await indexedDB.databases();
  return list.some((entry) => entry.name === DB_NAME);
}

/** The profile, live. `undefined` while checking, `null` when there is none (no consent yet). */
export function useProfile(): Profile | null | undefined {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      if (!(await databaseExists())) {
        if (!cancelled) setProfile(null);
        return;
      }
      const [{ liveQuery }, repo] = await Promise.all([import('dexie'), import('./repo')]);
      if (cancelled) return;
      const subscription = liveQuery(repo.getProfile).subscribe({ next: setProfile });
      unsubscribe = () => subscription.unsubscribe();
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return profile;
}
