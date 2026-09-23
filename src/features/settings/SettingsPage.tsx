import { Link } from 'react-router';
import { APP_VERSION } from '../../app/data';
import { useThemePreference, type ThemePreference } from '../../app/theme';
import { useProfile } from '../../db/exists';
import type { Profile } from '../../db/schema';
import { fill, type Locale } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { ButtonLink } from '../../ui/Button';
import { Stepper } from '../../ui/Controls';
import { Kicker, PageHeader } from '../../ui/Heading';
import { ArrowRight } from '../../ui/icons';
import { Segmented } from '../../ui/Segmented';
import { formatHour, windowAround } from '../onboarding/OnboardingPage';
import { InstallGuide } from './InstallGuide';

export function SettingsPage() {
  const { m, locale, setLocale } = useI18n();
  const [theme, setTheme] = useThemePreference();
  const profile = useProfile();
  const updateProfile = (patch: Partial<Omit<Profile, 'id'>>) =>
    import('../../db/repo').then((repo) => repo.updateProfile(patch));
  const usualHour = profile?.preferredWindow ? (profile.preferredWindow.startHour + 2) % 24 : 8;

  function changeLocale(next: Locale) {
    setLocale(next);
    if (profile) void updateProfile({ locale: next });
  }

  const links = [
    { to: '/privacy', label: m.settings.privacy },
    ...(profile ? [{ to: '/scroll', label: m.settings.scroll }] : []),
    { to: '/test?mode=demo', label: m.settings.demo },
  ];

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={m.settings.title} />

      <Segmented<Locale>
        legend={m.settings.language}
        name="language"
        value={locale}
        onChange={changeLocale}
        options={[
          { value: 'uk', label: 'Українська', lang: 'uk' },
          { value: 'en', label: 'English', lang: 'en' },
        ]}
      />

      <div>
        <Segmented<ThemePreference>
          legend={m.settings.theme}
          name="theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: m.settings.themeSystem },
            { value: 'light', label: m.settings.themeLight },
            { value: 'dark', label: m.settings.themeDark },
          ]}
        />
        <p className="mt-2 text-14 text-muted">{m.settings.themeNote}</p>
      </div>

      {profile ? (
        <div>
          <Kicker className="mb-3">{m.settings.window}</Kicker>
          <Stepper
            label={m.settings.window}
            value={usualHour}
            display={formatHour(usualHour)}
            onChange={(hour) => void updateProfile({ preferredWindow: windowAround(hour) })}
            step={1}
            min={0}
            max={23}
          />
          <p className="mt-3 text-14 text-muted">{m.settings.windowNote}</p>
        </div>
      ) : (
        profile === null && (
          <div className="rounded-card p-5 ring-1 ring-hairline ring-inset">
            <p className="text-16">{m.settings.noProfile}</p>
            <div className="mt-4">
              <ButtonLink to="/onboarding" variant="secondary" arrow>
                {m.settings.setup}
              </ButtonLink>
            </div>
          </div>
        )
      )}

      <section>
        <Kicker className="mb-4">{m.settings.install}</Kicker>
        <InstallGuide />
      </section>

      <ul>
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="group flex min-h-14 items-center justify-between border-t border-hairline text-16"
            >
              {link.label}
              <ArrowRight className="text-muted transition-transform duration-160 group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <Kicker className="mb-3">{m.settings.about}</Kicker>
        {m.settings.aboutText.map((line) => (
          <p key={line} className="text-16 text-muted">
            {line}
          </p>
        ))}
        <p className="mt-4 text-12 text-muted">{fill(m.settings.version, { v: APP_VERSION })}</p>
      </section>
    </div>
  );
}
