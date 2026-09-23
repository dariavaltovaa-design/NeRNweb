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
 * The anonymous average lives in a Netlify function, which `vite preview` doesn't run.
 * Tests answer for it: `n` results of `ms` at every hour of the day.
 */
export async function mockPulse(page: Page, { n = 0, ms = 350 } = {}) {
  const posts: unknown[] = [];
  await page.route('**/.netlify/functions/pulse', async (route) => {
    if (route.request().method() === 'POST') {
      posts.push(route.request().postDataJSON());
      await route.fulfill({ status: 204 });
      return;
    }
    const shown = n >= 20 ? ms : null;
    const scope = {
      n,
      meanRtMs: shown,
      hours: Array.from({ length: 24 }, () => ({ n, meanRtMs: shown })),
      bins: n >= 20 ? Array.from({ length: 56 }, (_, i) => (i === 10 ? n : 0)) : [],
    };
    await route.fulfill({ json: { ua: scope, all: scope } });
  });
  return posts;
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
  // Countdown 3 s + warm-up + the timed part, then the app leaves the test screen.
  await expect(
    page.locator('main[data-stage="running"], main[data-stage="countdown"]'),
  ).toHaveCount(0, { timeout: 45_000 });
}

/** A first test, then "keep my results" (18+) on the result screen → Today. */
export async function firstTestAndSave(page: Page) {
  await page.goto('/test');
  await takeTest(page);
  await expect(page.getByTestId('word')).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Почати' }).click();
  await expect(page).toHaveURL(/\/today$/);
}
