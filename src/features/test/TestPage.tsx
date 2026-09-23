// SPEC «Екран 3 — Тест». Always the same, whatever the theme or time of day: near-black,
// an amber monospaced counter, a faint progress hairline. No buttons, icons or navigation.
// Exit only by swiping down or the system back, with a confirmation.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate, useSearchParams } from 'react-router';
import { currentTheme, paintStatusBar } from '../../app/theme';
import { deviceInfo, normaliseRefreshHz } from '../../db/device';
import { activeExperiment, addSession, allSessions, getProfile } from '../../db/repo';
import type { DeviceInfo, Session, SessionMetrics, Validity } from '../../db/schema';
import { configFor, plannedDurationMs, PRACTICE_STIMULI, type TestMode } from '../../engine/config';
import { browserClock, measureFrameInterval, PvtEngine, type EngineResult } from '../../engine/pvt';
import { randomSeed } from '../../engine/random';
import { fill } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { localDateOf } from '../../stats/dates';
import { conditionForTest } from '../../stats/experiment';
import { assessValidity, computeMetrics } from '../../stats/session';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { ResultView } from './ResultView';

type Stage = 'loading' | 'ready' | 'countdown' | 'running' | 'saving' | 'result';

const SWIPE_EXIT_PX = 90;
const COUNTDOWN_R = 44;
const COUNTDOWN_C = 2 * Math.PI * COUNTDOWN_R;

function parseMode(value: string | null): TestMode {
  return value === 'daily' || value === 'quick' ? value : 'demo';
}

export function TestPage() {
  const { m } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = parseMode(params.get('mode'));
  const pairId = params.get('pair');
  const pairPhase = params.get('phase') === 'after' ? 'after' : 'before';

  const [stage, setStage] = useState<Stage>('loading');
  const [count, setCount] = useState(3);
  const [practice, setPractice] = useState(0);
  const [exitOpen, setExitOpen] = useState(false);
  const [result, setResult] = useState<{ validity: Validity; metrics?: SessionMetrics } | null>(
    null,
  );

  const engineRef = useRef<PvtEngine | null>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const messageRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const practiceRef = useRef<HTMLParagraphElement>(null);
  const inputTypeRef = useRef<DeviceInfo['inputType']>('touch');
  const frameMsRef = useRef(1000 / 60);
  const startedAtRef = useRef(0);
  const swipeRef = useRef<{ y: number; trialsBefore: number; done: boolean } | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timersRef = useRef<number[]>([]);

  const running = stage === 'running';
  const blocker = useBlocker(running);
  const blockerRef = useRef(blocker);
  useEffect(() => {
    blockerRef.current = blocker;
  });

  // ── Who is testing: daily and quick tests need the 18+ profile ──────────────
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (mode === 'demo') {
        setStage('ready');
        return;
      }
      const profile = await getProfile();
      if (!profile) {
        navigate('/onboarding', { replace: true });
        return;
      }
      // Rule 9: the very first session in life starts with 3 practice stimuli.
      const first = (await allSessions()).length === 0;
      if (!cancelled) {
        setPractice(first ? PRACTICE_STIMULI : 0);
        setStage('ready');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, navigate]);

  // The status bar matches the test screen while it is on.
  useEffect(() => {
    const onTestScreen = stage !== 'result';
    paintStatusBar(currentTheme(), onTestScreen ? 'stimulus' : undefined);
    return () => paintStatusBar(currentTheme());
  }, [stage]);

  useEffect(() => {
    document.title = 'NeRN';
    const timers = timersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      engineRef.current?.abort();
      void wakeLockRef.current?.release().catch(() => undefined);
    };
  }, []);

  // ── Saving the finished session ─────────────────────────────────────────────
  const handleEnd = useCallback(
    async (engineResult: EngineResult) => {
      setStage('saving');
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;

      const config = configFor(mode);
      const validity = assessValidity(
        engineResult.trials,
        config.minValidResponses,
        engineResult.flags,
      );
      const metrics = computeMetrics(engineResult.trials);

      if (mode === 'demo') {
        setResult({ validity, metrics });
        if (blockerRef.current.state === 'blocked') blockerRef.current.proceed();
        else setStage('result');
        return;
      }

      const startedAt = startedAtRef.current;
      const localDate = localDateOf(startedAt);
      const session: Session = {
        id: crypto.randomUUID(),
        startedAt,
        localDate,
        localHour: new Date(startedAt).getHours(),
        mode,
        durationMs: plannedDurationMs(mode),
        trials: engineResult.trials,
        device: deviceInfo(normaliseRefreshHz(1000 / frameMsRef.current), inputTypeRef.current),
        validity,
        // Metrics only for valid sessions: an interrupted test never enters the Form.
        ...(validity.ok && metrics ? { metrics } : {}),
      };

      if (mode === 'daily') {
        const experiment = await activeExperiment();
        const tagged = experiment ? conditionForTest(experiment, localDate) : null;
        if (experiment && tagged) {
          session.experimentId = experiment.id;
          session.condition = tagged.condition;
          session.experimentDay = tagged.day;
        }
      }
      if (mode === 'quick' && pairId) session.scrollPair = { id: pairId, phase: pairPhase };

      await addSession(session);

      if (blockerRef.current.state === 'blocked') {
        blockerRef.current.proceed();
        return;
      }
      navigate(mode === 'daily' ? '/today' : '/scroll', { replace: true });
    },
    [mode, navigate, pairId, pairPhase],
  );

  // ── Start: countdown 3–2–1 while measuring the frame rate (rule 8) ──────────
  function begin(pointerType: string) {
    if (stage !== 'ready') return;
    inputTypeRef.current = pointerType === 'mouse' || pointerType === 'pen' ? pointerType : 'touch';
    setStage('countdown');
    setCount(3);
    void navigator.wakeLock
      ?.request('screen')
      .then((lock) => (wakeLockRef.current = lock))
      .catch(() => undefined);
    void measureFrameInterval(browserClock).then((ms) => (frameMsRef.current = ms));

    timersRef.current.push(
      window.setTimeout(() => setCount(2), 1000),
      window.setTimeout(() => setCount(1), 2000),
      window.setTimeout(() => startEngine(), 3000),
    );
  }

  function startEngine() {
    const counter = counterRef.current;
    const message = messageRef.current;
    const bar = progressRef.current;
    const practiceLabel = practiceRef.current;
    if (!counter || !message || !bar || !practiceLabel) return;

    const hide = (el: HTMLElement) => (el.style.visibility = 'hidden');
    const show = (el: HTMLElement) => (el.style.visibility = 'visible');

    const engine = new PvtEngine(
      configFor(mode),
      {
        showStimulus: () => {
          hide(message);
          counter.textContent = '0';
          show(counter);
        },
        renderCounter: (ms) => {
          counter.textContent = String(Math.floor(ms));
        },
        showResult: (rt) => {
          counter.textContent = String(Math.round(rt));
        },
        showMessage: (kind) => {
          hide(counter);
          message.textContent = kind === 'too_early' ? m.test.tooEarly : m.test.miss;
          show(message);
        },
        clear: () => {
          hide(counter);
          hide(message);
        },
        setProgress: (fraction) => {
          bar.style.transform = `scaleX(${fraction})`;
        },
        setPractice: (left) => {
          practiceLabel.textContent = left ? fill(m.test.practice, { n: left }) : '';
        },
      },
      browserClock,
      {
        seed: randomSeed(),
        practiceStimuli: practice,
        frameMs: frameMsRef.current,
        onEnd: (r) => void handleEnd(r),
      },
    );
    engineRef.current = engine;
    startedAtRef.current = Date.now();
    setStage('running');
    engine.start();
  }

  // ── Exit: swipe down, Esc, or system back — always with a question ──────────
  const askExit = useCallback(() => {
    engineRef.current?.pause();
    setExitOpen(true);
  }, []);

  // System back while running: the router holds the navigation; freeze and ask.
  const exitVisible = exitOpen || blocker.state === 'blocked';
  useEffect(() => {
    if (blocker.state === 'blocked') engineRef.current?.pause();
  }, [blocker.state]);

  function continueTest() {
    setExitOpen(false);
    if (blockerRef.current.state === 'blocked') blockerRef.current.reset();
    engineRef.current?.resume();
  }

  function stopTest() {
    setExitOpen(false);
    engineRef.current?.abort(); // → handleEnd saves it as interrupted (daily) and leaves
  }

  // Rule 7: hiding the tab ends the session; it is kept but does not count.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') engineRef.current?.markHidden();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Keyboard (web): Space/Enter answers, Esc asks to exit.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (exitVisible || e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (stage === 'ready') begin('mouse');
        else if (stage === 'running') {
          inputTypeRef.current = 'mouse';
          engineRef.current?.respond(e.timeStamp);
        }
      } else if (e.key === 'Escape') {
        if (stage === 'running') askExit();
        else if (stage === 'ready') navigate(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function onPointerDown(e: React.PointerEvent) {
    if (exitVisible) return;
    if (stage === 'ready') {
      begin(e.pointerType);
      return;
    }
    const engine = engineRef.current;
    if (stage !== 'running' || !engine) return;
    const trialsBefore = engine.trialCount;
    // Rule 3: the moment of the reaction is the event's own timestamp.
    engine.respond(e.nativeEvent.timeStamp);
    swipeRef.current = { y: e.clientY, trialsBefore, done: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const swipe = swipeRef.current;
    if (!swipe || swipe.done || e.clientY - swipe.y < SWIPE_EXIT_PX) return;
    swipe.done = true;
    // The tap that started the swipe was not a reaction: take it back.
    engineRef.current?.pause();
    engineRef.current?.dropTrialsAfter(swipe.trialsBefore);
    setExitOpen(true);
  }

  if (stage === 'result' && result) {
    return (
      <ResultView
        mode={mode}
        validity={result.validity}
        metrics={result.metrics}
        onAgain={() => {
          engineRef.current = null;
          setResult(null);
          setStage('ready');
        }}
      />
    );
  }

  const modeLabel =
    mode === 'daily' ? m.test.modeDaily : mode === 'quick' ? m.test.modeQuick : m.test.modeDemo;

  return (
    <main
      className="fixed inset-0 touch-none overflow-hidden bg-stimulus-bg text-stimulus-muted select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (swipeRef.current = null)}
      onPointerCancel={() => (swipeRef.current = null)}
      onContextMenu={(e) => e.preventDefault()}
      data-stage={stage}
    >
      <p
        ref={practiceRef}
        aria-live="polite"
        className="kicker absolute inset-x-0 top-[calc(env(safe-area-inset-top)+24px)] text-center"
      />

      {stage === 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <p className="kicker mb-6">{modeLabel}</p>
          <p className="text-20 text-stimulus-muted">{m.test.start}</p>
          <p className="mt-3 text-14 text-stimulus-muted">{m.test.hint}</p>
        </div>
      )}

      {stage === 'countdown' && (
        <div className="absolute inset-0 grid place-items-center" aria-live="assertive">
          <svg viewBox="0 0 100 100" className="size-28" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r={COUNTDOWN_R}
              fill="none"
              stroke="var(--stimulus-faint)"
              strokeWidth="1"
            />
            <circle
              key={count}
              cx="50"
              cy="50"
              r={COUNTDOWN_R}
              fill="none"
              stroke="var(--stimulus-muted)"
              strokeWidth="1.5"
              strokeDasharray={COUNTDOWN_C}
              transform="rotate(-90 50 50)"
              style={
                {
                  '--circumference': COUNTDOWN_C,
                  animation: 'countdown 1s linear forwards',
                } as React.CSSProperties
              }
            />
          </svg>
          <span className="absolute font-mono text-40 text-stimulus-muted">{count}</span>
        </div>
      )}

      {/* The stimulus. Driven directly by the engine, never by React renders. */}
      <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
        <span
          ref={counterRef}
          style={{ visibility: 'hidden' }}
          className="col-start-1 row-start-1 font-mono text-96 font-medium text-stimulus"
          data-testid="counter"
        />
        <span
          ref={messageRef}
          style={{ visibility: 'hidden' }}
          className="col-start-1 row-start-1 text-28 text-stimulus-muted"
          data-testid="message"
        />
      </div>

      {stage === 'ready' && (
        <p className="kicker absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+40px)] text-center">
          <span className="pointer-fine:hidden">{m.test.swipeHint}</span>
          <span className="hidden pointer-fine:inline">{m.test.keyboardHint}</span>
        </p>
      )}

      <div
        ref={progressRef}
        className="absolute inset-x-0 bottom-[env(safe-area-inset-bottom)] h-px origin-left bg-stimulus-faint"
        style={{ transform: 'scaleX(0)' }}
      />

      <Dialog open={exitVisible} onClose={continueTest} title={m.test.exitTitle}>
        <p className="text-16 text-muted">{m.test.exitText}</p>
        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={continueTest} wide>
            {m.test.exitCancel}
          </Button>
          <Button onClick={stopTest} variant="secondary" wide>
            {m.test.exitConfirm}
          </Button>
        </div>
      </Dialog>
    </main>
  );
}
