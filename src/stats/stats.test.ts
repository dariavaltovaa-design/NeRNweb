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
import { calibrationIds, evaluateForm } from './form';
import { quantile } from './quantile';
import { averageChange, scrollPairs } from './scroll';
import { pickCaption } from './caption';
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

describe('Form', () => {
  it('first 5 valid daily sessions are calibration', () => {
    const list = history([3, 3, 3, 3, 3]);
    expect(evaluateForm(list, list[2]!)).toEqual({ kind: 'calibration', done: 3, total: 5 });
    expect(evaluateForm(list, list[4]!)).toEqual({ kind: 'calibration', done: 5, total: 5 });
  });

  it('invalid sessions do not count towards calibration or Form', () => {
    const list = history([3, 3, 3]);
    const broken = session('2026-09-04', 3, { validity: { ok: false, reasons: ['tab_hidden'] } });
    expect(evaluateForm([...list, broken], broken)).toBeNull();
  });

  it('ceiling = 90th percentile after calibration; capped at 100 with a new peak', () => {
    const list = history([2, 2, 2, 2, 2, 3.0, 3.2, 3.4, 3.6, 3.8]);
    const result = evaluateForm(list, list[9]!);
    expect(result).toMatchObject({ kind: 'form', value: 100, newPeak: true });
    if (result?.kind === 'form') expect(result.ceiling).toBeCloseTo(3.72, 10);
  });

  it('usual range = IQR of Form; below it → "below"', () => {
    const list = history([2, 2, 2, 2, 2, 3.0, 3.2, 3.4, 3.6, 3.8, 3.1]);
    const result = evaluateForm(list, list[10]!);
    // C = 3.7 → Form 84; forms [81, 84, 86, 92, 97, 100] → IQR 84.5…95.75 → 85…96
    expect(result).toEqual({
      kind: 'form',
      value: 84,
      newPeak: false,
      range: { low: 85, high: 96 },
      position: 'below',
      ceiling: expect.closeTo(3.7, 10) as number,
      poolSize: 6,
    });
  });

  it('no usual range until 5 sessions after calibration', () => {
    const list = history([2, 2, 2, 2, 2, 3, 3.1]);
    const result = evaluateForm(list, list[6]!);
    expect(result).toMatchObject({ kind: 'form', range: null, position: null });
  });

  it('only the last 60 days set the ceiling', () => {
    const old = history([2, 2, 2, 2, 2, 9], '2026-01-01'); // a very high old session
    const recent = history([3, 3.2], '2026-09-01');
    const result = evaluateForm([...old, ...recent], recent[1]!);
    expect(result).toMatchObject({ kind: 'form', value: 100 });
  });

  it('a new device starts a new calibration', () => {
    const list = history([3, 3, 3, 3, 3, 3]);
    const other = session('2026-09-10', 3, {
      device: { fingerprint: 'laptop', refreshHz: 120, inputType: 'mouse' },
    });
    expect(evaluateForm([...list, other], other)).toEqual({
      kind: 'calibration',
      done: 1,
      total: 5,
    });
    expect(calibrationIds([...list, other]).has(other.id)).toBe(true);
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

describe('caption of the day', () => {
  const templates = ['a', 'b', 'c', 'd'];

  it('is stable for a date and never repeats the previous day', () => {
    let date = '2026-09-01';
    let previous = pickCaption(templates, addDays(date, -1));
    for (let i = 0; i < 60; i++) {
      const caption = pickCaption(templates, date);
      expect(pickCaption(templates, date)).toBe(caption);
      expect(caption).not.toBe(previous);
      previous = caption;
      date = addDays(date, 1);
    }
  });
});
