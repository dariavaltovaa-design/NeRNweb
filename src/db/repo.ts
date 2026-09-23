// Every read and write of personal data goes through here. All of it stays in IndexedDB.

import type { Experiment, Profile, Session } from './schema';
import { db } from './db';
import { databaseExists as databaseOnDisk } from './exists';

/**
 * Before the 18+ consent the database must not even be created. Opening Dexie creates it,
 * so first ask the browser whether it already exists.
 */
async function databaseExists(): Promise<boolean> {
  return db.isOpen() || databaseOnDisk();
}

export async function getProfile(): Promise<Profile | null> {
  if (!(await databaseExists())) return null;
  return (await db.profile.get('me')) ?? null;
}

export async function saveProfile(profile: Profile): Promise<void> {
  await db.profile.put(profile);
}

export async function updateProfile(patch: Partial<Omit<Profile, 'id'>>): Promise<void> {
  await db.profile.update('me', patch);
}

export async function allSessions(): Promise<Session[]> {
  return db.sessions.orderBy('startedAt').toArray();
}

export async function getSession(id: string): Promise<Session | null> {
  return (await db.sessions.get(id)) ?? null;
}

export async function addSession(session: Session): Promise<void> {
  // Rule: nothing is stored without the 18+ confirmation.
  if (!(await getProfile())?.ageConfirmed18) throw new Error('No consent: session not saved');
  await db.sessions.add(session);
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}

export async function saveCheckIn(id: string, checkIn: Session['checkIn']): Promise<void> {
  await db.sessions.update(id, { checkIn });
}

export async function activeExperiment(): Promise<Experiment | null> {
  return (await db.experiments.where('status').equals('running').first()) ?? null;
}

export async function allExperiments(): Promise<Experiment[]> {
  return db.experiments.orderBy('startedAt').reverse().toArray();
}

export async function startExperiment(experiment: Experiment): Promise<void> {
  await db.transaction('rw', db.experiments, async () => {
    // Only one experiment runs at a time.
    if (await activeExperiment()) throw new Error('Another experiment is running');
    await db.experiments.add(experiment);
  });
}

export async function setExperimentStatus(id: string, status: Experiment['status']): Promise<void> {
  await db.experiments.update(id, { status });
}

export interface ExportFile {
  app: 'NeRN';
  schemaVersion: number;
  exportedAt: string;
  profile: Profile | null;
  sessions: Session[];
  experiments: Experiment[];
}

export async function exportAll(): Promise<ExportFile> {
  return {
    app: 'NeRN',
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    profile: await getProfile(),
    sessions: await allSessions(),
    experiments: await allExperiments(),
  };
}

const CSV_COLUMNS = [
  'date',
  'hour',
  'mode',
  'valid',
  'invalid_reasons',
  'median_rt_ms',
  'speed',
  'lapses',
  'false_starts',
  'valid_reactions',
  'sleep_hours',
  'sleep_quality',
  'mood',
  'night_alert',
  'tags',
  'note',
  'experiment_id',
  'condition',
  'condition_kept',
  'scroll_pair',
] as const;

function csvCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One row per session. Raw trials are in the JSON export. */
export function sessionsToCsv(sessions: readonly Session[]): string {
  const rows = sessions.map((s) =>
    [
      s.localDate,
      s.localHour,
      s.mode,
      s.validity.ok,
      s.validity.reasons.join(' '),
      s.metrics?.medianRtMs,
      s.metrics?.meanSpeed.toFixed(4),
      s.metrics?.lapses,
      s.metrics?.falseStarts,
      s.metrics?.validTrials,
      s.checkIn?.sleepHours,
      s.checkIn?.sleepQuality,
      s.checkIn?.mood,
      s.checkIn?.nightAlert,
      s.checkIn?.tags.join(' '),
      s.checkIn?.note,
      s.experimentId,
      s.condition,
      s.checkIn?.conditionKept,
      s.scrollPair ? `${s.scrollPair.id}:${s.scrollPair.phase}` : undefined,
    ]
      .map(csvCell)
      .join(','),
  );
  return [CSV_COLUMNS.join(','), ...rows].join('\n');
}

/** Deletes the whole database and interface preferences. The caller reloads the app. */
export async function deleteEverything(): Promise<void> {
  await db.delete();
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('nern.'))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // storage blocked: nothing to remove
  }
}
