import { expect, test } from '@playwright/test';
import { mockPulse, watch } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockPulse(page);
});

const ROUTES = [
  '/',
  '/onboarding',
  '/test',
  '/today',
  '/history',
  '/experiments',
  '/scroll',
  '/privacy',
  '/settings',
  '/no-such-page',
];

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

test('daily screens send people without consent to onboarding', async ({ page }) => {
  await page.goto('/today');
  await expect(page).toHaveURL(/\/onboarding$/);
});

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

test('the test screen looks the same in the light theme', async ({ page }) => {
  await page.goto('/settings');
  await page.getByText('Світла', { exact: true }).click();
  await page.goto('/test?mode=demo');
  await expect(page.locator('main[data-stage]')).toHaveCSS('background-color', 'rgb(5, 5, 7)');
  await expect(page.getByRole('navigation')).toHaveCount(0);
});

test('works offline after the first visit', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Playwright supports service workers only in Chromium');

  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Приватність');
  await page.goto('/test?mode=demo');
  await expect(page.locator('main[data-stage]')).toHaveAttribute('data-stage', 'ready');
});
