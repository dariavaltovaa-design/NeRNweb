// The attention test engine (PVT). Plain TypeScript, no React: timing must not depend on renders.
// SPEC «Правила рушія» — the numbers in comments refer to those rules.

import type { Trial } from '../db/schema';
import { FALSE_START_MS, FRAME_DROP_SHARE, FRAME_SLOW, LAPSE_MS, type PvtConfig } from './config';
import { isiSequence } from './random';

/** Time and frames. The browser version is below; tests pass a fake one. */
export interface Clock {
  now(): number;
  frame(callback: (timestamp: number) => void): number;
  cancelFrame(id: number): void;
  timeout(callback: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

export const browserClock: Clock = {
  now: () => performance.now(),
  frame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (id) => cancelAnimationFrame(id),
  timeout: (callback, ms) => window.setTimeout(callback, ms),
  clearTimeout: (id) => window.clearTimeout(id),
};

/**
 * What the engine changes on screen. Called directly (not through React state),
 * so the stimulus appears exactly in the animation frame the engine chose.
 */
export interface PvtView {
  showStimulus(): void;
  /** Rule 4: the counter only visualises, it computes nothing. */
  renderCounter(ms: number): void;
  showResult(rtMs: number): void;
  showMessage(kind: 'too_early' | 'miss'): void;
  clear(): void;
  setProgress(fraction: number): void;
  /** Practice stimuli left, or null when the real test is running. */
  setPractice(left: number | null): void;
}

export type EngineFlag = 'tab_hidden' | 'interrupted' | 'frame_drops';

export interface EngineResult {
  trials: Trial[];
  flags: EngineFlag[];
  /** How long the timed part actually ran. */
  timedMs: number;
}

type Phase =
  | 'idle'
  | 'feedback' // result or "too early" on screen; part of the pause (rule 1)
  | 'waiting' // blank screen until the stimulus
  | 'armed' // pause is over, the stimulus appears in the next frame
  | 'shown' // stimulus drawn, onset is recorded in the next frame (rule 2)
  | 'stimulus' // counter running
  | 'paused'
  | 'done';

export class PvtEngine {
  private phase: Phase = 'idle';
  private readonly trials: Trial[] = [];
  private readonly isis: number[];
  private isiIndex = 0;
  private currentIsi = 0;
  private onsetTs: number | null = null;

  private pauseTimer: number | null = null; // end of the pause → stimulus
  private feedbackTimer: number | null = null; // end of feedback → blank
  private missTimer: number | null = null; // 10 s without a response
  private endTimer: number | null = null;
  private frameId: number | null = null;

  private practiceLeft: number;
  private timedStart: number | null = null;
  private timedElapsedBeforePause = 0;
  private timeUp = false;
  private readonly flags = new Set<EngineFlag>();

  private lastFrameTs: number | null = null;
  private frames = 0;
  private slowFrames = 0;

  constructor(
    private readonly config: PvtConfig,
    private readonly view: PvtView,
    private readonly clock: Clock,
    private readonly options: {
      seed: number;
      practiceStimuli: number;
      /** Normal frame interval measured before the test (rule 8). */
      frameMs: number;
      onEnd: (result: EngineResult) => void;
    },
  ) {
    // Rule 1: the pauses are generated in advance from a seed. 400 is far more than any session needs.
    this.isis = isiSequence(options.seed, 400, config.isiMinMs, config.isiMaxMs);
    this.practiceLeft = options.practiceStimuli;
  }

  get isRunning(): boolean {
    return this.phase !== 'idle' && this.phase !== 'done';
  }

  get trialCount(): number {
    return this.trials.length;
  }

  start(): void {
    if (this.phase !== 'idle') return;
    this.view.setPractice(this.practiceLeft > 0 ? this.practiceLeft : null);
    if (this.practiceLeft === 0) this.beginTimed();
    this.startPause(this.clock.now(), false);
    this.requestFrame();
  }

  /** A tap (pointerdown) or key press. `timestamp` is event.timeStamp (rule 3). */
  respond(timestamp: number): void {
    switch (this.phase) {
      case 'waiting':
      case 'armed':
      case 'shown':
        // Rule 5: a touch before the stimulus is a false start. In "shown" the frame with the
        // stimulus has not been confirmed yet, so the reaction would be under one frame anyway.
        this.record({ onsetTs: null, responseTs: timestamp, rtMs: null, kind: 'false_start' });
        this.view.showMessage('too_early');
        this.startPause(timestamp);
        return;

      case 'stimulus': {
        const onset = this.onsetTs ?? timestamp;
        const rt = timestamp - onset;
        this.clearMissTimer();
        if (rt < FALSE_START_MS) {
          this.record({ onsetTs: onset, responseTs: timestamp, rtMs: rt, kind: 'false_start' });
          this.view.showMessage('too_early');
        } else {
          this.record({
            onsetTs: onset,
            responseTs: timestamp,
            rtMs: rt,
            kind: rt >= LAPSE_MS ? 'lapse' : 'valid',
          });
          this.view.showResult(rt);
          this.countPracticeStimulus();
        }
        this.startPause(timestamp);
        return;
      }

      default:
        // Feedback on screen, paused, finished: taps are ignored.
        return;
    }
  }

  /** Rule 7: the tab was hidden. Data is kept, the session will not count. */
  markHidden(): void {
    if (!this.isRunning) return;
    this.flags.add('tab_hidden');
    this.finish();
  }

  /** The person chose to stop. */
  abort(): void {
    if (!this.isRunning) return;
    this.flags.add('interrupted');
    this.finish();
  }

  /** Freeze while the "stop the test?" question is on screen. The unfinished stimulus is dropped. */
  pause(): void {
    if (!this.isRunning || this.phase === 'paused') return;
    this.clearAllTimers();
    if (this.timedStart !== null) {
      this.timedElapsedBeforePause += this.clock.now() - this.timedStart;
      this.timedStart = null;
    }
    this.phase = 'paused';
    this.lastFrameTs = null;
    this.view.clear();
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    if (this.practiceLeft === 0) {
      this.timedStart = this.clock.now();
      const left = this.config.durationMs - this.timedElapsedBeforePause;
      this.endTimer = this.clock.timeout(() => this.onTimeUp(), Math.max(0, left));
    }
    this.startPause(this.clock.now(), false);
    this.requestFrame();
  }

  /** Removes trials recorded after `count` (used when a swipe-to-exit started with a tap). */
  dropTrialsAfter(count: number): void {
    this.trials.length = Math.min(this.trials.length, count);
  }

  // ─── internals ───────────────────────────────────────────────────────────

  private beginTimed(): void {
    this.timedStart = this.clock.now();
    this.endTimer = this.clock.timeout(() => this.onTimeUp(), this.config.durationMs);
  }

  private timedElapsed(): number {
    const running = this.timedStart === null ? 0 : this.clock.now() - this.timedStart;
    return this.timedElapsedBeforePause + running;
  }

  /**
   * Rule 1: the pause runs from the response (or false start, or miss) to the next stimulus.
   * Its first second shows the feedback; at the very start and after a resume there is none.
   */
  private startPause(from: number, withFeedback = true): void {
    this.clearPauseTimers();
    this.currentIsi = this.nextIsi();
    const sinceFrom = Math.max(0, this.clock.now() - from);

    if (withFeedback) {
      this.phase = 'feedback';
      this.feedbackTimer = this.clock.timeout(
        () => this.onFeedbackEnd(),
        Math.max(0, this.config.feedbackMs - sinceFrom),
      );
    } else {
      this.phase = 'waiting';
    }
    this.pauseTimer = this.clock.timeout(
      () => this.onPauseEnd(),
      Math.max(0, this.currentIsi - sinceFrom),
    );
  }

  private onFeedbackEnd(): void {
    this.feedbackTimer = null;
    if (this.phase !== 'feedback') return;
    this.view.clear();
    if (this.timeUp) {
      this.finish();
      return;
    }
    this.phase = 'waiting';
  }

  private onPauseEnd(): void {
    this.pauseTimer = null;
    if (this.phase === 'feedback') {
      // Feedback and pause ended together (pause = feedback length).
      this.view.clear();
      if (this.timeUp) {
        this.finish();
        return;
      }
    } else if (this.phase !== 'waiting') {
      return;
    }
    this.phase = 'armed';
  }

  private onFrame(timestamp: number): void {
    this.frameId = null;
    if (!this.isRunning || this.phase === 'paused') return;

    this.trackFrame(timestamp);

    if (this.phase === 'armed') {
      // Rule 2: change the DOM inside the animation frame…
      this.view.showStimulus();
      this.phase = 'shown';
    } else if (this.phase === 'shown') {
      // …and record the onset in the next one, when that frame is already on screen.
      this.onsetTs = timestamp;
      this.phase = 'stimulus';
      this.missTimer = this.clock.timeout(() => this.onMiss(), this.config.timeoutMs);
      this.view.renderCounter(0);
    } else if (this.phase === 'stimulus' && this.onsetTs !== null) {
      this.view.renderCounter(timestamp - this.onsetTs);
    }

    if (this.timedStart !== null) {
      this.view.setProgress(Math.min(1, this.timedElapsed() / this.config.durationMs));
    }
    this.requestFrame();
  }

  private onMiss(): void {
    this.missTimer = null;
    if (this.phase !== 'stimulus') return;
    this.record({ onsetTs: this.onsetTs, responseTs: null, rtMs: null, kind: 'miss' });
    this.view.showMessage('miss');
    this.countPracticeStimulus();
    this.startPause(this.clock.now());
  }

  private onTimeUp(): void {
    this.endTimer = null;
    this.timeUp = true;
    // Mid-stimulus: let the person answer (or time out) first; the feedback end will finish.
    if (this.phase === 'waiting' || this.phase === 'armed') this.finish();
  }

  /** Rule 9: practice stimuli are not recorded; the timed part begins after the last one. */
  private countPracticeStimulus(): void {
    if (this.practiceLeft === 0) return;
    this.practiceLeft -= 1;
    this.view.setPractice(this.practiceLeft > 0 ? this.practiceLeft : null);
    if (this.practiceLeft === 0) this.beginTimed();
  }

  private record(trial: Omit<Trial, 'isiMs'>): void {
    const isPractice = this.practiceLeft > 0;
    if (!isPractice) this.trials.push({ isiMs: this.currentIsi, ...trial });
    this.onsetTs = null;
  }

  /** Rule 8: count frames that took much longer than normal during the timed part. */
  private trackFrame(timestamp: number): void {
    if (this.timedStart !== null && this.lastFrameTs !== null) {
      this.frames += 1;
      if (timestamp - this.lastFrameTs > FRAME_SLOW * this.options.frameMs) this.slowFrames += 1;
    }
    this.lastFrameTs = timestamp;
  }

  private nextIsi(): number {
    const isi = this.isis[this.isiIndex % this.isis.length] ?? this.config.isiMinMs;
    this.isiIndex += 1;
    return isi;
  }

  private requestFrame(): void {
    if (this.frameId === null) this.frameId = this.clock.frame((ts) => this.onFrame(ts));
  }

  private finish(): void {
    const timedMs = this.timedElapsed();
    this.clearAllTimers();
    if (this.frameId !== null) this.clock.cancelFrame(this.frameId);
    this.frameId = null;
    this.phase = 'done';

    if (
      this.config.checkFrames &&
      this.frames > 0 &&
      this.slowFrames / this.frames > FRAME_DROP_SHARE
    ) {
      this.flags.add('frame_drops');
    }
    this.view.clear();
    this.options.onEnd({ trials: [...this.trials], flags: [...this.flags], timedMs });
  }

  private clearPauseTimers(): void {
    if (this.feedbackTimer !== null) this.clock.clearTimeout(this.feedbackTimer);
    if (this.pauseTimer !== null) this.clock.clearTimeout(this.pauseTimer);
    this.feedbackTimer = null;
    this.pauseTimer = null;
  }

  private clearMissTimer(): void {
    if (this.missTimer !== null) this.clock.clearTimeout(this.missTimer);
    this.missTimer = null;
  }

  private clearAllTimers(): void {
    this.clearPauseTimers();
    this.clearMissTimer();
    if (this.endTimer !== null) this.clock.clearTimeout(this.endTimer);
    this.endTimer = null;
  }
}

/** Rule 8: average frame interval over ~1 second, measured before the test starts. */
export function measureFrameInterval(clock: Clock, sampleMs = 1000): Promise<number> {
  return new Promise((resolve) => {
    const stamps: number[] = [];
    const tick = (timestamp: number) => {
      stamps.push(timestamp);
      const first = stamps[0] ?? timestamp;
      if (timestamp - first >= sampleMs && stamps.length > 2) {
        resolve((timestamp - first) / (stamps.length - 1));
      } else {
        clock.frame(tick);
      }
    };
    clock.frame(tick);
  });
}
