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
 * Takes the whole attention test like a person: tap to start, then tap 150 ms after each stimulus.
 * The "finger" runs inside the page, so a slow CI machine cannot make it late.
 */
export async function takeTest(page: Page) {
  const main = page.locator('main[data-stage]');
  await expect(main).toHaveAttribute('data-stage', 'ready');
  await page.evaluate(() => {
    const surface = document.querySelector('main[data-stage]');
    const counter = document.querySelector<HTMLElement>('[data-testid="counter"]');
    if (!surface || !counter) throw new Error('test screen not found');
    // The engine makes the counter visible exactly when a stimulus appears.
    new MutationObserver(() => {
      if (counter.style.visibility !== 'visible' || counter.textContent !== '0') return;
      window.setTimeout(() => {
        surface.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientY: 300 }),
        );
      }, 150);
    }).observe(counter, { attributes: true, attributeFilter: ['style'] });
  });
  await main.click({ position: { x: 150, y: 300 } });
  // Countdown 3 s + practice + the timed part, then the app leaves the test screen.
  await expect(
    page.locator('main[data-stage="running"], main[data-stage="countdown"]'),
  ).toHaveCount(0, { timeout: 45_000 });
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
