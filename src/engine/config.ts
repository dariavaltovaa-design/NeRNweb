// PVT parameters from SPEC «Тест уваги (PVT): точні параметри».
// Nothing here is tuned by eye: every number comes from the spec (Basner et al., 2011, PVT-B).

export type TestMode = 'daily' | 'quick' | 'demo';

/** Response faster than this after the stimulus = false start. */
export const FALSE_START_MS = 100;
/** Response this slow or slower = lapse. */
export const LAPSE_MS = 355;
/** A miss (no response within the timeout) counts as a response with this RT. */
export const MISS_RT_MS = 10_000;
/** The very first session in life starts with this many practice stimuli that do not count. */
export const PRACTICE_STIMULI = 3;
/** Frame-drop rule: more than this share of frames longer than FRAME_SLOW × normal. */
export const FRAME_DROP_SHARE = 0.1;
export const FRAME_SLOW = 1.5;

export interface PvtConfig {
  durationMs: number;
  isiMinMs: number;
  isiMaxMs: number;
  feedbackMs: number;
  timeoutMs: number;
  minValidResponses: number;
  checkFrames: boolean;
}

const BASE = { isiMinMs: 1000, isiMaxMs: 4000, feedbackMs: 1000, timeoutMs: 10_000 };

const CONFIGS: Record<TestMode, PvtConfig> = {
  // Decision 2026-09-24: one 60-second test for everyone (was 90 s daily) — a shorter hook.
  daily: { ...BASE, durationMs: 60_000, minValidResponses: 10, checkFrames: true },
  quick: { ...BASE, durationMs: 60_000, minValidResponses: 10, checkFrames: true },
  demo: { ...BASE, durationMs: 60_000, minValidResponses: 10, checkFrames: true },
};

// Only in the e2e build (npm run build:e2e): the same rules on a compressed clock,
// so automated tests do not wait 90 seconds. Never present in the production bundle.
const FAST: Partial<PvtConfig> = {
  durationMs: 5000,
  isiMinMs: 500,
  isiMaxMs: 800,
  feedbackMs: 300,
  timeoutMs: 2000,
  minValidResponses: 3,
  checkFrames: false,
};

export function configFor(mode: TestMode): PvtConfig {
  if (import.meta.env.MODE === 'e2e') return { ...CONFIGS[mode], ...FAST };
  return CONFIGS[mode];
}

export function plannedDurationMs(mode: TestMode): number {
  return CONFIGS[mode].durationMs;
}
