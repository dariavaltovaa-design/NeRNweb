import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { databaseExists } from '../../db/exists';
import { useI18n } from '../../i18n/I18nProvider';
import { ButtonLink } from '../../ui/Button';
import { Editorial, Kicker, type EditorialTitle } from '../../ui/Heading';
import { FormRing } from '../../ui/FormRing';
import { Check, Close } from '../../ui/icons';

const PVT_B_SOURCE =
  'https://www.med.upenn.edu/uep/assets/user-content/documents/Basner2011-ValidityandsensitivityofabriefPVT.pdf';

/** A full-width band of the page. `tone` flips the section to ink or bone, whatever the theme. */
function Band({
  tone,
  children,
  className = '',
  lazy = true,
}: {
  tone: 'ink' | 'bone';
  children: ReactNode;
  className?: string;
  /** Below the fold: the browser skips layout and paint until it scrolls near. */
  lazy?: boolean;
}) {
  return (
    <section
      className={`${tone === 'ink' ? 'theme-dark' : 'theme-light'} bg-bg text-text ${className} ${lazy ? 'offscreen' : ''}`}
    >
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">{children}</div>
    </section>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: EditorialTitle }) {
  return (
    <header className="mb-12 md:mb-16">
      <Kicker className="mb-5">{kicker}</Kicker>
      <h2 className="text-56 tracking-[-0.01em] md:text-72">
        <Editorial title={title} />
      </h2>
    </header>
  );
}

export function LandingPage() {
  const { m, locale, setLocale } = useI18n();
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    document.title = 'NeRN';
    // Visitors without a profile never download the database code: ask the browser first.
    let cancelled = false;
    databaseExists()
      .then((exists) => (exists ? import('../../db/repo').then((repo) => repo.getProfile()) : null))
      .then((profile) => !cancelled && setHasProfile(profile !== null && profile !== undefined))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const dailyLink = hasProfile ? '/today' : '/onboarding';
  const dailyLabel = hasProfile ? m.landing.openApp : m.landing.startDaily;

  return (
    <div className="theme-dark bg-bg">
      <main>
        {/* ── Hero ─────────────────────────────────────────── */}
        <Band tone="ink" className="relative" lazy={false}>
          <header className="flex h-16 items-center justify-between pt-[env(safe-area-inset-top)]">
            <span className="font-display text-18 font-semibold tracking-[0.02em]">NeRN</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLocale(locale === 'uk' ? 'en' : 'uk')}
                lang={locale === 'uk' ? 'en' : 'uk'}
                className="kicker min-h-11 px-3 text-muted transition-colors duration-160 hover:text-text"
              >
                {m.common.otherLanguage}
              </button>
              {hasProfile && (
                <Link
                  to="/today"
                  className="kicker min-h-11 content-center px-3 text-text transition-colors duration-160 hover:text-accent"
                >
                  {m.nav.today}
                </Link>
              )}
            </div>
          </header>

          <div className="grid min-h-[calc(100svh-64px)] items-center gap-12 py-12 md:grid-cols-[1.25fr_0.75fr] md:py-20">
            <div className="animate-rise">
              <Kicker className="mb-8">{m.landing.kicker}</Kicker>
              <h1 className="text-hero tracking-[-0.015em]">
                {m.landing.headline.map((line) => (
                  <span key={line.italic} className="block">
                    <Editorial title={line} />
                  </span>
                ))}
              </h1>
              <p className="mt-8 max-w-[36ch] text-18 text-muted">{m.brand.positioning}</p>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
                <ButtonLink to="/test?mode=demo" arrow>
                  {m.landing.tryDemo}
                </ButtonLink>
                <ButtonLink to={dailyLink} variant="quiet">
                  {dailyLabel}
                </ButtonLink>
              </div>
            </div>

            <figure className="mx-auto w-full max-w-[340px]">
              <FormRing
                state={{ kind: 'form', value: 87, range: { low: 78, high: 92 }, newPeak: false }}
                label={m.landing.ringCaption}
                kicker={m.today.formLabel}
                caption={m.today.ofHundred}
                animate
              />
              <figcaption className="mt-4 text-center text-12 text-muted">
                {m.landing.ringCaption}
              </figcaption>
            </figure>
          </div>

          <dl className="grid border-t border-hairline sm:grid-cols-3">
            {m.landing.facts.map((fact, i) => (
              <div
                key={fact.label}
                className={`flex flex-col py-8 sm:px-8 ${i > 0 ? 'border-t border-hairline sm:border-t-0 sm:border-l' : 'sm:pl-0'}`}
              >
                <dt className="kicker order-2 mt-3 text-muted">{fact.label}</dt>
                <dd className="font-display text-56 font-semibold tracking-[-0.04em]">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </Band>

        {/* ── Principles: bone ─────────────────────────────── */}
        <Band tone="bone" className="py-24 md:py-36">
          <SectionTitle kicker={m.landing.principlesKicker} title={m.landing.principlesTitle} />
          <ol>
            {m.landing.principles.map((p, i) => (
              <li
                key={p.title}
                className="grid gap-3 border-t border-hairline py-8 md:grid-cols-[96px_1fr_1fr] md:gap-8 md:py-10"
              >
                <span className="serif-italic text-28 text-accent">0{i + 1}</span>
                <h3 className="font-display text-20 font-semibold tracking-[0.02em] uppercase md:text-28">
                  {p.title}
                </h3>
                <p className="max-w-[42ch] text-16 text-muted md:text-18">{p.text}</p>
              </li>
            ))}
          </ol>
        </Band>

        {/* ── How it works: ink ────────────────────────────── */}
        <Band tone="ink" className="py-24 md:py-36">
          <SectionTitle kicker={m.landing.howKicker} title={m.landing.howTitle} />
          <ol className="grid gap-12 md:grid-cols-3 md:gap-8">
            {m.landing.steps.map((step, i) => (
              <li key={step.title} className="border-t border-hairline pt-6">
                <div className="mb-8 flex h-40 items-center justify-center rounded-card bg-surface">
                  <StepVisual index={i} />
                </div>
                <p className="kicker mb-3 text-muted">0{i + 1}</p>
                <h3 className="font-display text-20 font-semibold tracking-[0.02em] uppercase">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[36ch] text-16 text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </Band>

        {/* ── Science and honesty: bone ────────────────────── */}
        <Band tone="bone" className="py-24 md:py-36">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <SectionTitle kicker={m.landing.scienceKicker} title={m.landing.scienceTitle} />
            <div>
              <ul>
                {m.landing.science.map((line) => (
                  <li key={line} className="border-t border-hairline py-5 text-18">
                    {line}
                  </li>
                ))}
              </ul>
              <a
                href={PVT_B_SOURCE}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block text-14 text-muted underline decoration-hairline underline-offset-4 hover:text-text"
              >
                {m.landing.sourceLink} ↗
              </a>
            </div>
          </div>
        </Band>

        {/* ── Privacy label: ink ───────────────────────────── */}
        <Band tone="ink" className="py-24 md:py-36">
          <SectionTitle kicker={m.landing.privacyKicker} title={m.landing.privacyTitle} />
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <LabelList title={m.privacy.countsTitle} items={m.privacy.counts} mark="yes" />
            <LabelList title={m.privacy.neverTitle} items={m.privacy.never} mark="no" />
          </div>
          <div className="mt-12">
            <ButtonLink to="/privacy" variant="quiet" arrow>
              {m.landing.privacyMore}
            </ButtonLink>
          </div>
        </Band>

        {/* ── Final call: bone ─────────────────────────────── */}
        <Band tone="bone" className="py-24 text-center md:py-36">
          <h2 className="text-72 tracking-[-0.01em] md:text-96">
            <Editorial title={m.landing.finalTitle} />
          </h2>
          <p className="mx-auto mt-6 max-w-[34ch] text-18 text-muted">{m.landing.finalText}</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
            <ButtonLink to="/test?mode=demo" arrow>
              {m.landing.tryDemo}
            </ButtonLink>
            <ButtonLink to={dailyLink} variant="quiet">
              {dailyLabel}
            </ButtonLink>
          </div>
        </Band>
      </main>

      {/* ── Footer with the oversized wordmark ───────────── */}
      <footer className="theme-dark overflow-hidden bg-bg text-text">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 pt-10 md:px-10">
          <p className="kicker text-muted">{m.brand.notMedical}</p>
          <nav className="flex gap-6">
            <Link to="/privacy" className="kicker text-muted hover:text-text">
              {m.privacy.title}
            </Link>
            <button
              type="button"
              onClick={() => setLocale(locale === 'uk' ? 'en' : 'uk')}
              lang={locale === 'uk' ? 'en' : 'uk'}
              className="kicker text-muted hover:text-text"
            >
              {m.common.otherLanguage}
            </button>
          </nav>
        </div>
        <p
          aria-hidden="true"
          className="text-wordmark mt-6 -mb-[0.16em] text-center font-display font-semibold tracking-[-0.06em] select-none"
        >
          NeRN
        </p>
      </footer>
    </div>
  );
}

function LabelList({
  title,
  items,
  mark,
}: {
  title: string;
  items: readonly string[];
  mark: 'yes' | 'no';
}) {
  return (
    <div>
      <h3 className="font-display text-20 font-semibold tracking-[0.02em] uppercase">{title}</h3>
      <ul className="mt-6">
        {items.map((item) => (
          <li key={item} className="flex gap-4 border-t border-hairline py-4 text-16">
            <span className={`mt-0.5 shrink-0 ${mark === 'yes' ? 'text-accent' : 'text-muted'}`}>
              {mark === 'yes' ? <Check /> : <Close />}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Small drawings for the three steps: the counter, the Form, the A/B plan. */
function StepVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <span className="flex h-full w-full items-center justify-center rounded-card bg-stimulus-bg font-mono text-56 text-stimulus">
        284
      </span>
    );
  }
  if (index === 1) {
    return (
      <span className="flex items-baseline gap-2">
        <span className="serif-caps text-96 leading-none">87</span>
        <span className="kicker text-muted">/ 100</span>
      </span>
    );
  }
  const plan = 'ABBAABBABAABAB';
  return (
    <span className="grid grid-cols-7 gap-1.5" aria-hidden="true">
      {plan.split('').map((c, i) => (
        <span
          key={i}
          className={
            'grid size-7 place-items-center rounded-[6px] text-11 font-medium ' +
            (i < 9
              ? c === 'A'
                ? 'bg-text text-bg'
                : 'bg-accent text-on-cta'
              : 'text-muted ring-1 ring-hairline ring-inset')
          }
        >
          {c}
        </span>
      ))}
    </span>
  );
}
