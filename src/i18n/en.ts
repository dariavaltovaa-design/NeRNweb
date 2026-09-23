import type { Messages } from './messages';

// Typed as Messages: a missing or extra key here fails the build.

export const en: Messages = {
  nav: {
    label: 'Main navigation',
    today: 'Today',
    history: 'History',
    experiments: 'Experiments',
    settings: 'Settings',
  },
  landing: {
    headline: 'Your attention. Your data. Your experiments.',
    mission:
      'A 90-second attention test for experiments on your own life. Your data never leaves your phone.',
    tryDemo: 'Try 60 seconds',
    privacyLink: 'How NeRN protects your data',
  },
  onboarding: {
    title: 'Getting started',
    placeholder: 'Three short steps will live here: age, the test, your time.',
  },
  test: {
    placeholder: 'The test arrives in the next stage.',
    back: 'Back',
  },
  today: {
    title: 'Today',
    placeholder: 'Your daily Form will appear here.',
  },
  history: {
    title: 'History',
    placeholder: 'A 60-day chart of your Form will live here.',
  },
  experiments: {
    title: 'Experiments',
    placeholder: 'Experiments with your habits will live here.',
  },
  privacy: {
    title: 'Privacy',
    placeholder: 'All your data stays on this device only.',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    theme: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeNote: 'The test screen is always dark, so results stay comparable.',
    privacy: 'Privacy',
  },
  notFound: {
    title: 'This page doesn’t exist',
    home: 'Go home',
  },
  units: {
    days: { one: '{n} day', other: '{n} days' },
  },
};
