import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CONSENT_VERSION } from '../../app/data';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, ButtonLink } from '../../ui/Button';
import { Editorial } from '../../ui/Heading';

/** Test time ±2 h — the window outside which tests stay out of experiments. */
export function windowAround(hour: number) {
  return { startHour: (hour + 22) % 24, endHour: (hour + 2) % 24 };
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/**
 * One screen, one checkbox: "keep my results". Most people get here from the result screen,
 * which asks the same inline; this page is for links from the menu. Nothing is saved without 18+.
 */
export function OnboardingPage() {
  const { m, locale } = useI18n();
  const navigate = useNavigate();
  const [adult, setAdult] = useState(false);
  const [under18, setUnder18] = useState(false);
  const [saving, setSaving] = useState(false);

  async function start() {
    setSaving(true);
    // The database is created only now, after the 18+ confirmation.
    const { saveProfile } = await import('../../db/repo');
    await saveProfile({
      id: 'me',
      createdAt: Date.now(),
      locale,
      ageConfirmed18: true,
      consentVersion: CONSENT_VERSION,
      preferredWindow: windowAround(new Date().getHours()),
    });
    navigate('/test', { replace: true });
  }

  return (
    <div className="flex min-h-[calc(100dvh-80px)] flex-col">
      <div className="flex items-center py-4">
        <Link to="/" className="font-display text-18 font-semibold">
          NeRN
        </Link>
      </div>

      <div className="flex flex-1 flex-col pt-10">
        <h1 className="text-56">
          <Editorial title={m.onboarding.title} animate />
        </h1>
        <p className="animate-rise mt-6 text-18 text-muted">{m.onboarding.text}</p>

        <label className="animate-rise mt-10 flex cursor-pointer gap-4 rounded-card p-5 ring-1 ring-hairline ring-inset has-checked:ring-text">
          <input
            type="checkbox"
            checked={adult}
            onChange={(e) => {
              setAdult(e.target.checked);
              setUnder18(false);
            }}
            className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
          />
          <span className="text-16">{m.onboarding.confirm}</span>
        </label>
        <Link
          to="/privacy"
          className="mt-4 self-start text-14 text-muted underline decoration-hairline underline-offset-4 hover:text-text"
        >
          {m.onboarding.terms}
        </Link>

        {under18 && (
          <div className="animate-rise mt-8 border-t border-hairline pt-6">
            <p className="text-16">{m.onboarding.under18Text}</p>
            <div className="mt-4">
              <ButtonLink to="/test" variant="secondary" arrow>
                {m.onboarding.tryTest}
              </ButtonLink>
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-3 pt-10">
          <Button onClick={() => void start()} disabled={!adult || saving} wide arrow>
            {m.onboarding.start}
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
      </div>
    </div>
  );
}
