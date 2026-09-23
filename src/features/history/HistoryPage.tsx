import { useState } from 'react';
import { useAppData, useNow } from '../../app/data';
import type { Session } from '../../db/schema';
import { fill } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import type { Messages } from '../../i18n/messages';
import { addDays, dateFromLocal, daysBetween, localDateOf } from '../../stats/dates';
import { wordFor } from '../../stats/norms';
import { meanRtOf, scored } from '../../stats/personal';
import { quantile } from '../../stats/quantile';
import { Dialog } from '../../ui/Dialog';
import { Kicker, PageHeader } from '../../ui/Heading';
import { Expand } from '../../ui/icons';
import { ReactionChart, type ChartPoint } from './ReactionChart';

const WINDOW_DAYS = 60;
/** The usual range (middle half of your tests) needs this many tests to mean anything. */
const MIN_FOR_RANGE = 5;

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

  const points: ChartPoint[] = scored(sessions)
    .filter((s) => daysBetween(s.localDate, today) < WINDOW_DAYS)
    .map((s) => ({ date: s.localDate, value: meanRtOf(s), session: s }));
  const values = points.map((p) => p.value);
  const range =
    values.length >= MIN_FOR_RANGE
      ? { low: Math.round(quantile(values, 0.25)), high: Math.round(quantile(values, 0.75)) }
      : null;

  const shortDate = (date: string) =>
    formatDate(dateFromLocal(date), { day: 'numeric', month: 'short' });
  const labels = { start: shortDate(start), end: shortDate(today) };
  const chartAria = fill(m.history.chartAria, { n: plural(points.length, m.units.tests) });
  const current = selected !== null ? points[selected] : undefined;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader kicker={m.history.kicker} title={m.history.title} />

      {points.length === 0 ? (
        <p className="text-16 text-muted">{m.history.empty}</p>
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
            <ReactionChart
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
          {points.length > 0 && (
            <ReactionChart
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
          )}
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
                <dd className="mt-1 flex items-baseline gap-3">
                  <span className="serif-caps text-40">{m.words[wordFor(current.value)]}</span>
                  <span className="font-display text-20 font-semibold">
                    {current.value} {m.common.ms}
                  </span>
                </dd>
              </div>
              <Detail
                label={m.history.sleep}
                value={
                  current.session.checkIn?.sleepHours !== undefined
                    ? `${current.session.checkIn.sleepHours} ${m.common.hoursShort}`
                    : m.history.noValue
                }
              />
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
            </dl>
          )}
        </div>
      </Dialog>

      {sessions.length > 0 && (
        <section>
          <Kicker className="mb-2">{m.history.sessions}</Kicker>
          <ul>
            {[...sessions].reverse().map((s) => (
              <SessionRow key={s.id} session={s} m={m} formatDate={formatDate} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SessionRow({
  session: s,
  m,
  formatDate,
}: {
  session: Session;
  m: Messages;
  formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => string;
}) {
  const valid = s.validity.ok && s.metrics;
  const rt = valid ? (s.metrics?.meanRtMs ?? Math.round(1000 / (s.metrics?.meanSpeed ?? 1))) : null;
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-hairline py-4">
      <span>
        <span className="text-16">
          {formatDate(new Date(s.startedAt), { day: 'numeric', month: 'short' })}
        </span>
        <span className="ml-2 text-14 text-muted">
          {formatDate(new Date(s.startedAt), { hour: '2-digit', minute: '2-digit' })}
        </span>
        {s.condition && <span className="kicker ml-2 text-accent">{s.condition}</span>}
      </span>
      <span className="flex items-baseline gap-3 text-right">
        {rt !== null ? (
          <>
            <span className="text-14 text-muted">
              {s.mode === 'quick' ? m.history.quick : m.words[wordFor(rt)]}
            </span>
            <span className="min-w-16 font-display text-16 font-semibold">
              {rt} {m.common.ms}
            </span>
          </>
        ) : (
          <span className="text-14 text-muted">{m.history.invalid}</span>
        )}
      </span>
    </li>
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

function Legend({ m, hasRange }: { m: Messages; hasRange: boolean }) {
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
