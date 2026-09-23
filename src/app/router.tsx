import { createBrowserRouter } from 'react-router';
import { ExperimentsPage } from '../features/experiments/ExperimentsPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { LandingPage } from '../features/onboarding/LandingPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { PrivacyPage } from '../features/privacy/PrivacyPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { TestPage } from '../features/test/TestPage';
import { TodayPage } from '../features/today/TodayPage';
import { AppShell, BareLayout } from './layouts';
import { NotFoundPage } from './NotFoundPage';

// The 8 screens from SPEC «Екрани».
export const router = createBrowserRouter([
  {
    element: <BareLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/onboarding', element: <OnboardingPage /> },
    ],
  },
  // The test has no layout at all: no navigation, nothing but the stimulus.
  { path: '/test', element: <TestPage /> },
  {
    element: <AppShell />,
    children: [
      { path: '/today', element: <TodayPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/experiments', element: <ExperimentsPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  {
    element: <BareLayout />,
    children: [{ path: '*', element: <NotFoundPage /> }],
  },
]);
