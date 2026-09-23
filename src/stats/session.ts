// Session metrics — SPEC «Метрики сеансу».

import type { SessionMetrics, Trial, Validity } from '../db/schema';
import { LAPSE_MS, MISS_RT_MS } from '../engine/config';
import type { EngineFlag } from '../engine/pvt';
import { mean, median } from './quantile';

/**
 * Reaction times that count as responses: every tap with RT ≥ 100 ms, plus every miss
 * counted as 10 000 ms. False starts are not responses.
 */
export function responseTimes(trials: readonly Trial[]): number[] {
  return trials.flatMap((t) => {
    if (t.kind === 'miss') return [MISS_RT_MS];
    if ((t.kind === 'valid' || t.kind === 'lapse') && t.rtMs !== null) return [t.rtMs];
    return [];
  });
}

/** Responses with a real tap (RT ≥ 100 ms), misses excluded — "валідні реакції". */
export function validResponseCount(trials: readonly Trial[]): number {
  return trials.filter((t) => t.kind === 'valid' || t.kind === 'lapse').length;
}

export function computeMetrics(trials: readonly Trial[]): SessionMetrics | undefined {
  const rts = responseTimes(trials);
  if (rts.length === 0) return undefined;
  const reactions = trials.flatMap((t) =>
    (t.kind === 'valid' || t.kind === 'lapse') && t.rtMs !== null ? [t.rtMs] : [],
  );
  return {
    medianRtMs: Math.round(median(rts)),
    ...(reactions.length > 0 ? { meanRtMs: Math.round(mean(reactions)) } : {}),
    // S = mean(1000 / RT), unit 1/s. The main metric: the most sensitive to lost sleep.
    meanSpeed: mean(rts.map((rt) => 1000 / rt)),
    lapses: rts.filter((rt) => rt >= LAPSE_MS).length,
    falseStarts: trials.filter((t) => t.kind === 'false_start').length,
    validTrials: validResponseCount(trials),
  };
}

export function assessValidity(
  trials: readonly Trial[],
  minValidResponses: number,
  flags: readonly EngineFlag[],
): Validity {
  const reasons: Validity['reasons'] = [...flags];
  const valid = validResponseCount(trials);
  const falseStarts = trials.filter((t) => t.kind === 'false_start').length;
  if (valid < minValidResponses) reasons.push('too_few_trials');
  // Decision 2026-09-23: more false starts than real reactions means guessing, not reacting.
  if (falseStarts > valid) reasons.push('too_many_false_starts');
  return { ok: reasons.length === 0, reasons };
}
