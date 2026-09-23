import { expect, test, type Page } from '@playwright/test';

const ORIGIN = 'http://localhost:4173';

const ROUTES = [
  '/',
  '/onboarding',
  '/test',
  '/today',
  '/history',
  '/experiments',
  '/privacy',
  '/settings',
];

/** Collects console errors (including CSP violations) and any request that leaves our domain. */
function watch(page: Page) {
  const errors: string[] = [];
  const foreignRequests: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== ORIGIN) foreignRequests.push(request.url());
  });
  return { errors, foreignRequests };
}

test.use({ locale: 'uk-UA' });

for (const route of ROUTES) {
  test(`${route} opens: no errors, no requests outside our domain`, async ({ page }) => {
    const { errors, foreignRequests } = watch(page);
    await page.goto(route);
    await expect(page.getByRole('main')).not.toBeEmpty();
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
    expect(foreignRequests).toEqual([]);
  });
}

test('language switch applies at once and survives a reload', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Налаштування');

  await page.getByText('English', { exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
});

test('theme switch applies at once and survives a reload', async ({ page }) => {
  await page.goto('/settings');
  await page.getByText('Темна', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('test screen looks the same in the light theme', async ({ page }) => {
  await page.goto('/settings');
  await page.getByText('Світла', { exact: true }).click();
  await page.goto('/test');
  await expect(page.getByRole('main')).toHaveCSS('background-color', 'rgb(5, 5, 7)');
  await expect(page.getByRole('navigation')).toHaveCount(0);
});

test('works offline after the first visit', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Playwright supports service workers only in Chromium');

  await page.goto('/today');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.goto('/history');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Історія');
});
