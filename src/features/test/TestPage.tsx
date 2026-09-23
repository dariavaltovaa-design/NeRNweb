// SPEC «Екран 3 — Тест». Always the same, whatever the theme or time of day: near-black,
// an amber counter, a faint progress hairline. No buttons, icons or navigation.
// Exit only by swiping down, Esc or the system back, with a confirmation.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useBlocker, useNavigate, useSearchParams } from 'react-router';
import { CONSENT_VERSION } from '../../app/data';
import { contribute } from '../../app/pulse';
import { readPref, writePref } from '../../app/preferences';
import { currentTheme, paintStatusBar } from '../../app/theme';
import { deviceInfo, normaliseRefreshHz } from '../../db/device';
import { useProfile } from '../../db/exists';
import type { DeviceInfo, Session, SessionMetrics, Validity } from '../../db/schema';
import { configFor, plannedDurationMs, PRACTICE_STIMULI, type TestMode } from '../../engine/config';
import { browserClock, measureFrameInterval, PvtEngine, type EngineResult } from '../../engine/pvt';
import { randomSeed } from '../../engine/random';
import { fill } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { localDateOf } from '../../stats/dates';
import { conditionForTest } from '../../stats/experiment';
import { streak, usualRt } from '../../stats/personal';
import { assessValidity, computeMetrics } from '../../stats/session';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { readChallenge } from './challenge';
import { ResultScreen } from './ResultScreen';

type Stage = 'loading' | 'ready' | 'countdown' | 'running' | 'saving' | 'result';

const SWIPE_EXIT_PX = 90;
const COUNTDOWN_R = 44;
const COUNTDOWN_C = 2 * Math.PI * COUNTDOWN_R;
const DIGIT_CELLS = 4;

interface Outcome {
  validity: Validity;
  metrics?: SessionMetrics;
  session: Session;
  saved: boolean;
  personal: { usualRt: number | null; streak: number } | null;
}

export function TestPage() {
  const { m } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const profile = useProfile();
  const challenge = readChallenge(params);
  const pairId = params.get('pair');
  const pairPhase = params.get('phase') === 'after' ? 'after' : 'before';
  // With a profile the test is saved (daily); without one it is shown and kept only if they agree.
  const mode: TestMode = pairId ? 'quick' : profile ? 'daily' : 'demo';

  const [stage, setStage] = useState<Stage>('ready');
  const [count, setCount] = useState(3);
  const [exitOpen, setExitOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

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

  // Ready as soon as we know whether there is a profile (a few ms). Scroll-cost tests need one.
  const shownStage: Stage = profile === undefined ? 'loading' : stage;
  const needsProfile = pairId !== null && profile === null;

  // The status bar matches the test screen while it is on.
  useEffect(() => {
    paintStatusBar(currentTheme(), stage === 'result' ? undefined : 'stimulus');
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

  // ── The finished test ───────────────────────────────────────────────────────
  const handleEnd = useCallback(
    async (engineResult: EngineResult) => {
      setStage('saving');
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
      writePref('warmedUp', '1');

      const validity = assessValidity(
        engineResult.trials,
        configFor(mode).minValidResponses,
        engineResult.flags,
      );
      const metrics = computeMetrics(engineResult.trials);
      const startedAt = startedAtRef.current;
      const localDate = localDateOf(startedAt);
      const hour = new Date(startedAt).getHours();

      const session: Session = {
        id: crypto.randomUUID(),
        startedAt,
        localDate,
        localHour: hour,
        mode: mode === 'demo' ? 'daily' : mode,
        durationMs: plannedDurationMs(mode),
        trials: engineResult.trials,
        device: deviceInfo(normaliseRefreshHz(1000 / frameMsRef.current), inputTypeRef.current),
        validity,
        // Metrics only for valid sessions: an interrupted test never enters the history.
        ...(validity.ok && metrics ? { metrics } : {}),
      };

      if (validity.ok && metrics?.meanRtMs && mode !== 'quick') {
        void contribute(hour, metrics.meanRtMs);
      }

      let saved = false;
      let personal: Outcome['personal'] = null;
      if (mode === 'daily' || mode === 'quick') {
        const repo = await import('../../db/repo');
        if (mode === 'daily') {
          const experiment = await repo.activeExperiment();
          const tagged = experiment ? conditionForTest(experiment, localDate) : null;
          if (experiment && tagged) {
            session.experimentId = experiment.id;
            session.condition = tagged.condition;
            session.experimentDay = tagged.day;
          }
        }
        if (mode === 'quick' && pairId) session.scrollPair = { id: pairId, phase: pairPhase };
        await repo.addSession(session);
        saved = true;
        if (mode === 'daily') {
          const all = await repo.allSessions();
          personal = { usualRt: usualRt(all, localDate), streak: streak(all, localDate) };
        }
      }

      if (blockerRef.current.state === 'blocked') {
        blockerRef.current.proceed();
        return;
      }
      if (mode === 'quick') {
        navigate('/scroll', { replace: true });
        return;
      }
      setOutcome({ validity, ...(metrics ? { metrics } : {}), session, saved, personal });
      setStage('result');
    },
    [mode, navigate, pairId, pairPhase],
  );

  // Someone without a profile agrees at the result screen: create it and keep this test.
  async function saveFirstResult() {
    if (!outcome) return;
    const repo = await import('../../db/repo');
    await repo.saveProfile({
      id: 'me',
      createdAt: Date.now(),
      locale: document.documentElement.lang === 'en' ? 'en' : 'uk',
      ageConfirmed18: true,
      consentVersion: CONSENT_VERSION,
      preferredWindow: {
        startHour: (outcome.session.localHour + 22) % 24,
        endHour: (outcome.session.localHour + 2) % 24,
      },
    });
    await repo.addSession(outcome.session);
  }

  // ── Start: countdown 3–2–1 while measuring the frame rate (rule 8) ──────────
  function begin(pointerType: string) {
    if (shownStage !== 'ready') return;
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

    const cells = Array.from(counter.children) as HTMLElement[];
    const hide = (el: HTMLElement) => (el.style.visibility = 'hidden');
    const show = (el: HTMLElement) => (el.style.visibility = 'visible');
    // Digits go into fixed-width cells, so the running number never jiggles.
    const setDigits = (value: number) => {
      const text = String(Math.min(9999, Math.max(0, Math.floor(value))));
      cells.forEach((cell, i) => {
        const digit = text[i - (DIGIT_CELLS - text.length)] ?? '';
        cell.textContent = digit;
        cell.style.display = digit ? '' : 'none';
      });
      counter.dataset.value = text;
    };

    const engine = new PvtEngine(
      configFor(mode),
      {
        showStimulus: () => {
          hide(message);
          setDigits(0);
          show(counter);
        },
        renderCounter: (ms) => setDigits(ms),
        showResult: (rt) => setDigits(Math.round(rt)),
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
        // Rule 9: practice stimuli only the very first time on this device.
        practiceStimuli: readPref('warmedUp') === '1' ? 0 : PRACTICE_STIMULI,
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
    engineRef.current?.abort();
  }

  // Rule 7: hiding the tab ends the session; it does not count.
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
        if (shownStage !== 'ready' && stage !== 'running') return;
        e.preventDefault();
        if (shownStage === 'ready') begin('mouse');
        else {
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
    if (shownStage === 'ready') {
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

  if (needsProfile) return <Navigate to="/onboarding" replace />;

  if (stage === 'result' && outcome) {
    return (
      <ResultScreen
        validity={outcome.validity}
        metrics={outcome.metrics}
        challenge={challenge}
        personal={outcome.personal}
        unsavedSession={!outcome.saved && outcome.validity.ok ? outcome.session : null}
        onSave={saveFirstResult}
        onAgain={() => {
          engineRef.current = null;
          setOutcome(null);
          setStage('ready');
        }}
      />
    );
  }

  return (
    <main
      className="fixed inset-0 touch-none overflow-hidden bg-stimulus-bg text-stimulus-muted select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (swipeRef.current = null)}
      onPointerCancel={() => (swipeRef.current = null)}
      onContextMenu={(e) => e.preventDefault()}
      data-stage={shownStage}
    >
      <p
        ref={practiceRef}
        aria-live="polite"
        className="kicker absolute inset-x-0 top-[calc(env(safe-area-inset-top)+24px)] text-center"
      />

      {shownStage === 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <p className="kicker mb-6">{m.test.mode}</p>
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
          <span className="absolute font-display text-40 text-stimulus-muted">{count}</span>
        </div>
      )}

      {/* The stimulus. Driven directly by the engine, never by React renders. */}
      <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
        <span
          ref={counterRef}
          style={{ visibility: 'hidden' }}
          className="digits col-start-1 row-start-1 font-display text-96 font-semibold text-stimulus"
          data-testid="counter"
        >
          {Array.from({ length: DIGIT_CELLS }, (_, i) => (
            <span key={i} />
          ))}
        </span>
        <span
          ref={messageRef}
          style={{ visibility: 'hidden' }}
          className="col-start-1 row-start-1 text-28 text-stimulus-muted"
          data-testid="message"
        />
      </div>

      {shownStage === 'ready' && (
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
