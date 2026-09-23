import { describe, expect, it } from 'vitest';
import type { Experiment, Profile, Session, Trial } from '../db/schema';
import { addDays, daysBetween } from './dates';
import {
  bootstrapInterval,
  buildSchedule,
  conditionForTest,
  includedSessions,
  verdictFromSpeeds,
} from './experiment';
import { calibrationIds } from './form';
import { wordFor } from './norms';
import { streak, usualRt } from './personal';
import {
  addContribution,
  emptyAggregate,
  fasterThanPercent,
  isValidContribution,
  summarize,
} from './pulse';
import { quantile } from './quantile';
import { averageChange, scrollPairs } from './scroll';
import { assessValidity, computeMetrics } from './session';

const t = (kind: Trial['kind'], rtMs: number | null): Trial => ({
  isiMs: 2000,
  onsetTs: kind === 'false_start' && rtMs === null ? null : 0,
  responseTs: rtMs,
  rtMs,
  kind,
});

describe('session metrics', () => {
  // RT 250, 400, a miss, a false start after the stimulus (50 ms), a false start before it.
  const trials = [
    t('valid', 250),
    t('lapse', 400),
    t('miss', null),
    t('false_start', 50),
    t('false_start', null),
  ];

  it('S = mean(1000/RT) with misses as 10 000 ms: (4 + 2.5 + 0.1) / 3 = 2.2', () => {
    const m = computeMetrics(trials)!;
    expect(m.meanSpeed).toBeCloseTo(2.2, 10);
  });

  it('median, lapses (≥ 355 ms, misses included), false starts, valid reactions', () => {
    const m = computeMetrics(trials)!;
    expect(m.medianRtMs).toBe(400);
    expect(m.lapses).toBe(2);
    expect(m.falseStarts).toBe(2);
    expect(m.validTrials).toBe(2);
  });

  it('validity: too few reactions, too many false starts, engine flags', () => {
    expect(assessValidity(trials, 15, []).reasons).toEqual(['too_few_trials']);
    const guessing = [t('valid', 300), t('false_start', null), t('false_start', null)];
    expect(assessValidity(guessing, 1, []).reasons).toEqual(['too_many_false_starts']);
    expect(assessValidity([t('valid', 300)], 1, ['tab_hidden'])).toEqual({
      ok: false,
      reasons: ['tab_hidden'],
    });
    expect(assessValidity([t('valid', 300)], 1, []).ok).toBe(true);
  });
});

describe('quantile', () => {
  it('interpolates linearly', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([3.0, 3.2, 3.4, 3.6, 3.8], 0.9)).toBeCloseTo(3.72, 10);
  });
});

describe('dates', () => {
  it('adds days across months and counts them back', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(daysBetween('2026-09-23', '2026-10-07')).toBe(14);
  });
});

let seq = 0;
function session(date: string, speed: number, extra: Partial<Session> = {}): Session {
  seq += 1;
  return {
    id: `s${seq}`,
    startedAt: new Date(`${date}T08:00:00`).getTime() + seq,
    localDate: date,
    localHour: 8,
    mode: 'daily',
    durationMs: 90_000,
    trials: [],
    device: { fingerprint: 'phone', refreshHz: 60, inputType: 'touch' },
    validity: { ok: true, reasons: [] },
    metrics: { medianRtMs: 300, meanSpeed: speed, lapses: 0, falseStarts: 0, validTrials: 20 },
    ...extra,
  };
}

function history(speeds: number[], start = '2026-09-01', extra: Partial<Session> = {}) {
  return speeds.map((s, i) => session(addDays(start, i), s, extra));
}

describe('warm-up sessions', () => {
  it('the first 5 valid daily tests on each device are left out of experiments', () => {
    const list = history([3, 3, 3, 3, 3, 3]);
    const other = session('2026-09-10', 3, {
      device: { fingerprint: 'laptop', refreshHz: 120, inputType: 'mouse' },
    });
    const ids = calibrationIds([...list, other]);
    expect(ids.has(list[4]!.id)).toBe(true);
    expect(ids.has(list[5]!.id)).toBe(false);
    expect(ids.has(other.id)).toBe(true);
  });
});

describe('result word (NeRN scale around the smartphone PVT mean 481 ± 170 ms)', () => {
  it('maps mean RT to one word', () => {
    expect(wordFor(300)).toBe('lightning'); // ≤ 311
    expect(wordFor(350)).toBe('sharp'); // ≤ 396
    expect(wordFor(450)).toBe('alert'); // ≤ 481
    expect(wordFor(520)).toBe('drowsy'); // ≤ 566
    expect(wordFor(700)).toBe('fog');
  });
});

describe('pulse: anonymous average', () => {
  it('adds only valid contributions and counts Ukraine separately', () => {
    expect(isValidContribution({ hour: 8, meanRtMs: 320 })).toBe(true);
    expect(isValidContribution({ hour: 24, meanRtMs: 320 })).toBe(false);
    expect(isValidContribution({ hour: 8, meanRtMs: 50 })).toBe(false);
    expect(isValidContribution({ hour: 8, meanRtMs: 320, id: 'x' })).toBe(true);

    let agg = emptyAggregate();
    agg = addContribution(agg, { hour: 8, meanRtMs: 300 }, true);
    agg = addContribution(agg, { hour: 8, meanRtMs: 400 }, false);
    expect(agg.all.n).toBe(2);
    expect(agg.ua.n).toBe(1);
    expect(agg.ua.hours[8]).toEqual({ n: 1, sum: 300 });
  });

  it('hides averages and percentiles until 20 results', () => {
    let agg = emptyAggregate();
    for (let i = 0; i < 19; i++) agg = addContribution(agg, { hour: 9, meanRtMs: 350 }, true);
    expect(summarize(agg).ua.meanRtMs).toBeNull();
    agg = addContribution(agg, { hour: 9, meanRtMs: 350 }, true);
    expect(summarize(agg).ua.meanRtMs).toBe(350);
    expect(summarize(agg).ua.hours[9]!.meanRtMs).toBe(350);
  });

  it('percentile: share of people slower than you', () => {
    let agg = emptyAggregate();
    for (let i = 0; i < 10; i++) agg = addContribution(agg, { hour: 9, meanRtMs: 300 }, true);
    for (let i = 0; i < 30; i++) agg = addContribution(agg, { hour: 9, meanRtMs: 500 }, true);
    const ua = summarize(agg).ua;
    expect(fasterThanPercent(ua, 250)).toBe(100);
    expect(fasterThanPercent(ua, 400)).toBe(75);
    expect(fasterThanPercent(ua, 900)).toBe(0);
  });
});

describe('personal context', () => {
  it('usual level appears after 3 earlier tests; streak counts days in a row', () => {
    const today = '2026-09-24';
    const list = [
      session('2026-09-21', 1000 / 400, {
        metrics: {
          medianRtMs: 400,
          meanRtMs: 400,
          meanSpeed: 2.5,
          lapses: 0,
          falseStarts: 0,
          validTrials: 15,
        },
      }),
      session('2026-09-22', 1000 / 300, {
        metrics: {
          medianRtMs: 300,
          meanRtMs: 300,
          meanSpeed: 3.3,
          lapses: 0,
          falseStarts: 0,
          validTrials: 15,
        },
      }),
    ];
    expect(usualRt(list, today)).toBeNull();
    list.push(
      session('2026-09-23', 3, {
        metrics: {
          medianRtMs: 350,
          meanRtMs: 350,
          meanSpeed: 2.9,
          lapses: 0,
          falseStarts: 0,
          validTrials: 15,
        },
      }),
    );
    expect(usualRt(list, today)).toBe(350);
    expect(streak(list, today)).toBe(3); // today not tested yet: counts up to yesterday
    list.push(session(today, 3));
    expect(streak(list, today)).toBe(4);
  });
});

const baseExperiment: Experiment = {
  id: 'e1',
  title: 'Телефон поза спальнею',
  conditionA: 'Телефон у спальні',
  conditionB: 'Телефон за дверима',
  schedule: 'alternating',
  timing: 'evening',
  seed: 12345,
  startedAt: 0,
  startDate: '2026-09-10',
  plannedDays: 14,
  status: 'running',
  source: 'library',
};

describe('experiment schedule', () => {
  it('shuffled pairs: every pair has one A and one B; the same seed gives the same plan', () => {
    const plan = buildSchedule(baseExperiment);
    expect(plan).toHaveLength(14);
    for (let i = 0; i < 14; i += 2)
      expect(new Set([plan[i], plan[i + 1]])).toEqual(new Set(['A', 'B']));
    expect(buildSchedule(baseExperiment)).toEqual(plan);
    expect(buildSchedule({ ...baseExperiment, seed: 999 })).not.toEqual(plan);
  });

  it('blocks: 7 days A, then 7 days B', () => {
    expect(buildSchedule({ ...baseExperiment, schedule: 'blocks' }).join('')).toBe(
      'AAAAAAABBBBBBB',
    );
  });

  it('evening habits are measured by the next morning’s test', () => {
    const plan = buildSchedule(baseExperiment);
    expect(conditionForTest(baseExperiment, '2026-09-10')).toBeNull(); // nothing yet on day 0
    expect(conditionForTest(baseExperiment, '2026-09-11')).toEqual({ day: 0, condition: plan[0] });
    const morning = { ...baseExperiment, timing: 'morning' as const };
    expect(conditionForTest(morning, '2026-09-10')).toEqual({ day: 0, condition: plan[0] });
  });
});

describe('experiment exclusions', () => {
  const profile: Profile = {
    id: 'me',
    createdAt: 0,
    locale: 'uk',
    ageConfirmed18: true,
    consentVersion: '2026-09-23',
    preferredWindow: { startHour: 6, endHour: 10 },
  };

  it('drops calibration, out-of-window and "condition not kept" sessions', () => {
    const calibration = history([3, 3, 3, 3, 3], '2026-08-01');
    const tag = { experimentId: 'e1', condition: 'A' as const };
    const ok = session('2026-09-11', 3, tag);
    const late = session('2026-09-12', 3, { ...tag, localHour: 14 });
    const broken = session('2026-09-13', 3, {
      ...tag,
      checkIn: { tags: [], conditionKept: false },
    });
    const calibrationTagged = session('2026-07-01', 3, tag); // oldest → calibration
    const included = includedSessions(
      baseExperiment,
      [...calibration, ok, late, broken, calibrationTagged],
      profile,
    );
    expect(included.map((s) => s.id)).toEqual([ok.id]);
  });
});

describe('verdicts', () => {
  const A = [3.0, 3.05, 2.95, 3.02, 2.98];
  const B = [3.5, 3.55, 3.45, 3.52, 3.48];

  it('not enough data: fewer than 5 sessions in a condition', () => {
    expect(verdictFromSpeeds(A.slice(0, 4), B, 1)).toEqual({
      kind: 'not_enough',
      nA: 4,
      nB: 5,
      sessionsLeft: 1,
    });
  });

  it('clearly better with B', () => {
    const v = verdictFromSpeeds(A, B, 1);
    expect(v.kind).toBe('better');
    if (v.kind === 'better') expect(v.delta).toBeCloseTo(16.6, 0);
  });

  it('clearly worse with B', () => {
    expect(verdictFromSpeeds(B, A, 1).kind).toBe('worse');
  });

  it('within the noise', () => {
    const v = verdictFromSpeeds([3.0, 3.4, 2.8, 3.3, 2.9], [3.1, 2.9, 3.3, 3.0, 3.2], 1);
    expect(v.kind).toBe('noise');
  });

  it('bootstrap interval is the same with the same seed', () => {
    expect(bootstrapInterval(A, B, 7)).toEqual(bootstrapInterval(A, B, 7));
  });
});

describe('scroll cost', () => {
  it('pairs before/after tests and averages only after 5 pairs', () => {
    const quick = { mode: 'quick' as const };
    const sessions: Session[] = [];
    for (let i = 0; i < 5; i++) {
      sessions.push(
        session('2026-09-20', 3, { ...quick, scrollPair: { id: `p${i}`, phase: 'before' } }),
      );
      sessions.push(
        session('2026-09-20', 2.7, { ...quick, scrollPair: { id: `p${i}`, phase: 'after' } }),
      );
    }
    const pairs = scrollPairs(sessions);
    expect(pairs).toHaveLength(5);
    expect(pairs[0]!.change).toBeCloseTo(-10, 10);
    expect(averageChange(pairs)).toBeCloseTo(-10, 10);
    expect(averageChange(pairs.slice(0, 4))).toBeNull();
  });
});
