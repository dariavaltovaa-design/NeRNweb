import { Link } from 'react-router';
import { useThemePreference, type ThemePreference } from '../../app/theme';
import type { Locale } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { PageTitle } from '../../ui/PageTitle';
import { Segmented } from '../../ui/Segmented';

export function SettingsPage() {
  const { m, locale, setLocale } = useI18n();
  const [theme, setTheme] = useThemePreference();

  return (
    <>
      <PageTitle>{m.settings.title}</PageTitle>

      <div className="mt-8 flex flex-col gap-8">
        <Segmented<Locale>
          legend={m.settings.language}
          name="language"
          value={locale}
          onChange={setLocale}
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

        <Link
          to="/privacy"
          className="flex min-h-12 items-center justify-between border-y border-hairline text-16"
        >
          {m.settings.privacy}
          <span aria-hidden="true" className="text-muted">
            →
          </span>
        </Link>
      </div>
    </>
  );
}
