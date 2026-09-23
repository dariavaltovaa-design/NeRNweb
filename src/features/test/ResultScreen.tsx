// The result screen is the product: one word, one number, three comparisons, one challenge.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { isContributing, setContributing, usePulse } from '../../app/pulse';
import { readPref, writePref } from '../../app/preferences';
import type { Session, SessionMetrics, Validity } from '../../db/schema';
import { fill } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import type { Messages } from '../../i18n/messages';
import { SMARTPHONE_NORM, scalePosition, wordFor, type Word } from '../../stats/norms';
import { fasterThanPercent } from '../../stats/pulse';
import { Button } from '../../ui/Button';
import { Toggle } from '../../ui/Controls';
import { Kicker, Stat } from '../../ui/Heading';
import { CountUp } from '../../ui/Motion';
import { challengeUrl, shareChallenge, type Challenge } from './challenge';

const WORDS: Word[] = ['lightning', 'sharp', 'alert', 'drowsy', 'fog'];

/** «Interrupted» only when it really was; otherwise a plain "this one doesn't count". */
export function invalidTitle(validity: Validity, m: Messages): string {
  const interrupted = validity.reasons.some((r) => r === 'tab_hidden' || r === 'interrupted');
  return interrupted ? m.result.invalid : m.result.notCounted;
}

export function ResultScreen({
  validity,
  metrics,
  challenge,
  personal,
  unsavedSession,
  onSave,
  onAgain,
}: {
  validity: Validity;
  metrics: SessionMetrics | undefined;
  challenge: Challenge | null;
  /** For people who keep history: their usual level and streak. */
  personal: { usualRt: number | null; streak: number } | null;
  /** A finished test of someone without a profile yet — saved if they agree. */
  unsavedSession: Session | null;
  onSave: () => Promise<void>;
  onAgain: () => void;
}) {
  const { m, plural } = useI18n();
  const navigate = useNavigate();
  const pulse = usePulse(metrics?.meanRtMs ?? null);
  const [contributing, setContributingState] = useState(isContributing);
  const [name, setName] = useState(() => readPref('challengeName') ?? '');
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const [adult, setAdult] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = `${m.result.kicker} · NeRN`;
  }, [m]);

  const meanRt = metrics?.meanRtMs;

  if (!validity.ok || !metrics || meanRt === undefined) {
    return (
      <main className="theme-dark mx-auto flex min-h-dvh max-w-[520px] flex-col bg-bg px-5 pt-[calc(env(safe-area-inset-top)+48px)] pb-[calc(env(safe-area-inset-bottom)+32px)] text-text">
        <Kicker>{m.result.kicker}</Kicker>
        <p className="serif-caps mt-8 text-40">{invalidTitle(validity, m)}</p>
        <ul className="mt-6 text-16 text-muted">
          {validity.reasons.map((reason) => (
            <li key={reason}>{m.result.reasons[reason]}</li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col gap-3 pt-10">
          <Button onClick={onAgain} wide arrow>
            {m.result.again}
          </Button>
          <Link to="/" className="mt-2 self-center text-14 text-muted underline underline-offset-4">
            {m.result.home}
          </Link>
        </div>
      </main>
    );
  }

  const word = wordFor(meanRt);
  const hour = new Date().getHours();
  const ua = pulse?.ua;
  const uaHour = ua?.hours[hour]?.meanRtMs ?? null;
  const uaPercent = ua ? fasterThanPercent(ua, meanRt) : null;

  const comparisons: string[] = [];
  if (challenge) {
    const rival = challenge.name ?? m.result.friendSomeone;
    const d = Math.abs(Math.round(meanRt - challenge.ms));
    comparisons.push(
      d === 0
        ? fill(m.result.friendTie, { name: rival })
        : meanRt < challenge.ms
          ? fill(m.result.friendWin, { name: rival, d })
          : fill(m.result.friendLose, { name: rival, d }),
    );
  }
  if (uaHour !== null) comparisons.push(fill(m.result.uaNow, { ms: uaHour }));
  else if (ua?.meanRtMs) comparisons.push(fill(m.result.uaAll, { ms: ua.meanRtMs }));
  if (uaPercent !== null) comparisons.push(fill(m.result.uaFaster, { p: uaPercent }));
  if (pulse && !ua?.meanRtMs) comparisons.push(m.result.uaPending);
  comparisons.push(fill(m.result.norm, { ms: SMARTPHONE_NORM.meanRtMs }));
  if (personal?.usualRt) {
    const d = Math.round(personal.usualRt - meanRt);
    comparisons.push(
      d === 0
        ? m.result.usualSame
        : d > 0
          ? fill(m.result.usualFaster, { d })
          : fill(m.result.usualSlower, { d: -d }),
    );
  }

  async function share() {
    writePref('challengeName', name.trim() || null);
    const text = fill(m.result.shareText, { ms: meanRt!, word: m.words[word] });
    const outcome = await shareChallenge(text, challengeUrl(meanRt!, name));
    if (outcome === 'copied') setShareState('copied');
  }

  async function save() {
    setSaving(true);
    await onSave();
    navigate('/today');
  }

  return (
    <main className="theme-dark min-h-dvh overflow-x-clip bg-bg text-text" data-testid="result">
      <div className="mx-auto max-w-[520px] px-5 pt-[calc(env(safe-area-inset-top)+40px)] pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <Kicker className="animate-rise">{m.result.kicker}</Kicker>

        <h1 className="serif-caps text-word mt-6 animate-line break-words" data-testid="word">
          {m.words[word]}
        </h1>

        <p className="mt-6 flex items-baseline gap-3 animate-rise">
          <CountUp to={meanRt} className="font-display text-72 leading-none font-semibold" />
          <span className="text-20 text-muted">
            {m.common.ms} · {m.result.meanLabel}
          </span>
        </p>
        <p className="mt-4 text-18 text-muted">{m.wordLines[word]}</p>

        {/* The scale: five words, a marker where you are, a tick for the research average. */}
        <div className="mt-8" aria-hidden="true">
          <div className="relative h-1.5 rounded-full bg-hairline">
            <span
              className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-4 ring-bg transition-[left] duration-700 ease-out"
              style={{ left: `${2 + (1 - scalePosition(meanRt)) * 96}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-5 text-center text-11 text-muted">
            {[...WORDS].reverse().map((w) => (
              <span key={w} className={w === word ? 'font-semibold text-text' : ''}>
                {m.words[w]}
              </span>
            ))}
          </div>
        </div>

        <ul className="mt-10">
          {comparisons.map((line) => (
            <li key={line} className="border-t border-hairline py-4 text-16">
              {line}
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-3 gap-4 border-y border-hairline py-5">
          {personal && personal.streak > 0 ? (
            <Stat label={m.today.streakLabel} value={plural(personal.streak, m.units.days)} />
          ) : (
            <Stat label={m.result.reactions} value={metrics.validTrials} />
          )}
          <Stat label={m.result.slow} value={metrics.lapses} />
          <Stat label={m.result.early} value={metrics.falseStarts} />
        </div>

        <section className="mt-10 flex flex-col gap-3">
          <label className="block">
            <span className="kicker text-muted">{m.result.nameLabel}</span>
            <input
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              placeholder={m.result.namePlaceholder}
              className="mt-2 w-full rounded-inner bg-surface px-4 py-3 text-16 ring-1 ring-hairline ring-inset placeholder:text-muted focus:ring-text focus:outline-none"
            />
          </label>
          <Button onClick={() => void share()} wide arrow>
            {m.result.challenge}
          </Button>
          <p aria-live="polite" className="text-center text-14 text-muted">
            {shareState === 'copied' ? m.result.copied : ''}
          </p>
          <Button onClick={onAgain} variant="secondary" wide>
            {m.result.again}
          </Button>
        </section>

        <div className="mt-6 border-t border-hairline pt-2">
          <Toggle
            label={m.result.contribute}
            checked={contributing}
            onChange={(on) => {
              setContributing(on);
              setContributingState(on);
            }}
          />
        </div>

        {unsavedSession ? (
          <section className="mt-10 rounded-card bg-surface p-5 ring-1 ring-hairline ring-inset">
            <h2 className="serif-caps text-28">
              {m.onboarding.title.text} {m.onboarding.title.accent}
            </h2>
            <p className="mt-3 text-16 text-muted">{m.onboarding.text}</p>
            <label className="mt-5 flex cursor-pointer gap-3">
              <input
                type="checkbox"
                checked={adult}
                onChange={(e) => setAdult(e.target.checked)}
                className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
              />
              <span className="text-14">{m.onboarding.confirm}</span>
            </label>
            <Link
              to="/privacy"
              className="mt-3 inline-block text-14 text-muted underline underline-offset-4"
            >
              {m.onboarding.terms}
            </Link>
            <div className="mt-5">
              <Button onClick={() => void save()} disabled={!adult || saving} wide arrow>
                {m.onboarding.start}
              </Button>
            </div>
          </section>
        ) : (
          personal && (
            <div className="mt-10 flex flex-col items-center gap-2">
              <p className="text-14 text-muted">{m.result.saved}</p>
              <Link
                to="/today"

                className="text-16 underline decoration-hairline underline-offset-[6px]"
              >
                {m.result.toToday}
              </Link>
            </div>
          )
        )}
      </div>
    </main>
  );
}
