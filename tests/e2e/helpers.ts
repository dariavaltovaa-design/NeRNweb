import { expect, type Page } from '@playwright/test';

export const ORIGIN = 'http://localhost:4174';

/** Collects console errors (including CSP violations) and any request that leaves our domain. */
export function watch(page: Page) {
  const errors: string[] = [];
  const foreignRequests: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== ORIGIN && url.protocol !== 'blob:') foreignRequests.push(request.url());
  });
  return { errors, foreignRequests };
}

/**
 * Takes the whole attention test like a person: tap to start, then tap ~150 ms after each
 * stimulus appears, until the test screen goes away.
 */
export async function takeTest(page: Page) {
  const main = page.locator('main[data-stage]');
  await expect(main).toHaveAttribute('data-stage', 'ready');
  await main.click({ position: { x: 150, y: 300 } });

  const counter = page.getByTestId('counter');
  for (let i = 0; i < 60; i++) {
    // The test screen is gone once the session is saved and the app moves on.
    if ((await main.count()) === 0) break;
    const stage = await main.getAttribute('data-stage', { timeout: 1000 }).catch(() => null);
    if (stage === null || stage === 'saving' || stage === 'result') break;
    const shown = await counter
      .waitFor({ state: 'visible', timeout: 2500 })
      .then(() => true)
      .catch(() => false);
    if (!shown) continue;
    await page.waitForTimeout(150);
    await main.click({ position: { x: 150, y: 300 } }).catch(() => undefined);
    await counter.waitFor({ state: 'hidden', timeout: 2500 }).catch(() => undefined);
  }
}

/** Goes through onboarding (18+, how it works, usual time) and lands on the first test. */
export async function onboard(page: Page) {
  await page.goto('/onboarding');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Далі' }).click();
  await page.getByRole('button', { name: 'Далі' }).click();
  await page.getByRole('button', { name: 'Почати перший тест' }).click();
  await expect(page).toHaveURL(/\/test\?mode=daily/);
}
