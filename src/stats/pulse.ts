// «Середнє по Україні»: an anonymous running aggregate. Each contribution is one number
// (mean reaction time) and the local hour. No ids, no dates, no raw trials.
// Shared by the Netlify function (server) and the app (reading the summary).

export const BIN_MS = 25;
export const MIN_RT = 100;
export const MAX_RT = 1500;
const BINS = Math.ceil((MAX_RT - MIN_RT) / BIN_MS);
/** Below this many results an average or percentile would mislead, so it is not shown. */
export const MIN_SHOWN = 20;

export interface Scope {
  n: number;
  sum: number;
  hours: Array<{ n: number; sum: number }>;
  bins: number[];
}

export interface Aggregate {
  version: 1;
  ua: Scope;
  all: Scope;
}

export interface Contribution {
  hour: number;
  meanRtMs: number;
}

function emptyScope(): Scope {
  return {
    n: 0,
    sum: 0,
    hours: Array.from({ length: 24 }, () => ({ n: 0, sum: 0 })),
    bins: Array.from({ length: BINS }, () => 0),
  };
}

export function emptyAggregate(): Aggregate {
  return { version: 1, ua: emptyScope(), all: emptyScope() };
}

export function isValidContribution(value: unknown): value is Contribution {
  if (typeof value !== 'object' || value === null) return false;
  const { hour, meanRtMs } = value as Record<string, unknown>;
  return (
    Number.isInteger(hour) &&
    (hour as number) >= 0 &&
    (hour as number) <= 23 &&
    typeof meanRtMs === 'number' &&
    meanRtMs >= MIN_RT &&
    meanRtMs <= MAX_RT
  );
}

function addTo(scope: Scope, { hour, meanRtMs }: Contribution): void {
  scope.n += 1;
  scope.sum += meanRtMs;
  const bucket = scope.hours[hour];
  if (bucket) {
    bucket.n += 1;
    bucket.sum += meanRtMs;
  }
  const bin = Math.min(BINS - 1, Math.floor((meanRtMs - MIN_RT) / BIN_MS));
  scope.bins[bin] = (scope.bins[bin] ?? 0) + 1;
}

/** Returns a new aggregate with the contribution added (to Ukraine only if the country is UA). */
export function addContribution(
  aggregate: Aggregate,
  contribution: Contribution,
  inUkraine: boolean,
): Aggregate {
  const next = structuredClone(aggregate);
  addTo(next.all, contribution);
  if (inUkraine) addTo(next.ua, contribution);
  return next;
}

export interface ScopeSummary {
  n: number;
  meanRtMs: number | null;
  hours: Array<{ n: number; meanRtMs: number | null }>;
  bins: number[];
}

export interface PulseSummary {
  ua: ScopeSummary;
  all: ScopeSummary;
}

function summarizeScope(scope: Scope): ScopeSummary {
  return {
    n: scope.n,
    meanRtMs: scope.n >= MIN_SHOWN ? Math.round(scope.sum / scope.n) : null,
    hours: scope.hours.map((h) => ({
      n: h.n,
      meanRtMs: h.n >= MIN_SHOWN ? Math.round(h.sum / h.n) : null,
    })),
    bins: scope.n >= MIN_SHOWN ? scope.bins : [],
  };
}

export function summarize(aggregate: Aggregate): PulseSummary {
  return { ua: summarizeScope(aggregate.ua), all: summarizeScope(aggregate.all) };
}

/** Share of people in the scope who were slower than `meanRtMs`, 0–100; null with too little data. */
export function fasterThanPercent(scope: ScopeSummary, meanRtMs: number): number | null {
  if (scope.n < MIN_SHOWN || scope.bins.length === 0) return null;
  const myBin = Math.floor((meanRtMs - MIN_RT) / BIN_MS);
  let slower = 0;
  scope.bins.forEach((count, i) => {
    if (i > myBin) slower += count;
    else if (i === myBin) slower += count / 2; // half of the people in the same 25 ms bin
  });
  return Math.round((100 * slower) / scope.n);
}
