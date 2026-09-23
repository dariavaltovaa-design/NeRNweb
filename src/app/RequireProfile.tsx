import { Navigate, Outlet } from 'react-router';
import { getProfile } from '../db/repo';
import { useLiveQuery } from '../db/useLiveQuery';

/**
 * Daily screens need the 18+ confirmation and a profile. Without it — onboarding.
 * (Privacy, settings and the demo stay open to everyone.)
 */
export function RequireProfile() {
  const profile = useLiveQuery(getProfile);
  if (profile === undefined) return null; // still reading IndexedDB (a few ms)
  if (profile === null) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
