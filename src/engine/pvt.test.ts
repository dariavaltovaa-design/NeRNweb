import { describe, expect, it } from 'vitest';
import type { PvtConfig } from './config';
import { isiSequence } from './random';
import { PvtEngine, type Clock, type EngineResult, type PvtView } from './pvt';

const FRAME = 1000 / 60;

/** A fake browser: time moves only when the test says so; frames tick every 16.7 ms. */
class FakeClock implements Clock {
  t = 0;
  private id = 0;
  private timers = new Map<number, { at: number; cb: () => void }>();
  private frames = new Map<number, (ts: number) => void>();
  private nextFrameAt = FRAME;

  now() {
    return this.t;
  }
  frame(cb: (ts: number) => void) {
    this.id += 1;
    this.frames.set(this.id, cb);
    return this.id;
  }
  cancelFrame(id: number) {
    this.frames.delete(id);
  }
  timeout(cb: () => void, ms: number) {
    this.id += 1;
    this.timers.set(this.id, { at: this.t + ms, cb });
    return this.id;
  }
  clearTimeout(id: number) {
    this.timers.delete(id);
  }

  /** Advance to `target`, firing timers and frames in time order. */
  advanceTo(target: number) {
    for (;;) {
      const nextTimer = [...this.timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      const timerAt = nextTimer ? nextTimer[1].at : Infinity;
      const next = Math.min(timerAt, this.nextFrameAt);
      if (next > target) break;
      this.t = next;
      if (nextTimer && timerAt <= this.nextFrameAt) {
        this.timers.delete(nextTimer[0]);
        nextTimer[1].cb();
      } else {
        const callbacks = [...this.frames.values()];
        this.frames.clear();
        this.nextFrameAt += FRAME;
        callbacks.forEach((cb) => cb(this.t));
      }
    }
    this.t = target;
  }

  advance(ms: number) {
    this.advanceTo(this.t + ms);
  }
}

class FakeView implements PvtView {
  events: Array<{ t: number; what: string }> = [];
  practice: number | null = null;
  constructor(private clock: FakeClock) {}
  private log(what: string) {
    this.events.push({ t: this.clock.now(), what });
  }
  showStimulus() {
    this.log('stimulus');
  }
  renderCounter() {}
  showResult() {
    this.log('result');
  }
  showMessage(kind: string) {
    this.log(kind);
  }
  clear() {}
  setProgress() {}
  setPractice(left: number | null) {
    this.practice = left;
  }
}

const CONFIG: PvtConfig = {
  durationMs: 90_000,
  isiMinMs: 1000,
  isiMaxMs: 4000,
  feedbackMs: 1000,
  timeoutMs: 10_000,
  minValidResponses: 15,
  checkFrames: true,
};

function setup(options: { practice?: number; seed?: number; config?: Partial<PvtConfig> } = {}) {
  const clock = new FakeClock();
  const view = new FakeView(clock);
  let result: EngineResult | null = null;
  const engine = new PvtEngine({ ...CONFIG, ...options.config }, view, clock, {
    seed: options.seed ?? 42,
    practiceStimuli: options.practice ?? 0,
    frameMs: FRAME,
    onEnd: (r) => (result = r),
  });
  return { clock, view, engine, getResult: () => result };
}

/** Runs the engine, answering every stimulus `rt` ms after it appears. */
function runResponding(rt: number, options: Parameters<typeof setup>[0] = {}) {
  const ctx = setup(options);
  ctx.engine.start();
  let seen = 0;
  while (!ctx.getResult() && ctx.clock.t < 200_000) {
    ctx.clock.advance(1);
    const shown = ctx.view.events.filter((e) => e.what === 'stimulus').length;
    if (shown > seen) {
      seen = shown;
      const at = ctx.clock.t + rt;
      ctx.clock.timeout(() => ctx.engine.respond(ctx.clock.now()), at - ctx.clock.t);
    }
  }
  return ctx;
}

describe('ISI sequence', () => {
  it('is repeatable with the same seed and stays within 1–4 s', () => {
    const a = isiSequence(7, 100, 1000, 4000);
    expect(isiSequence(7, 100, 1000, 4000)).toEqual(a);
    expect(Math.min(...a)).toBeGreaterThanOrEqual(1000);
    expect(Math.max(...a)).toBeLessThanOrEqual(4000);
  });
});

describe('PVT engine', () => {
  it('runs about 90 s, all pauses within 1–4 s, RT measured from the onset frame', () => {
    const { getResult, view } = runResponding(250);
    const result = getResult();
    expect(result).not.toBeNull();
    const trials = result!.trials;

    expect(result!.timedMs).toBeGreaterThanOrEqual(90_000);
    expect(result!.timedMs).toBeLessThan(90_000 + 4000 + 1000);
    expect(trials.length).toBeGreaterThan(20);
    for (const trial of trials) {
      expect(trial.isiMs).toBeGreaterThanOrEqual(1000);
      expect(trial.isiMs).toBeLessThanOrEqual(4000);
      expect(trial.kind).toBe('valid');
      // Onset is the frame after the DOM change, so RT is up to one frame shorter than 250 ms.
      expect(trial.rtMs!).toBeGreaterThan(250 - FRAME - 0.001);
      expect(trial.rtMs!).toBeLessThanOrEqual(250);
    }
    // The stimulus never appears sooner than the pause after the previous response.
    const stimuli = view.events.filter((e) => e.what === 'stimulus').map((e) => e.t);
    const responses = trials.map((t) => t.responseTs!);
    for (let i = 1; i < stimuli.length; i++) {
      expect(stimuli[i]! - responses[i - 1]!).toBeGreaterThanOrEqual(trials[i]!.isiMs - 0.001);
    }
    expect(result!.flags).toEqual([]);
  });

  it('marks slow responses (≥ 355 ms) as lapses', () => {
    const { getResult } = runResponding(400);
    expect(getResult()!.trials.every((t) => t.kind === 'lapse')).toBe(true);
  });

  it('a tap before the stimulus is a false start and restarts the pause', () => {
    const { clock, view, engine, getResult } = setup();
    engine.start();
    clock.advance(500); // first pause is at least 1000 ms
    engine.respond(clock.now());
    expect(view.events.at(-1)?.what).toBe('too_early');

    const tapAt = clock.now();
    while (!view.events.some((e) => e.what === 'stimulus')) clock.advance(1);
    const shownAt = view.events.find((e) => e.what === 'stimulus')!.t;
    const trial = (engine as unknown as { trials: Array<{ kind: string; isiMs: number }> })
      .trials[0]!;
    expect(trial.kind).toBe('false_start');
    // The new pause is counted from the false start.
    expect(shownAt - tapAt).toBeGreaterThanOrEqual(isiSequence(42, 2, 1000, 4000)[1]!);

    engine.abort();
    expect(getResult()!.flags).toContain('interrupted');
  });

  it('a response under 100 ms after the stimulus is a false start', () => {
    const { getResult } = runResponding(60);
    const kinds = new Set(getResult()!.trials.map((t) => t.kind));
    expect(kinds).toEqual(new Set(['false_start']));
  });

  it('10 s without a response gives a miss', () => {
    const { clock, engine, getResult } = setup({ config: { durationMs: 5000 } });
    engine.start();
    clock.advance(30_000);
    const trials = getResult()!.trials;
    expect(trials[0]!.kind).toBe('miss');
    expect(trials[0]!.rtMs).toBeNull();
  });

  it('hiding the tab ends the session and flags it', () => {
    const { clock, engine, getResult } = setup();
    engine.start();
    clock.advance(10_000);
    engine.markHidden();
    expect(getResult()!.flags).toEqual(['tab_hidden']);
  });

  it('practice stimuli are not recorded and the timer starts after them', () => {
    const { getResult } = runResponding(250, { practice: 3, config: { durationMs: 10_000 } });
    const result = getResult()!;
    expect(result.timedMs).toBeGreaterThanOrEqual(10_000);
    // Each trial takes at least 1 s, so 10 s cannot hold more than 10 recorded trials.
    expect(result.trials.length).toBeLessThanOrEqual(10);
    expect(result.trials.length).toBeGreaterThan(0);
  });

  it('pause and resume keep the remaining time', () => {
    const { clock, engine, getResult } = setup({ config: { durationMs: 10_000 } });
    engine.start();
    clock.advance(4000);
    engine.pause();
    clock.advance(60_000); // the question stays on screen for a minute
    expect(getResult()).toBeNull();
    engine.resume();
    clock.advance(30_000);
    const result = getResult()!;
    expect(result.timedMs).toBeGreaterThanOrEqual(10_000);
    expect(result.timedMs).toBeLessThan(20_000);
  });

  it('flags frame drops when more than 10% of frames are slow', () => {
    const clock = new FakeClock();
    const view = new FakeView(clock);
    let result: EngineResult | null = null;
    // Claim the screen runs at 240 Hz while the fake clock ticks at 60 Hz: every frame is "slow".
    const engine = new PvtEngine({ ...CONFIG, durationMs: 3000 }, view, clock, {
      seed: 1,
      practiceStimuli: 0,
      frameMs: 1000 / 240,
      onEnd: (r) => (result = r),
    });
    engine.start();
    clock.advance(20_000);
    expect(result!.flags).toContain('frame_drops');
  });
});
