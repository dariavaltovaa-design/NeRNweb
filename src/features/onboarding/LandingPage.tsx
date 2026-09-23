import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { usePulse } from '../../app/pulse';
import { databaseExists } from '../../db/exists';
import { fill } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { SMARTPHONE_NORM } from '../../stats/norms';
import { ButtonLink } from '../../ui/Button';
import { Editorial, Kicker, type EditorialTitle } from '../../ui/Heading';
import { Marquee, Reveal, RunningCounter } from '../../ui/Motion';
import { challengeQuery, readChallenge } from '../test/challenge';

const SOURCES = [
  {
    label: 'Basner et al., 2011 — PVT‑B',
    url: 'https://www.med.upenn.edu/uep/assets/user-content/documents/Basner2011-ValidityandsensitivityofabriefPVT.pdf',
  },
  { label: 'Deering et al., 2018 — PVT on smartphones', url: SMARTPHONE_NORM.url },
];

/** A full-width band of the page. `tone` flips the section to ink or bone, whatever the theme. */
function Band({
  tone,
  children,
  className = '',
}: {
  tone: 'ink' | 'bone';
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`${tone === 'ink' ? 'theme-dark' : 'theme-light'} bg-bg text-text ${className}`}
    >
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">{children}</div>
    </section>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: EditorialTitle }) {
  return (
    <Reveal as="div" className="mb-12 md:mb-16">
      <Kicker className="mb-5">{kicker}</Kicker>
      <h2 className="text-56 md:text-96">
        <Editorial title={title} />
      </h2>
    </Reveal>
  );
}

export function LandingPage() {
  const { m, locale, setLocale } = useI18n();
  const [params] = useSearchParams();
  const challenge = readChallenge(params);
  const pulse = usePulse();
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    document.title = `NeRN — ${m.brand.slogan}`;
  }, [m]);

  useEffect(() => {
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

  const query = challengeQuery(challenge);
  const testLink = query ? `/test?${query}` : '/test';
  const hour = new Date().getHours();
  const uaNow = pulse?.ua.hours[hour]?.meanRtMs ?? pulse?.ua.meanRtMs ?? null;
  const toggleLanguage = () => setLocale(locale === 'uk' ? 'en' : 'uk');

  return (
    <div className="theme-dark bg-bg">
      <main>
        {/* ── Hero ─────────────────────────────────────────── */}
        <Band tone="ink">
          <header className="flex h-16 items-center justify-between pt-[env(safe-area-inset-top)]">
            <span className="font-display text-18 font-semibold tracking-[0.02em]">NeRN</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleLanguage}
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

          <div className="grid min-h-[calc(100svh-64px)] items-center gap-12 py-10 md:grid-cols-[1.3fr_0.7fr] md:py-16">
            <div>
              {challenge ? (
                <div className="animate-rise mb-8 rounded-card bg-surface p-5 ring-1 ring-accent ring-inset">
                  <Kicker className="text-accent">{m.landing.challengeKicker}</Kicker>
                  <p className="mt-2 text-18">
                    {challenge.name
                      ? fill(m.landing.challengeNamed, { name: challenge.name, ms: challenge.ms })
                      : fill(m.landing.challengeAnonymous, { ms: challenge.ms })}
                  </p>
                </div>
              ) : (
                <Kicker className="animate-rise mb-8">{m.landing.kicker}</Kicker>
              )}
              <h1 className="text-hero tracking-[-0.02em]">
                <Editorial title={m.landing.headline} animate />
              </h1>
              <div className="animate-rise mt-8 max-w-[40ch] space-y-3 text-18 text-muted [animation-delay:300ms]">
                {m.landing.lead.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <div className="animate-rise mt-10 [animation-delay:450ms]">
                <ButtonLink to={testLink} arrow>
                  {challenge ? m.landing.challengeAccept : m.landing.cta}
                </ButtonLink>
              </div>
            </div>

            {/* The test itself, as a living preview. */}
            <figure className="animate-rise mx-auto w-full max-w-[360px] [animation-delay:200ms]">
              <div className="grid aspect-[4/3] place-items-center rounded-card bg-stimulus-bg ring-1 ring-hairline md:aspect-[4/5]">
                <RunningCounter className="font-display text-96 font-semibold text-stimulus" />
              </div>
              <figcaption className="kicker mt-4 text-center text-muted">
                {m.landing.demoCaption}
              </figcaption>
            </figure>
          </div>
        </Band>

        <div className="theme-dark bg-bg text-text">
          <Marquee items={m.landing.marquee} />
        </div>

        {/* ── Numbers ─────────────────────────────────────── */}
        <Band tone="ink" className="py-16 md:py-24">
          <dl className="grid gap-y-10 sm:grid-cols-3">
            {(uaNow
              ? [
                  { value: `${uaNow} ${m.common.ms}`, label: m.landing.liveLabel },
                  ...m.landing.stats.slice(0, 2),
                ]
              : m.landing.stats
            ).map((stat, i) => (
              <Reveal
                key={stat.label}
                delay={i * 120}
                className="flex flex-col sm:px-8 sm:first:pl-0"
              >
                <dt className="kicker order-2 mt-3 max-w-[26ch] text-muted">{stat.label}</dt>
                <dd className="font-display text-56 font-semibold tracking-[-0.04em] md:text-72">
                  {stat.value}
                </dd>
              </Reveal>
            ))}
          </dl>
        </Band>

        {/* ── What you find out: bone ──────────────────────── */}
        <Band tone="bone" className="py-24 md:py-36">
          <SectionTitle kicker={m.landing.whatKicker} title={m.landing.whatTitle} />
          <ol>
            {m.landing.what.map((item, i) => (
              <Reveal
                as="li"
                key={item.title}
                delay={i * 80}
                className="grid gap-3 border-t border-hairline py-8 md:grid-cols-[96px_1fr_1fr] md:gap-8 md:py-10"
              >
                <span className="font-display text-20 font-semibold text-accent">0{i + 1}</span>
                <h3 className="font-display text-20 font-semibold tracking-[0.02em] uppercase md:text-28">
                  {item.title}
                </h3>
                <p className="max-w-[44ch] text-16 text-muted md:text-18">{item.text}</p>
              </Reveal>
            ))}
          </ol>
        </Band>

        {/* ── Science: ink ─────────────────────────────────── */}
        <Band tone="ink" className="py-24 md:py-36">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <SectionTitle kicker={m.landing.scienceKicker} title={m.landing.scienceTitle} />
            <div>
              <ul>
                {m.landing.science.map((line, i) => (
                  <Reveal
                    as="li"
                    key={line}
                    delay={i * 80}
                    className="border-t border-hairline py-5 text-18"
                  >
                    {line}
                  </Reveal>
                ))}
              </ul>
              <ul className="mt-6 flex flex-col gap-2">
                {SOURCES.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-14 text-muted underline decoration-hairline underline-offset-4 hover:text-text"
                    >
                      {source.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Band>

        {/* ── Privacy: bone ────────────────────────────────── */}
        <Band tone="bone" className="py-24 md:py-36">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <SectionTitle kicker={m.landing.privacyKicker} title={m.landing.privacyTitle} />
            <div>
              <ul>
                {m.landing.privacy.map((line, i) => (
                  <Reveal
                    as="li"
                    key={line}
                    delay={i * 80}
                    className="border-t border-hairline py-5 text-18"
                  >
                    {line}
                  </Reveal>
                ))}
              </ul>
              <div className="mt-8">
                <ButtonLink to="/privacy" variant="quiet" arrow>
                  {m.landing.privacyMore}
                </ButtonLink>
              </div>
            </div>
          </div>
        </Band>

        {/* ── Final call: ink ──────────────────────────────── */}
        <Band tone="ink" className="py-24 text-center md:py-36">
          <Reveal>
            <h2 className="text-72 md:text-128">
              <Editorial title={m.landing.finalTitle} />
            </h2>
            <p className="mx-auto mt-6 max-w-[34ch] text-18 text-muted">{m.landing.finalText}</p>
            <div className="mt-10 flex justify-center">
              <ButtonLink to={testLink} arrow>
                {m.landing.cta}
              </ButtonLink>
            </div>
          </Reveal>
        </Band>
      </main>

      {/* ── Footer with the oversized wordmark ───────────── */}
      <footer className="theme-dark overflow-hidden bg-bg text-text">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 border-t border-hairline px-5 py-8 md:px-10">
          <p className="kicker text-muted">{m.brand.notMedical}</p>
          <nav className="flex gap-6">
            <Link to="/privacy" className="kicker text-muted hover:text-text">
              {m.privacy.title}
            </Link>
            <button
              type="button"
              onClick={toggleLanguage}
              lang={locale === 'uk' ? 'en' : 'uk'}
              className="kicker text-muted hover:text-text"
            >
              {m.common.otherLanguage}
            </button>
          </nav>
        </div>
        <p
          aria-hidden="true"
          className="text-wordmark -mb-[0.18em] text-center font-display font-semibold tracking-[-0.06em] select-none"
        >
          NeRN
        </p>
      </footer>
    </div>
  );
}
