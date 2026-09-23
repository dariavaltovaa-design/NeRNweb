import { createBrowserRouter, Outlet } from 'react-router';
import { LandingPage } from '../features/onboarding/LandingPage';
import { AppShell, BareLayout } from './layouts';
import { NotFoundPage } from './NotFoundPage';

// The landing page ships in the first bundle; every other screen (and the database code)
// loads on demand and is precached by the service worker for offline use.
const page =
  <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  async () => ({ Component: (await load())[name] });

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    HydrateFallback: () => null,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/test', lazy: page(() => import('../features/test/TestPage'), 'TestPage') },
      {
        element: <BareLayout />,
        children: [
          {
            path: '/onboarding',
            lazy: page(() => import('../features/onboarding/OnboardingPage'), 'OnboardingPage'),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: <AppShell />,
        children: [
          {
            // Daily screens need the 18+ profile.
            lazy: page(() => import('./RequireProfile'), 'RequireProfile'),
            children: [
              {
                path: '/today',
                lazy: page(() => import('../features/today/TodayPage'), 'TodayPage'),
              },
              {
                path: '/history',
                lazy: page(() => import('../features/history/HistoryPage'), 'HistoryPage'),
              },
              {
                path: '/experiments',
                lazy: page(
                  () => import('../features/experiments/ExperimentsPage'),
                  'ExperimentsPage',
                ),
              },
              {
                path: '/scroll',
                lazy: page(() => import('../features/scroll/ScrollPage'), 'ScrollPage'),
              },
            ],
          },
          {
            path: '/privacy',
            lazy: page(() => import('../features/privacy/PrivacyPage'), 'PrivacyPage'),
          },
          {
            path: '/settings',
            lazy: page(() => import('../features/settings/SettingsPage'), 'SettingsPage'),
          },
        ],
      },
    ],
  },
]);
