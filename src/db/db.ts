import Dexie, { type EntityTable } from 'dexie';
import type { Experiment, Profile, Session } from './schema';

// Nothing is written until the person confirms 18+ (SPEC «Приватність», rule 7).
// Opening the database happens lazily, on the first read or write.

export const db = new Dexie('nern') as Dexie & {
  profile: EntityTable<Profile, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  experiments: EntityTable<Experiment, 'id'>;
};

// Schema versions. Never edit an old version: add version(2) with an upgrade() instead.
// Only indexed fields are listed; all other fields are stored anyway.
db.version(1).stores({
  profile: 'id',
  sessions: 'id, startedAt, localDate, mode, experimentId, device.fingerprint',
  experiments: 'id, status, startedAt',
});
