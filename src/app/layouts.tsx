import { NavLink, Outlet } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';

/** Landing, onboarding: one centred column, no tab bar. */
export function BareLayout() {
  return (
    <main className="mx-auto min-h-dvh max-w-[480px] px-5 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <Outlet />
    </main>
  );
}

/** Everyday screens with the tab bar at the bottom. */
export function AppShell() {
  const { m } = useI18n();
  const tabs = [
    { to: '/today', label: m.nav.today },
    { to: '/history', label: m.nav.history },
    { to: '/experiments', label: m.nav.experiments },
    { to: '/settings', label: m.nav.settings },
  ];

  return (
    <div className="min-h-dvh">
      <main className="mx-auto max-w-[480px] px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+88px)]">
        <Outlet />
      </main>

      <nav
        aria-label={m.nav.label}
        className="fixed inset-x-0 bottom-0 border-t border-hairline bg-bg pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-[480px] grid-cols-4">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  'relative flex min-h-14 items-center justify-center px-1 text-12 font-medium transition-colors duration-160 ease-out ' +
                  // Active tab: brighter text plus a short accent line, so the state is not colour-only.
                  (isActive
                    ? 'text-text before:absolute before:top-0 before:left-1/2 before:h-0.5 before:w-6 before:-translate-x-1/2 before:rounded-full before:bg-accent'
                    : 'text-muted')
                }
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
