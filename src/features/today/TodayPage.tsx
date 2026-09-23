import { Link } from 'react-router';
import { useAppData, useNow } from '../../app/data';
import { isStandalone } from '../../app/install';
import { usePulse } from '../../app/pulse';
import type { Experiment } from '../../db/schema';
import { fill } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import type { Messages } from '../../i18n/messages';
import { addDays, localDateOf } from '../../stats/dates';
import { conditionOn, dayIndex, isFinished, isInWindow } from '../../stats/experiment';
import { wordFor } from '../../stats/norms';
import { meanRtOf, scored, streak, usualRt } from '../../stats/personal';
import { ButtonLink } from '../../ui/Button';
import { PageHeader, Stat } from '../../ui/Heading';
import { ArrowRight } from '../../ui/icons';
import { CountUp } from '../../ui/Motion';
import { experimentTexts } from '../experiments/templates';
import { formatHour } from '../onboarding/OnboardingPage';
import { InstallGuide } from '../settings/InstallGuide';
import { invalidTitle } from '../test/ResultScreen';
import { CheckIn, conditionQuestionFor } from './CheckIn';

export function TodayPage() {
  const { m, plural, formatDate } = useI18n();
  const data = useAppData();
  const now = useNow();
  const pulse = usePulse();
  const today = localDateOf(now);
  const hour = new Date(now).getHours();

  if (!data) return null;
  const { profile, sessions, experiments } = data;

  const daily = sessions.filter((s) => s.mode === 'daily');
  const todays = daily.filter((s) => s.localDate === today);
  const latestValid = scored(todays).at(-1);
  const latest = todays.at(-1);
  const yesterday = addDays(today, -1);
  const missedYesterday =
    !latest &&
    daily.some((s) => s.localDate < yesterday) &&
    !daily.some((s) => s.localDate === yesterday);
  const experiment = experiments.find((e) => e.status === 'running');
  const usual = usualRt(sessions, today);
  const days = streak(sessions, today);
  const uaHour = pulse?.ua.hours[hour]?.meanRtMs ?? null;
  const outsideWindow = !latestValid && !isInWindow(hour, profile?.preferredWindow);
  const usualTime = profile?.preferredWindow
    ? formatHour((profile.preferredWindow.startHour + 2) % 24)
    : '';

  const meanRt = latestValid ? meanRtOf(latestValid) : null;
  const word = meanRt !== null ? wordFor(meanRt) : null;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        kicker={formatDate(now, { weekday: 'long', day: 'numeric', month: 'long' })}
        title={m.nav.today}
      />

      {meanRt !== null && word ? (
        <section className="animate-rise" data-testid="today-result">
          <p className="serif-caps text-word break-words">{m.words[word]}</p>
          <p className="mt-4 flex items-baseline gap-3">
            <CountUp to={meanRt} className="font-display text-56 leading-none font-semibold" />
            <span className="text-16 text-muted">
              {m.common.ms} · {m.result.meanLabel}
            </span>
          </p>
          <p className="mt-3 text-16 text-muted">{m.wordLines[word]}</p>
        </section>
      ) : (
        <section className="animate-rise flex flex-col gap-4">
          {latest && !latest.validity.ok ? (
            <>
              <p className="text-18">{invalidTitle(latest.validity, m)}</p>
              <p className="text-14 text-muted">
                {latest.validity.reasons.map((r) => m.result.reasons[r]).join(' ')}
              </p>
            </>
          ) : (
            <p className="text-18 text-muted">{m.today.noTest}</p>
          )}
          {missedYesterday && <p className="text-14 text-muted">{m.today.missedYesterday}</p>}
          {outsideWindow && usualTime && (
            <p className="text-14 text-muted">{fill(m.today.outsideWindow, { time: usualTime })}</p>
          )}
          <ButtonLink to="/test" wide arrow>
            {latest ? m.today.retry : m.today.start}
          </ButtonLink>
        </section>
      )}

      <div className="grid grid-cols-3 gap-4 border-y border-hairline py-5">
        <Stat label={m.today.streakLabel} value={days > 0 ? plural(days, m.units.days) : '—'} />
        <Stat
          label={m.today.usualLabel}
          value={usual ?? '—'}
          unit={usual ? m.common.ms : undefined}
        />
        <Stat
          label={m.today.uaLabel}
          value={uaHour ?? '—'}
          unit={uaHour ? m.common.ms : undefined}
        />
      </div>
      {usual === null && <p className="-mt-6 text-14 text-muted">{m.today.usualPending}</p>}

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

      {!isStandalone() && (
        <section className="rounded-card bg-surface p-5 ring-1 ring-hairline ring-inset">
          <h2 className="font-display text-16 font-semibold tracking-[0.04em] uppercase">
            {m.install.title}
          </h2>
          <p className="mt-2 mb-5 text-14 text-muted">{m.install.text}</p>
          <InstallGuide />
        </section>
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
  experiment: Experiment;
  today: string;
  m: Messages;
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
