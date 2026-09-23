// Self-experiments — SPEC «Експерименти». One person, two conditions, honest verdict.

import type { Experiment, Profile, Session } from '../db/schema';
import { seededRandom } from '../engine/random';
import { daysBetween } from './dates';
import { calibrationIds } from './form';
import { mean } from './quantile';

export type Condition = 'A' | 'B';
export const MIN_PER_CONDITION = 5;
export const BOOTSTRAP_ITERATIONS = 5000;

/**
 * The plan: which condition each day gets. Default — shuffled pairs: in every pair of days
 * one A and one B in random order. "blocks" — first half A, second half B.
 */
export function buildSchedule(
  experiment: Pick<Experiment, 'schedule' | 'plannedDays' | 'seed'>,
): Condition[] {
  const days = experiment.plannedDays;
  if (experiment.schedule === 'blocks') {
    const half = Math.ceil(days / 2);
    return Array.from({ length: days }, (_, i) => (i < half ? 'A' : 'B'));
  }
  const random = seededRandom(experiment.seed);
  const plan: Condition[] = [];
  while (plan.length < days) {
    plan.push(...(random() < 0.5 ? (['A', 'B'] as const) : (['B', 'A'] as const)));
  }
  return plan.slice(0, days);
}

export function dayIndex(experiment: Experiment, localDate: string): number {
  return daysBetween(experiment.startDate, localDate);
}

/** The condition to live by today (evening habits: tonight; morning habits: this morning). */
export function conditionOn(
  experiment: Experiment,
  localDate: string,
): { day: number; condition: Condition } | null {
  const day = dayIndex(experiment, localDate);
  const condition = buildSchedule(experiment)[day];
  return condition ? { day, condition } : null;
}

/**
 * Which condition a test taken on `localDate` measures. Evening habits are measured by the
 * next morning's test, so the test gets yesterday's condition.
 */
export function conditionForTest(
  experiment: Experiment,
  localDate: string,
): { day: number; condition: Condition } | null {
  const day = dayIndex(experiment, localDate) - (experiment.timing === 'evening' ? 1 : 0);
  const condition = buildSchedule(experiment)[day];
  return condition ? { day, condition } : null;
}

/** Days after which the plan is complete and the last test has been taken. */
export function isFinished(experiment: Experiment, today: string): boolean {
  const lastTestDay = experiment.plannedDays - 1 + (experiment.timing === 'evening' ? 1 : 0);
  return dayIndex(experiment, today) > lastTestDay;
}

export function isInWindow(hour: number, window: Profile['preferredWindow']): boolean {
  if (!window) return true;
  const { startHour, endHour } = window;
  return startHour <= endHour
    ? hour >= startHour && hour <= endHour
    : hour >= startHour || hour <= endHour;
}

/**
 * Sessions that count for the experiment: valid daily tests tagged with it, not calibration,
 * inside the usual test window (±2 h) and without "I did not keep the condition".
 */
export function includedSessions(
  experiment: Experiment,
  sessions: readonly Session[],
  profile: Profile,
): Array<Session & { condition: Condition; metrics: NonNullable<Session['metrics']> }> {
  const calibration = calibrationIds(sessions);
  return sessions.filter(
    (s): s is Session & { condition: Condition; metrics: NonNullable<Session['metrics']> } =>
      s.experimentId === experiment.id &&
      s.condition !== undefined &&
      s.mode === 'daily' &&
      s.validity.ok &&
      s.metrics !== undefined &&
      !calibration.has(s.id) &&
      isInWindow(s.localHour, profile.preferredWindow) &&
      s.checkIn?.conditionKept !== false,
  );
}

/** Δ = 100 · (S̄B − S̄A) / S̄A, in percent. */
export function delta(a: readonly number[], b: readonly number[]): number {
  const meanA = mean(a);
  return (100 * (mean(b) - meanA)) / meanA;
}

/** 95% percentile bootstrap interval for Δ: resample sessions within each condition. */
export function bootstrapInterval(
  a: readonly number[],
  b: readonly number[],
  seed: number,
  iterations = BOOTSTRAP_ITERATIONS,
): [number, number] {
  const random = seededRandom(seed);
  const pick = (list: readonly number[]) => list[Math.floor(random() * list.length)]!;
  const deltas = new Float64Array(iterations);
  for (let i = 0; i < iterations; i++) {
    let sumA = 0;
    let sumB = 0;
    for (let j = 0; j < a.length; j++) sumA += pick(a);
    for (let j = 0; j < b.length; j++) sumB += pick(b);
    const meanA = sumA / a.length;
    deltas[i] = (100 * (sumB / b.length - meanA)) / meanA;
  }
  deltas.sort();
  const at = (p: number) => deltas[Math.min(iterations - 1, Math.floor(p * iterations))]!;
  return [at(0.025), at(0.975)];
}

export type Verdict =
  | { kind: 'not_enough'; nA: number; nB: number; sessionsLeft: number }
  | {
      kind: 'better' | 'worse' | 'noise';
      delta: number;
      interval: [number, number];
      nA: number;
      nB: number;
    };

export function verdict(experiment: Experiment, sessions: readonly Session[], profile: Profile) {
  const included = includedSessions(experiment, sessions, profile);
  const a = included.filter((s) => s.condition === 'A').map((s) => s.metrics.meanSpeed);
  const b = included.filter((s) => s.condition === 'B').map((s) => s.metrics.meanSpeed);
  return verdictFromSpeeds(a, b, experiment.seed);
}

export function verdictFromSpeeds(a: number[], b: number[], seed: number): Verdict {
  if (a.length < MIN_PER_CONDITION || b.length < MIN_PER_CONDITION) {
    const sessionsLeft =
      Math.max(0, MIN_PER_CONDITION - a.length) + Math.max(0, MIN_PER_CONDITION - b.length);
    return { kind: 'not_enough', nA: a.length, nB: b.length, sessionsLeft };
  }
  const d = delta(a, b);
  const interval = bootstrapInterval(a, b, seed);
  const containsZero = interval[0] <= 0 && interval[1] >= 0;
  return {
    kind: containsZero ? 'noise' : d > 0 ? 'better' : 'worse',
    delta: d,
    interval,
    nA: a.length,
    nB: b.length,
  };
}
