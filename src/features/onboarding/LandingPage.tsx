import { useEffect } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { ButtonLink } from '../../ui/Button';

export function LandingPage() {
  const { m, locale, setLocale } = useI18n();

  useEffect(() => {
    document.title = 'NeRN';
  }, []);

  // "Your attention. Your data. Your experiments." — one sentence per line.
  const headlineLines = m.landing.headline.split(/(?<=\.)\s+/);

  return (
    <>
      <header className="flex h-14 items-center justify-between">
        <span className="font-display text-20 font-semibold tracking-[-0.01em]">NeRN</span>
        <button
          type="button"
          onClick={() => setLocale(locale === 'uk' ? 'en' : 'uk')}
          lang={locale === 'uk' ? 'en' : 'uk'}
          className="-mr-3 min-h-11 px-3 text-14 text-muted transition-colors duration-160 ease-out hover:text-text"
        >
          {locale === 'uk' ? 'English' : 'Українська'}
        </button>
      </header>

      <section className="pt-16">
        <h1 className="font-display text-hero font-semibold tracking-[-0.02em]">
          {headlineLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <p className="mt-5 max-w-[34ch] text-16 text-muted">{m.landing.mission}</p>

        <div className="mt-10 flex flex-col items-start gap-5">
          <ButtonLink to="/test?mode=demo">{m.landing.tryDemo}</ButtonLink>
          <Link
            to="/privacy"
            className="text-14 text-muted underline decoration-hairline underline-offset-4 transition-colors duration-160 ease-out hover:text-text"
          >
            {m.landing.privacyLink}
          </Link>
        </div>
      </section>
    </>
  );
}
