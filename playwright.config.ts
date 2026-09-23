import { defineConfig, devices } from '@playwright/test';

// E2E tests run against the e2e build (npm run build:e2e): the real app, but the attention test
// runs on a compressed clock. It is served by `vite preview` with the production CSP.

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4174',
    trace: 'on-first-retry',
    locale: 'uk-UA',
  },
  projects: [
    { name: 'android-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-safari', use: { ...devices['iPhone 15'] } },
  ],
  webServer: {
    command: 'npm run preview:e2e',
    url: 'http://localhost:4174',
    reuseExistingServer: !isCI,
  },
});
