import { useEffect } from 'react';
import type { SessionMetrics, Validity } from '../../db/schema';
import type { TestMode } from '../../engine/config';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, ButtonLink } from '../../ui/Button';
import { Kicker, Stat } from '../../ui/Heading';
import type { Messages } from '../../i18n/messages';

/** «Interrupted» only when it really was; otherwise a plain "this one won't count". */
export function invalidTitle(validity: Validity, m: Messages): string {
  const interrupted = validity.reasons.some((r) => r === 'tab_hidden' || r === 'interrupted');
  return interrupted ? m.result.invalid : m.result.notCounted;
}

/** Shown after the demo: the typical reaction as the hero, honest context, a way forward. */
export function ResultView({
  mode,
  validity,
  metrics,
  onAgain,
}: {
  mode: TestMode;
  validity: Validity;
  metrics?: SessionMetrics;
  onAgain: () => void;
}) {
  const { m } = useI18n();

  useEffect(() => {
    document.title = `${m.result.demoKicker} · NeRN`;
  }, [m]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-5 pt-[calc(env(safe-area-inset-top)+40px)] pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <div className="animate-rise">
        <Kicker>{mode === 'demo' ? m.result.demoKicker : m.result.quickKicker}</Kicker>

        {validity.ok && metrics ? (
          <>
            <p className="mt-10 kicker text-muted">{m.result.typical}</p>
            <p className="mt-2 flex items-baseline gap-3" data-testid="typical">
              <span className="serif-caps text-96 tracking-[-0.03em]">{metrics.medianRtMs}</span>
              <span className="text-20 text-muted">{m.common.ms}</span>
            </p>
            <div className="mt-10 grid grid-cols-3 gap-4 border-y border-hairline py-6">
              <Stat label={m.result.slow} value={metrics.lapses} />
              <Stat label={m.result.early} value={metrics.falseStarts} />
              <Stat label={m.result.reactions} value={metrics.validTrials} />
            </div>
            <p className="mt-3 text-12 text-muted">
              {m.result.slow}: {m.result.slowNote}
            </p>
          </>
        ) : (
          <div className="mt-10">
            <p className="serif-italic text-40">{invalidTitle(validity, m)}</p>
            <ul className="mt-6 text-16 text-muted">
              {validity.reasons.map((reason) => (
                <li key={reason}>{m.result.reasons[reason]}</li>
              ))}
            </ul>
          </div>
        )}

        {mode === 'demo' && (
          <div className="mt-10">
            <p className="text-16">{m.result.demoNote}</p>
            <p className="mt-2 text-16 text-muted">{m.result.demoExplain}</p>
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-10">
        <ButtonLink to="/onboarding" wide arrow>
          {m.result.startDaily}
        </ButtonLink>
        <Button onClick={onAgain} variant="secondary" wide>
          {m.result.again}
        </Button>
        <ButtonLink to="/" variant="quiet">
          {m.result.home}
        </ButtonLink>
      </div>
    </main>
  );
}
