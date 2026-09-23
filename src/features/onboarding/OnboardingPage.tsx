import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CONSENT_VERSION } from '../../app/data';
import { fill } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, ButtonLink } from '../../ui/Button';
import { Stepper } from '../../ui/Controls';
import { PageHeader } from '../../ui/Heading';
import { InstallGuide } from '../settings/InstallGuide';

/** Test time ±2 h — the window outside which sessions stay out of experiments. */
export function windowAround(hour: number) {
  return { startHour: (hour + 22) % 24, endHour: (hour + 2) % 24 };
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/**
 * SPEC «Онбординг»: three screens, one idea each. Nothing is saved until the very end,
 * and nothing at all without the 18+ confirmation.
 */
export function OnboardingPage() {
  const { m, locale } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [adult, setAdult] = useState(false);
  const [under18, setUnder18] = useState(false);
  const [hour, setHour] = useState(8);
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    // The database is created only now, after the 18+ confirmation.
    const { saveProfile } = await import('../../db/repo');
    await saveProfile({
      id: 'me',
      createdAt: Date.now(),
      locale,
      ageConfirmed18: true,
      consentVersion: CONSENT_VERSION,
      preferredWindow: windowAround(hour),
    });
    navigate('/test?mode=daily', { replace: true });
  }

  return (
    <div className="flex min-h-[calc(100dvh-80px)] flex-col">
      <div className="flex items-center justify-between py-4">
        <Link to="/" className="font-display text-18 font-semibold">
          NeRN
        </Link>
        <div className="flex gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-0.5 w-8 rounded-full ${n <= step ? 'bg-accent' : 'bg-hairline'}`}
            />
          ))}
        </div>
      </div>

      <div key={step} className="flex flex-1 flex-col pt-10">
        {step === 1 && (
          <>
            <PageHeader kicker={fill(m.onboarding.step, { n: 1 })} title={m.onboarding.ageTitle} />
            <p className="mt-6 text-18 text-muted">{m.onboarding.ageText}</p>

            <label className="mt-10 flex cursor-pointer gap-4 rounded-card p-5 ring-1 ring-hairline ring-inset has-checked:ring-text">
              <input
                type="checkbox"
                checked={adult}
                onChange={(e) => {
                  setAdult(e.target.checked);
                  setUnder18(false);
                }}
                className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
              />
              <span className="text-16">{m.onboarding.ageConfirm}</span>
            </label>
            <Link
              to="/privacy"
              className="mt-4 self-start text-14 text-muted underline decoration-hairline underline-offset-4 hover:text-text"
            >
              {m.onboarding.termsLink}
            </Link>

            {under18 && (
              <div className="animate-rise mt-8 border-t border-hairline pt-6">
                <p className="text-16">{m.onboarding.under18Text}</p>
                <div className="mt-4">
                  <ButtonLink to="/test?mode=demo" variant="secondary" arrow>
                    {m.onboarding.tryDemo}
                  </ButtonLink>
                </div>
              </div>
            )}

            <div className="mt-auto flex flex-col gap-3 pt-10">
              <Button onClick={() => setStep(2)} disabled={!adult} wide arrow>
                {m.common.next}
              </Button>
              {!under18 && (
                <Button
                  variant="quiet"
                  onClick={() => {
                    setUnder18(true);
                    setAdult(false);
                  }}
                >
                  {m.onboarding.under18}
                </Button>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <PageHeader kicker={fill(m.onboarding.step, { n: 2 })} title={m.onboarding.howTitle} />
            <div
              aria-hidden="true"
              className="mt-8 flex h-44 items-center justify-center rounded-card bg-stimulus-bg font-mono text-72 text-stimulus"
            >
              284
            </div>
            <ol className="mt-8">
              {m.onboarding.howLines.map((line, i) => (
                <li key={line} className="flex gap-4 border-t border-hairline py-4 text-16">
                  <span className="serif-italic w-5 shrink-0 text-20 leading-6 text-accent">
                    {i + 1}
                  </span>
                  {line}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-14 text-muted">{m.onboarding.howNote}</p>
            <div className="mt-auto pt-10">
              <Button onClick={() => setStep(3)} wide arrow>
                {m.common.next}
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <PageHeader
              kicker={fill(m.onboarding.step, { n: 3 })}
              title={m.onboarding.windowTitle}
            />
            <p className="mt-6 text-18 text-muted">{m.onboarding.windowText}</p>
            <div className="mt-8 rounded-card p-5 ring-1 ring-hairline ring-inset">
              <p className="kicker mb-4 text-muted">{m.onboarding.windowLabel}</p>
              <Stepper
                label={m.onboarding.windowLabel}
                value={hour}
                display={formatHour(hour)}
                onChange={setHour}
                step={1}
                min={0}
                max={23}
              />
            </div>
            <h2 className="kicker mt-10 mb-4 text-muted">{m.onboarding.installTitle}</h2>
            <InstallGuide />
            <div className="mt-auto pt-10">
              <Button onClick={() => void finish()} disabled={saving} wide arrow>
                {m.onboarding.finish}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
