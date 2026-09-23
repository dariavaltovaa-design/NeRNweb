import { useState } from 'react';
import { useAppData, useNow } from '../../app/data';
import { deleteSession } from '../../db/repo';
import { fill } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { dateFromLocal, localDateOf } from '../../stats/dates';
import { averageChange, scrollPairs } from '../../stats/scroll';
import { Button, ButtonLink } from '../../ui/Button';
import { Kicker, PageHeader } from '../../ui/Heading';

/** SPEC «Ціна скролу» (SHOULD): a quick test before and after scrolling, never part of the Form. */
export function ScrollPage() {
  const { m, plural, formatNumber, formatDate } = useI18n();
  const data = useAppData();
  const now = useNow();
  const [newPairId] = useState(() => crypto.randomUUID());

  if (!data) return null;
  const today = localDateOf(now);
  const pairs = scrollPairs(data.sessions);
  const pending = pairs.find((p) => p.after === null && p.date === today && p.before.validity.ok);
  const average = averageChange(pairs);
  const complete = pairs.filter((p) => p.change !== null).length;
  const pct = (n: number) => formatNumber(Math.round(n), { signDisplay: 'exceptZero' });

  return (
    <div className="flex flex-col gap-10">
      <PageHeader kicker={m.scroll.kicker} title={m.scroll.title} />
      <p className="-mt-4 text-18 text-muted">{m.scroll.intro}</p>

      <section className="rounded-card bg-surface p-5 ring-1 ring-hairline ring-inset">
        {pending ? (
          <>
            <p className="serif-italic text-28">{m.scroll.waiting}</p>
            <div className="mt-6 flex flex-col gap-3">
              <ButtonLink to={`/test?mode=quick&pair=${pending.id}&phase=after`} wide arrow>
                {m.scroll.after}
              </ButtonLink>
              <Button variant="quiet" onClick={() => void deleteSession(pending.before.id)}>
                {m.scroll.cancel}
              </Button>
            </div>
          </>
        ) : (
          <ButtonLink to={`/test?mode=quick&pair=${newPairId}&phase=before`} wide arrow>
            {m.scroll.before}
          </ButtonLink>
        )}
      </section>

      <section>
        <p className="serif-italic text-28" data-testid="scroll-average">
          {average === null
            ? fill(m.scroll.averagePending, { n: complete })
            : fill(m.scroll.average, { x: pct(average) })}
        </p>
        <p className="mt-2 text-12 text-muted">{m.scroll.caption}</p>
      </section>

      {pairs.length > 0 && (
        <section>
          <Kicker className="mb-2">
            {m.scroll.pairs} · {plural(pairs.length, m.units.pairs)}
          </Kicker>
          <ul>
            {pairs.map((p) => (
              <li
                key={p.id}
                className="flex justify-between gap-4 border-b border-hairline py-4 text-16"
              >
                <span>{formatDate(dateFromLocal(p.date), { day: 'numeric', month: 'short' })}</span>
                <span className="text-right text-muted">
                  {p.change !== null
                    ? fill(m.scroll.change, { x: pct(p.change) })
                    : p.after === null && p.before.validity.ok
                      ? m.scroll.pending
                      : m.scroll.invalid}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
