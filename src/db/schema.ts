// Data model from SPEC «Модель даних». Everything stays on the device (IndexedDB).
// Raw trials are kept so metrics can be recomputed if a formula ever changes.

export interface Profile {
  id: 'me'; // single record
  createdAt: number; // epoch ms
  locale: 'uk' | 'en';
  ageConfirmed18: true; // without it the app saves nothing
  consentVersion: string; // e.g. '2026-10-01'
  preferredWindow?: { startHour: number; endHour: number }; // usual test window
  region?: string; // Phase 2 only, chosen by the person, empty by default
}

export interface Session {
  id: string; // crypto.randomUUID()
  startedAt: number; // epoch ms
  localDate: string; // 'YYYY-MM-DD' in the device time zone
  localHour: number; // 0–23
  mode: 'daily' | 'quick' | 'demo';
  durationMs: number; // planned: 90000 (daily), 60000 (quick)
  trials: Trial[];
  device: DeviceInfo;
  validity: Validity;
  metrics?: SessionMetrics; // computed by stats/, absent if the session is invalid
  checkIn?: CheckIn;
  experimentId?: string;
  condition?: 'A' | 'B';
}

export interface Trial {
  isiMs: number; // planned pause before the stimulus
  onsetTs: number; // performance.now() of the frame that showed it
  responseTs: number | null; // event.timeStamp of pointerdown
  rtMs: number | null; // responseTs - onsetTs
  kind: 'valid' | 'lapse' | 'false_start' | 'miss';
}

export interface DeviceInfo {
  fingerprint: string; // local hash of platform + screen size + refresh rate; never leaves the device
  refreshHz: number; // measured before the test
  inputType: 'touch' | 'mouse' | 'pen';
}

export interface Validity {
  ok: boolean;
  reasons: Array<
    'tab_hidden' | 'too_few_trials' | 'too_many_false_starts' | 'frame_drops' | 'interrupted'
  >;
}

export interface SessionMetrics {
  medianRtMs: number;
  meanSpeed: number; // mean of 1000/RT over valid responses, unit: 1/s
  lapses: number; // RT >= 355 ms
  falseStarts: number; // response < 100 ms or before the stimulus
  validTrials: number;
}

export interface CheckIn {
  sleepHours?: number; // step 0.5
  sleepQuality?: 1 | 2 | 3 | 4 | 5;
  mood?: 1 | 2 | 3 | 4 | 5;
  nightAlert?: boolean; // "there was an alert at night" — set by the person
  tags: string[]; // e.g. ['coffee', 'reels_before_bed']
  note?: string; // up to 140 characters, never analysed
}

export interface Experiment {
  id: string;
  title: string; // 'Телефон поза спальнею'
  conditionA: string; // 'Телефон у спальні (як зазвичай)'
  conditionB: string; // 'Телефон за дверима'
  schedule: 'alternating' | 'blocks';
  startedAt: number;
  plannedDays: number; // 14 by default
  status: 'running' | 'done' | 'abandoned';
  source: 'library' | 'custom';
}
