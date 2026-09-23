// The app side of «середнє по Україні». If the server is not there (local preview, offline),
// everything quietly falls back to the research norm.

import { useEffect, useState } from 'react';
import type { PulseSummary } from '../stats/pulse';
import { readPref, writePref } from './preferences';

// The default Netlify path: redirects never touch /.netlify/*, so the SPA fallback can't swallow it.
const ENDPOINT = '/.netlify/functions/pulse';

/** On by default; the person can switch it off on the result screen or in settings. */
export function isContributing(): boolean {
  return readPref('pulse') !== 'off';
}

export function setContributing(on: boolean): void {
  writePref('pulse', on ? null : 'off');
}

export async function contribute(hour: number, meanRtMs: number): Promise<void> {
  if (!isContributing()) return;
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hour, meanRtMs: Math.round(meanRtMs) }),
      keepalive: true,
    });
  } catch {
    // Offline or no server: the result simply is not added.
  }
}

async function fetchPulse(): Promise<PulseSummary | null> {
  try {
    const response = await fetch(ENDPOINT, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = (await response.json()) as PulseSummary;
    return data && typeof data === 'object' && 'ua' in data ? data : null;
  } catch {
    return null;
  }
}

/** The live summary; null while loading or when unavailable. */
export function usePulse(refreshKey: unknown = null): PulseSummary | null {
  const [summary, setSummary] = useState<PulseSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchPulse().then((s) => !cancelled && setSummary(s));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);
  return summary;
}
