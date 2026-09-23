import { NavLink, Outlet, useLocation } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';

/** Onboarding, 404: one centred column, no tab bar. */
export function BareLayout() {
  return (
    <main className="mx-auto min-h-dvh max-w-[480px] px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <Outlet />
    </main>
  );
}

/**
 * SPEC «Фон протягом дня»: on Today the background warms slightly in the morning
 * and deepens in the evening. Never on the test screen.
 */
function timeOfDay(hour: number): 'morning' | 'day' | 'evening' {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 18) return 'day';
  return 'evening';
}

const TINT = { morning: 'tint-morning', day: '', evening: 'tint-evening' } as const;

/** Everyday screens with the tab bar at the bottom. */
export function AppShell() {
  const { m } = useI18n();
  const location = useLocation();
  const tint = location.pathname === '/today' ? TINT[timeOfDay(new Date().getHours())] : '';
  const tabs = [
    { to: '/today', label: m.nav.today },
    { to: '/history', label: m.nav.history },
    { to: '/experiments', label: m.nav.experiments },
    { to: '/settings', label: m.nav.settings },
  ];

  return (
    <div className={`min-h-dvh overflow-x-clip ${tint}`}>
      <main className="mx-auto max-w-[480px] px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-[calc(env(safe-area-inset-bottom)+104px)]">
        <Outlet />
      </main>

      <nav
        aria-label={m.nav.label}
        className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-bg pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-[480px] grid-cols-4">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  'relative flex min-h-16 items-center justify-center px-1 text-center text-12 font-medium transition-colors duration-160 ease-out ' +
                  // Active tab: brighter text plus a small accent dot, so the state is not colour-only.
                  (isActive
                    ? 'text-text before:absolute before:top-3 before:left-1/2 before:size-1 before:-translate-x-1/2 before:rounded-full before:bg-accent'
                    : 'text-muted hover:text-text')
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
