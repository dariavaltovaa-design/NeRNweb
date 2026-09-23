import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAppData, useNow } from '../../app/data';
import { readPref, writePref } from '../../app/preferences';
import { fill } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { pickCaption, type CaptionState } from '../../stats/caption';
import { addDays, localDateOf } from '../../stats/dates';
import { conditionOn, dayIndex, isFinished, isInWindow } from '../../stats/experiment';
import { evaluateForm, MIN_SESSIONS_FOR_RANGE, type FormResult } from '../../stats/form';
import { ButtonLink } from '../../ui/Button';
import { FormRing, type RingState } from '../../ui/FormRing';
import { PageHeader, Stat } from '../../ui/Heading';
import { ArrowRight } from '../../ui/icons';
import { formatHour } from '../onboarding/OnboardingPage';
import { experimentTexts } from '../experiments/templates';
import { invalidTitle } from '../test/ResultView';
import { CheckIn, conditionQuestionFor } from './CheckIn';

const POSITION_DOT = { above: 'bg-accent', within: 'bg-band', below: 'bg-below' } as const;

export function TodayPage() {
  const { m, plural, formatDate } = useI18n();
  const data = useAppData();
  const now = useNow();
  const today = localDateOf(now);

  // The ring fills once a day; after that it just shows the number.
  const [animateRing] = useState(() => readPref('ringDay') !== today);
  useEffect(() => {
    if (animateRing) writePref('ringDay', today);
  }, [animateRing, today]);

  if (!data) return null;
  const { profile, sessions, experiments } = data;

  const daily = sessions.filter((s) => s.mode === 'daily');
  const todays = daily.filter((s) => s.localDate === today);
  const latestValid = [...todays].reverse().find((s) => s.validity.ok && s.metrics);
  const latest = todays.at(-1);
  const form: FormResult | null = latestValid ? evaluateForm(sessions, latestValid) : null;
  const yesterday = addDays(today, -1);
  const missedYesterday =
    !latest &&
    daily.some((s) => s.localDate < yesterday) &&
    !daily.some((s) => s.localDate === yesterday);
  const experiment = experiments.find((e) => e.status === 'running');
  const hour = new Date(now).getHours();
  const outsideWindow = !latestValid && !isInWindow(hour, profile?.preferredWindow);
  const usualTime = profile?.preferredWindow
    ? formatHour((profile.preferredWindow.startHour + 2) % 24)
    : '';

  // ── Ring ────────────────────────────────────────────────────────────────
  let ring: RingState = { kind: 'empty' };
  let ringLabel = m.today.ringAriaEmpty;
  let captionState: CaptionState | null = null;
  if (form?.kind === 'calibration') {
    ring = form;
    ringLabel = fill(m.today.ringAriaCalibration, form);
    captionState = 'calibration';
  } else if (form?.kind === 'form') {
    ring = { kind: 'form', value: form.value, range: form.range, newPeak: form.newPeak };
    ringLabel = form.position
      ? fill(m.today.ringAria, {
          value: form.value,
          position: m.today.positionShort[form.position],
        })
      : fill(m.today.ringAriaNoRange, { value: form.value });
    captionState = form.newPeak ? 'peak' : (form.position ?? 'early');
  }
  if (latestValid?.checkIn?.nightAlert) captionState = 'alert';

  const kicker = formatDate(now, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex flex-col gap-10">
      <PageHeader kicker={kicker} title={m.nav.today} />

      <section className="animate-rise flex flex-col items-center text-center">
        <FormRing
          state={ring}
          label={ringLabel}
          kicker={form?.kind === 'form' && form.newPeak ? m.today.newPeak : m.today.formLabel}
          caption={form?.kind === 'form' ? m.today.ofHundred : undefined}
          animate={animateRing && ring.kind !== 'empty'}
        />

        {form?.kind === 'form' && form.position && (
          <p className="mt-2 flex items-center gap-2 text-16" data-testid="position">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${POSITION_DOT[form.position]}`}
            />
            {m.today.position[form.position]}
          </p>
        )}
        {form?.kind === 'form' && !form.position && (
          <p className="mt-2 text-14 text-muted">
            {fill(m.today.rangePending, {
              n: plural(MIN_SESSIONS_FOR_RANGE - form.poolSize, m.units.sessions),
            })}
          </p>
        )}
        {form?.kind === 'calibration' && (
          <p className="mt-2 max-w-[32ch] text-14 text-muted">
            {fill(m.today.calibration, form)}. {m.today.calibrationText}
          </p>
        )}

        {captionState && (
          <p className="serif-italic mt-6 max-w-[30ch] text-28 text-balance">
            {pickCaption(m.captions[captionState], today)}
          </p>
        )}

        {latestValid?.metrics && (
          <div className="mt-8 grid w-full grid-cols-3 gap-4 border-y border-hairline py-5 text-left">
            <Stat
              label={m.today.typical}
              value={latestValid.metrics.medianRtMs}
              unit={m.common.ms}
            />
            <Stat label={m.today.slow} value={latestValid.metrics.lapses} />
            <Stat label={m.today.early} value={latestValid.metrics.falseStarts} />
          </div>
        )}

        {!latestValid && (
          <div className="mt-6 flex w-full flex-col items-center gap-4">
            {latest && !latest.validity.ok ? (
              <>
                <p className="text-16">{invalidTitle(latest.validity, m)}</p>
                <p className="text-14 text-muted">
                  {latest.validity.reasons.map((r) => m.result.reasons[r]).join(' ')}
                </p>
              </>
            ) : (
              <p className="text-16 text-muted">{m.today.noTest}</p>
            )}
            {missedYesterday && <p className="text-14 text-muted">{m.today.missedYesterday}</p>}
            {outsideWindow && usualTime && (
              <p className="max-w-[34ch] text-14 text-muted">
                {fill(m.today.outsideWindow, { time: usualTime })}
              </p>
            )}
            <ButtonLink to="/test?mode=daily" wide arrow>
              {latest ? m.today.retry : m.today.startTest}
            </ButtonLink>
          </div>
        )}
      </section>

      {experiment && <ExperimentCard experiment={experiment} today={today} m={m} />}

      {latestValid && (
        <CheckIn
          key={latestValid.id}
          session={latestValid}
          conditionQuestion={conditionQuestionFor(
            m,
            latestValid,
            experiments.find((e) => e.id === latestValid.experimentId)?.timing,
          )}
        />
      )}

      <Link
        to="/scroll"
        className="group flex items-center justify-between gap-4 border-t border-hairline pt-6"
      >
        <span>
          <span className="block font-display text-16 font-semibold tracking-[0.04em] uppercase">
            {m.today.scrollTitle}
          </span>
          <span className="mt-1 block text-14 text-muted">{m.today.scrollText}</span>
        </span>
        <ArrowRight className="shrink-0 text-muted transition-transform duration-160 group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

function ExperimentCard({
  experiment,
  today,
  m,
}: {
  experiment: NonNullable<ReturnType<typeof useAppData>>['experiments'][number];
  today: string;
  m: ReturnType<typeof useI18n>['m'];
}) {
  const texts = experimentTexts(experiment, m);
  const now = conditionOn(experiment, today);
  const day = Math.min(dayIndex(experiment, today) + 1, experiment.plannedDays);
  const finished = isFinished(experiment, today);

  return (
    <Link
      to="/experiments"
      className="group block rounded-card bg-surface p-5 ring-1 ring-hairline ring-inset"
    >
      <p className="kicker text-muted">
        {fill(m.today.experimentKicker, { day, total: experiment.plannedDays })}
      </p>
      <p className="mt-2 font-display text-18 font-semibold tracking-[0.02em] uppercase">
        {texts.title}
      </p>
      {finished ? (
        <p className="mt-3 text-16 text-muted">{m.experiments.finished}</p>
      ) : (
        now && (
          <p className="mt-3 text-16">
            <span className="text-muted">
              {experiment.timing === 'evening' ? m.today.tonight : m.today.thisMorning}:{' '}
            </span>
            <span className="font-medium text-accent">
              {fill(m.today.conditionLabel, { c: now.condition })}
            </span>{' '}
            — {now.condition === 'A' ? texts.a : texts.b}
          </p>
        )
      )}
    </Link>
  );
}
