import { useState } from 'react';
import { useAppData, useNow } from '../../app/data';
import { setExperimentStatus, startExperiment } from '../../db/repo';
import type { Experiment, Profile, Session } from '../../db/schema';
import { randomSeed } from '../../engine/random';
import { fill } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import type { Messages } from '../../i18n/messages';
import { localDateOf } from '../../stats/dates';
import {
  buildSchedule,
  conditionOn,
  dayIndex,
  includedSessions,
  isFinished,
  verdict,
  type Verdict,
} from '../../stats/experiment';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { Kicker, PageHeader } from '../../ui/Heading';
import { ArrowRight } from '../../ui/icons';
import { Segmented } from '../../ui/Segmented';
import { experimentTexts, TEMPLATES, type TemplateId } from './templates';
import { VerdictScale } from './VerdictScale';

const PLANNED_DAYS = 14;

type Setup =
  { kind: 'template'; id: TemplateId; timing: Experiment['timing'] } | { kind: 'custom' };

export function ExperimentsPage() {
  const { m, plural } = useI18n();
  const data = useAppData();
  const [setup, setSetup] = useState<Setup | null>(null);

  if (!data?.profile) return null;
  const { profile, sessions, experiments } = data;
  const active = experiments.find((e) => e.status === 'running');
  const past = experiments.filter((e) => e.status !== 'running');

  return (
    <div className="flex flex-col gap-12">
      <PageHeader kicker={m.experiments.kicker} title={m.experiments.title} />

      {active ? (
        <ActiveExperiment experiment={active} sessions={sessions} profile={profile} />
      ) : (
        <>
          <p className="-mt-6 text-18 text-muted">{m.experiments.intro}</p>
          <section>
            <Kicker className="mb-2">{m.experiments.library}</Kicker>
            <ol>
              {TEMPLATES.map((t, i) => {
                const texts = m.experiments.templates[t.id];
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSetup({ kind: 'template', id: t.id, timing: t.timing })}
                      className="group grid w-full grid-cols-[40px_1fr_auto] items-start gap-3 border-t border-hairline py-5 text-left"
                    >
                      <span className="font-display text-18 font-semibold text-accent">
                        0{i + 1}
                      </span>
                      <span>
                        <span className="block font-display text-16 font-semibold tracking-[0.04em] uppercase">
                          {texts.title}
                        </span>
                        <span className="mt-1 block text-14 text-muted">
                          A · {texts.a} / B · {texts.b}
                        </span>
                      </span>
                      <ArrowRight className="mt-0.5 text-muted transition-transform duration-160 group-hover:translate-x-1" />
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="border-t border-hairline pt-6">
              <Button variant="secondary" onClick={() => setSetup({ kind: 'custom' })} wide>
                {m.experiments.custom}
              </Button>
            </div>
          </section>
        </>
      )}

      {past.length > 0 && (
        <section>
          <Kicker className="mb-2">{m.experiments.past}</Kicker>
          <ul>
            {past.map((e) => (
              <li key={e.id} className="border-t border-hairline py-4">
                <p className="font-display text-16 font-semibold tracking-[0.04em] uppercase">
                  {experimentTexts(e, m).title}
                </p>
                <p className="mt-1 text-14 text-muted">
                  {e.status === 'done' ? m.experiments.statusDone : m.experiments.statusAbandoned}
                  {' · '}
                  {verdictText(verdict(e, sessions, profile), m, plural)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SetupDialog setup={setup} onClose={() => setSetup(null)} />
    </div>
  );
}

function verdictText(
  v: Verdict,
  m: Messages,
  plural?: (n: number, f: Messages['units']['days']) => string,
) {
  if (v.kind === 'not_enough')
    return fill(m.verdict.notEnough, {
      n: plural ? plural(v.sessionsLeft, m.units.days) : v.sessionsLeft,
    });
  if (v.kind === 'noise') return m.verdict.noise;
  const x = Math.round(Math.abs(v.delta));
  return fill(v.kind === 'better' ? m.verdict.better : m.verdict.worse, { x });
}

function ActiveExperiment({
  experiment,
  sessions,
  profile,
}: {
  experiment: Experiment;
  sessions: Session[];
  profile: Profile;
}) {
  const { m, plural, formatNumber } = useI18n();
  const [confirmStop, setConfirmStop] = useState(false);
  const today = localDateOf(useNow());
  const texts = experimentTexts(experiment, m);
  const plan = buildSchedule(experiment);
  const index = dayIndex(experiment, today);
  const now = conditionOn(experiment, today);
  const finished = isFinished(experiment, today);
  const included = includedSessions(experiment, sessions, profile);
  const doneDays = new Set(included.map((s) => s.experimentDay));
  const v = verdict(experiment, sessions, profile);
  const pct = (n: number) => formatNumber(Math.round(n), { signDisplay: 'exceptZero' });

  return (
    <section className="flex flex-col gap-8" data-testid="active-experiment">
      <div>
        <Kicker className="text-accent">{m.experiments.active}</Kicker>
        <h2 className="mt-2 font-display text-28 font-semibold tracking-[0.01em] uppercase">
          {texts.title}
        </h2>
        <dl className="mt-5">
          {(['A', 'B'] as const).map((c) => (
            <div key={c} className="flex gap-4 border-t border-hairline py-3">
              <dt className="serif-caps w-6 text-20 text-accent">{c}</dt>
              <dd className="text-16">{c === 'A' ? texts.a : texts.b}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-card bg-surface p-5 ring-1 ring-hairline ring-inset">
        <p className="kicker text-muted">
          {index < 0
            ? m.experiments.notStarted
            : fill(m.experiments.dayOf, {
                day: Math.min(index + 1, experiment.plannedDays),
                total: experiment.plannedDays,
              })}
        </p>
        {finished ? (
          <p className="mt-2 text-18">{m.experiments.finished}</p>
        ) : (
          now && (
            <p className="mt-2 text-18">
              <span className="text-muted">
                {experiment.timing === 'evening'
                  ? m.experiments.tonight
                  : m.experiments.thisMorning}
                :{' '}
              </span>
              <span className="font-medium text-accent">
                {fill(m.today.conditionLabel, { c: now.condition })}
              </span>{' '}
              — {now.condition === 'A' ? texts.a : texts.b}
            </p>
          )
        )}

        <ol className="mt-5 grid grid-cols-7 gap-1.5">
          {plan.map((c, i) => {
            const done = doneDays.has(i);
            const isToday = now?.day === i && !finished;
            return (
              <li
                key={i}
                aria-label={fill(m.experiments.gridAria, {
                  n: i + 1,
                  c,
                  state: done ? m.experiments.gridDone : m.experiments.gridEmpty,
                })}
                className={
                  'grid aspect-square place-items-center rounded-[8px] text-12 font-medium ' +
                  (done
                    ? c === 'A'
                      ? 'bg-text text-bg'
                      : 'bg-accent text-on-cta'
                    : 'text-muted ring-1 ring-hairline ring-inset') +
                  (isToday ? ' outline-2 outline-offset-2 outline-accent' : '')
                }
              >
                {c}
              </li>
            );
          })}
        </ol>
        {v.kind === 'not_enough' && (
          <p className="mt-4 text-14 text-muted">
            {fill(m.experiments.firstVerdict, { n: plural(v.sessionsLeft, m.units.days) })}
          </p>
        )}
      </div>

      <div data-testid="verdict">
        <p className="font-display text-20 font-semibold text-balance">
          {verdictText(v, m, plural)}
        </p>
        {v.kind !== 'not_enough' && (
          <div className="mt-5">
            <VerdictScale
              verdict={v}
              label={fill(m.verdict.scaleAria, {
                delta: pct(v.delta),
                lo: pct(v.interval[0]),
                hi: pct(v.interval[1]),
              })}
            />
            <p className="mt-2 text-12 text-muted">
              {fill(m.verdict.interval, { lo: pct(v.interval[0]), hi: pct(v.interval[1]) })}
              {' · '}
              {fill(m.verdict.counts, { a: v.nA, b: v.nB })}
            </p>
          </div>
        )}
        <p className="mt-4 text-12 text-muted">{m.verdict.footnote}</p>
      </div>

      <div className="flex flex-col gap-3">
        {finished && (
          <Button onClick={() => void setExperimentStatus(experiment.id, 'done')} wide>
            {m.experiments.finish}
          </Button>
        )}
        <Button variant="quiet" onClick={() => setConfirmStop(true)}>
          {m.experiments.stop}
        </Button>
      </div>

      <Dialog open={confirmStop} onClose={() => setConfirmStop(false)} title={m.experiments.stop}>
        <p className="text-16 text-muted">{m.experiments.stopConfirm}</p>
        <div className="mt-8 flex flex-col gap-3">
          <Button
            onClick={() => {
              setConfirmStop(false);
              void setExperimentStatus(experiment.id, 'abandoned');
            }}
            wide
          >
            {m.experiments.stop}
          </Button>
          <Button variant="secondary" onClick={() => setConfirmStop(false)} wide>
            {m.common.cancel}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}

function SetupDialog({ setup, onClose }: { setup: Setup | null; onClose: () => void }) {
  const { m } = useI18n();
  const [schedule, setSchedule] = useState<Experiment['schedule']>('alternating');
  const [timing, setTiming] = useState<Experiment['timing']>('evening');
  const [title, setTitle] = useState('');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [error, setError] = useState(false);

  const template = setup?.kind === 'template' ? m.experiments.templates[setup.id] : null;
  const canStart = setup?.kind === 'template' || (title.trim() && a.trim() && b.trim());

  async function start() {
    if (!setup || !canStart) return;
    const now = Date.now();
    const texts = template ?? { title: title.trim(), a: a.trim(), b: b.trim() };
    try {
      await startExperiment({
        id: crypto.randomUUID(),
        title: texts.title,
        conditionA: texts.a,
        conditionB: texts.b,
        schedule,
        timing: setup.kind === 'template' ? setup.timing : timing,
        seed: randomSeed(),
        ...(setup.kind === 'template' ? { templateId: setup.id } : {}),
        startedAt: now,
        startDate: localDateOf(now),
        plannedDays: PLANNED_DAYS,
        status: 'running',
        source: setup.kind === 'template' ? 'library' : 'custom',
      });
      onClose();
    } catch {
      setError(true);
    }
  }

  const field =
    'mt-2 w-full rounded-inner bg-surface px-4 py-3 text-16 ring-1 ring-hairline ring-inset placeholder:text-muted focus:ring-text focus:outline-none';

  return (
    <Dialog
      open={setup !== null}
      onClose={onClose}
      title={template ? template.title : m.experiments.custom}
    >
      <div className="flex max-h-[70dvh] flex-col gap-6 overflow-y-auto">
        {template ? (
          <dl>
            {(['A', 'B'] as const).map((c) => (
              <div key={c} className="flex gap-4 border-t border-hairline py-3">
                <dt className="serif-caps w-6 text-20 text-accent">{c}</dt>
                <dd className="text-16">{c === 'A' ? template.a : template.b}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <>
            <label className="block">
              <span className="kicker text-muted">{m.experiments.customTitle}</span>
              <input
                className={field}
                value={title}
                maxLength={60}
                placeholder={m.experiments.customTitlePlaceholder}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="kicker text-muted">{m.experiments.customA}</span>
              <input
                className={field}
                value={a}
                maxLength={80}
                placeholder={m.experiments.customPlaceholderA}
                onChange={(e) => setA(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="kicker text-muted">{m.experiments.customB}</span>
              <input
                className={field}
                value={b}
                maxLength={80}
                placeholder={m.experiments.customPlaceholderB}
                onChange={(e) => setB(e.target.value)}
              />
            </label>
            <Segmented<Experiment['timing']>
              legend={m.experiments.timingLabel}
              name="timing"
              value={timing}
              onChange={setTiming}
              options={[
                { value: 'evening', label: m.experiments.timingEvening },
                { value: 'morning', label: m.experiments.timingMorning },
              ]}
            />
          </>
        )}

        <div>
          <Segmented<Experiment['schedule']>
            legend={m.experiments.scheduleLabel}
            name="schedule"
            value={schedule}
            onChange={setSchedule}
            options={[
              { value: 'alternating', label: m.experiments.scheduleAlternating },
              { value: 'blocks', label: m.experiments.scheduleBlocks },
            ]}
          />
          {schedule === 'blocks' && (
            <p className="mt-2 text-14 text-muted">{m.experiments.blocksWarning}</p>
          )}
        </div>

        {error && <p className="text-14 text-muted">{m.experiments.oneAtATime}</p>}
        <Button onClick={() => void start()} disabled={!canStart} wide arrow>
          {m.experiments.start}
        </Button>
      </div>
    </Dialog>
  );
}
