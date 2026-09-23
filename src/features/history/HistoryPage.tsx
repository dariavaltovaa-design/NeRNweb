import { useState } from 'react';
import { useAppData, useNow } from '../../app/data';
import type { Session } from '../../db/schema';
import { fill } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { addDays, dateFromLocal, daysBetween, localDateOf } from '../../stats/dates';
import { calibrationIds, evaluateForm, formValue, WINDOW_DAYS } from '../../stats/form';
import { Dialog } from '../../ui/Dialog';
import { Kicker, PageHeader } from '../../ui/Heading';
import { Expand } from '../../ui/icons';
import { FormChart, type ChartPoint } from './FormChart';

export function HistoryPage() {
  const { m, plural, formatDate } = useI18n();
  const data = useAppData();
  const now = useNow();
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  if (!data) return null;
  const { sessions } = data;
  const today = localDateOf(now);
  const start = addDays(today, -(WINDOW_DAYS - 1));

  // Place every session on today's scale: the ceiling of the latest Form.
  const latestForm = [...sessions]
    .reverse()
    .map((s) => (s.mode === 'daily' && s.validity.ok ? evaluateForm(sessions, s) : null))
    .find((f) => f?.kind === 'form');
  const ceiling = latestForm?.kind === 'form' ? latestForm.ceiling : null;
  const range = latestForm?.kind === 'form' ? latestForm.range : null;
  const calibration = calibrationIds(sessions);

  const points: ChartPoint[] = ceiling
    ? sessions
        .filter(
          (s) =>
            s.mode === 'daily' &&
            s.validity.ok &&
            s.metrics &&
            !calibration.has(s.id) &&
            daysBetween(s.localDate, today) < WINDOW_DAYS,
        )
        .map((s) => ({
          date: s.localDate,
          value: formValue(s.metrics!.meanSpeed, ceiling),
          session: s,
        }))
    : [];

  const shortDate = (date: string) =>
    formatDate(dateFromLocal(date), { day: 'numeric', month: 'short' });
  const labels = { start: shortDate(start), end: shortDate(today) };
  const chartAria = fill(m.history.chartAria, { n: plural(points.length, m.units.sessions) });

  function formOf(s: Session): string {
    if (s.mode === 'quick') return m.history.quick;
    if (!s.validity.ok || !s.metrics) return m.history.invalid;
    if (calibration.has(s.id)) return m.history.calibration;
    return ceiling ? String(formValue(s.metrics.meanSpeed, ceiling)) : m.history.calibration;
  }

  const current = selected !== null ? points[selected] : undefined;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader kicker={m.history.kicker} title={m.history.title} />

      {points.length === 0 ? (
        <p className="text-16 text-muted">
          {sessions.length === 0 ? m.history.empty : `${m.today.calibrationText}`}
        </p>
      ) : (
        <section className="animate-rise">
          <button
            type="button"
            onClick={() => {
              setSelected(points.length - 1);
              setExpanded(true);
            }}
            className="group relative block w-full rounded-card bg-surface p-3 text-left ring-1 ring-hairline ring-inset"
            aria-label={m.history.expand}
          >
            <FormChart
              points={points}
              range={range}
              startDate={start}
              endDate={today}
              labels={labels}
              ariaLabel={chartAria}
            />
            <Expand className="absolute top-3 right-3 text-muted group-hover:text-text" />
          </button>
          <Legend m={m} hasRange={range !== null} />
        </section>
      )}

      <Dialog open={expanded} onClose={() => setExpanded(false)} title={m.history.kicker} full>
        <div className="flex flex-1 flex-col justify-center gap-6">
          <FormChart
            points={points}
            range={range}
            startDate={start}
            endDate={today}
            labels={labels}
            height={260}
            selected={selected}
            onSelect={setSelected}
            interactive
            ariaLabel={chartAria}
          />
          <p className="kicker text-center text-muted">{m.history.scrubHint}</p>
          {current && (
            <dl
              aria-live="polite"
              className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-hairline pt-5"
            >
              <div className="col-span-2">
                <dt className="kicker text-muted">
                  {formatDate(dateFromLocal(current.date), {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </dt>
                <dd className="serif-caps mt-1 text-56">
                  {current.value}
                  <span className="kicker ml-2 text-muted">{m.today.ofHundred}</span>
                </dd>
              </div>
              <Detail
                label={m.history.reaction}
                value={`${current.session.metrics?.medianRtMs ?? ''} ${m.common.ms}`}
              />
              <Detail
                label={m.history.sleep}
                value={
                  current.session.checkIn?.sleepHours !== undefined
                    ? `${current.session.checkIn.sleepHours} ${m.common.hoursShort}`
                    : m.history.noValue
                }
              />
              <div className="col-span-2">
                <Detail
                  label={m.history.tags}
                  value={
                    current.session.checkIn?.tags.length
                      ? current.session.checkIn.tags
                          .map((t) => m.checkin.tagNames[t as keyof typeof m.checkin.tagNames] ?? t)
                          .join(', ')
                      : m.history.noValue
                  }
                />
              </div>
            </dl>
          )}
        </div>
      </Dialog>

      {sessions.length > 0 && (
        <section>
          <Kicker className="mb-2">{m.history.sessions}</Kicker>
          <ul>
            {[...sessions].reverse().map((s) => (
              <li
                key={s.id}
                className="flex items-baseline justify-between gap-4 border-b border-hairline py-4"
              >
                <span>
                  <span className="text-16">
                    {formatDate(new Date(s.startedAt), { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="ml-2 text-14 text-muted">
                    {formatDate(new Date(s.startedAt), { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {s.condition && <span className="kicker ml-2 text-accent">{s.condition}</span>}
                </span>
                <span className="flex items-baseline gap-4 text-right">
                  {s.metrics && (
                    <span className="text-14 text-muted">
                      {s.metrics.medianRtMs} {m.common.ms}
                    </span>
                  )}
                  <span className="min-w-12 font-display text-16 font-semibold">{formOf(s)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="kicker text-muted">{label}</dt>
      <dd className="mt-1 text-16">{value}</dd>
    </div>
  );
}

function Legend({ m, hasRange }: { m: ReturnType<typeof useI18n>['m']; hasRange: boolean }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-12 text-muted">
      {hasRange && (
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-4 rounded-[2px] bg-band opacity-40" />
          {m.history.band}
        </li>
      )}
      <li className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full ring-[1.5px] ring-text ring-inset"
        />
        {m.history.legendA}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-accent" />
        {m.history.legendB}
      </li>
    </ul>
  );
}
