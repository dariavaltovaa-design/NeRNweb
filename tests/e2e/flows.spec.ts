import { expect, test, type Page } from '@playwright/test';
import { onboard, takeTest, watch } from './helpers';

test('demo: 60-second test without saving, then a result', async ({ page }) => {
  const { errors, foreignRequests } = watch(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Спробувати 60 секунд' }).first().click();
  await takeTest(page);
  await expect(page.getByTestId('typical')).toBeVisible();
  await expect(page.getByText('Це демо: результат ніде не збережено.')).toBeVisible();
  const stored = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  expect(stored).not.toContain('nern');
  expect(errors).toEqual([]);
  expect(foreignRequests).toEqual([]);
});

test('first launch: 18+ → how it works → time → test → calibration 1/5', async ({ page }) => {
  await onboard(page);
  await takeTest(page);
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('img', { name: 'Калібрування: 1 з 5' })).toBeVisible();
});

test('daily session → check-in → history', async ({ page }) => {
  await onboard(page);
  await takeTest(page);
  await expect(page).toHaveURL(/\/today$/);

  await page.getByRole('button', { name: 'Сон: Більше' }).click();
  await page.getByRole('button', { name: 'Кава' }).click();
  await expect(page.getByText('Збережено на цьому пристрої')).toBeVisible();

  await page.getByRole('link', { name: 'Історія' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Історія');
  await expect(page.getByText('калібрування').first()).toBeVisible();
});

/** Adds past valid daily sessions straight into IndexedDB, on the same device as the real one. */
async function seedHistory(page: Page, days: number) {
  await page.evaluate(async (count) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('nern');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = db.transaction('sessions').objectStore('sessions').getAll();
    const existing = await new Promise<Array<Record<string, unknown>>>((resolve) => {
      read.onsuccess = () => resolve(read.result as Array<Record<string, unknown>>);
    });
    const template = existing[0]!;
    const tx = db.transaction('sessions', 'readwrite');
    for (let i = 1; i <= count; i++) {
      const day = new Date(Date.now() - i * 86_400_000);
      day.setHours(8, 0, 0, 0);
      const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      tx.objectStore('sessions').put({
        ...template,
        id: `seed-${i}`,
        startedAt: day.getTime(),
        localDate: date,
        localHour: 8,
        validity: { ok: true, reasons: [] },
        metrics: {
          medianRtMs: 280,
          meanSpeed: 3 + (i % 5) * 0.1,
          lapses: 1,
          falseStarts: 0,
          validTrials: 20,
        },
        checkIn: undefined,
      });
    }
    await new Promise((resolve) => (tx.oncomplete = resolve));
    db.close();
  }, days);
}

test('after calibration the Form appears with the usual range', async ({ page }) => {
  await onboard(page);
  await takeTest(page);
  await seedHistory(page, 12);
  await page.reload();
  await expect(page.getByRole('img', { name: /^Форма \d+ зі 100/ })).toBeVisible();
  await expect(page.getByTestId('position')).toBeVisible();

  await page.getByRole('link', { name: 'Історія' }).click();
  await page.getByRole('button', { name: 'Розгорнути графік' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Форма за 60 днів')).toBeVisible();
});

test('starting an experiment shows the plan and the verdict status', async ({ page }) => {
  await onboard(page);
  await takeTest(page);
  await page.getByRole('link', { name: 'Експерименти' }).click();
  await page.getByRole('button', { name: /Телефон поза спальнею/ }).click();
  await page.getByRole('button', { name: 'Почати експеримент' }).click();

  const active = page.getByTestId('active-experiment');
  await expect(active).toBeVisible();
  await expect(active.getByRole('listitem', { name: /^День 1: умова [AB]/ })).toBeVisible();
  await expect(page.getByTestId('verdict')).toContainText('Поки замало даних');

  await page.getByRole('link', { name: 'Сьогодні' }).click();
  await expect(page.getByText(/Сьогодні ввечері: Умова [AB]/)).toBeVisible();
});

test('export JSON and CSV, then delete everything', async ({ page }) => {
  await onboard(page);
  await takeTest(page);
  await page.goto('/privacy');

  const [json] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Експортувати все · JSON' }).click(),
  ]);
  expect(json.suggestedFilename()).toMatch(/^nern-\d{4}-\d{2}-\d{2}\.json$/);

  const [csv] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Експортувати сеанси · CSV' }).click(),
  ]);
  expect(csv.suggestedFilename()).toMatch(/\.csv$/);

  await page.getByRole('button', { name: 'Видалити все' }).click();
  const confirm = page.getByRole('button', { name: 'Видалити назавжди' });
  await expect(confirm).toBeDisabled();
  await page.getByRole('dialog').getByRole('textbox').fill('видалити');
  await confirm.click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/today');
  await expect(page).toHaveURL(/\/onboarding$/);
});
