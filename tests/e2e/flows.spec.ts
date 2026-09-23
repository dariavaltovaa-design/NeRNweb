import { expect, test, type Page } from '@playwright/test';
import { firstTestAndSave, mockPulse, takeTest, watch } from './helpers';

test('landing → test → one word, nothing stored, one anonymous number sent', async ({ page }) => {
  const posts = await mockPulse(page);
  const { errors, foreignRequests } = watch(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Пройти тест · 60 с' }).first().click();
  await takeTest(page);

  await expect(page.getByTestId('word')).toHaveText(/Блискавка|Гостро|Бадьоро|Сонно|Туман/);
  await expect(page.getByText('Середнє у дослідженні на смартфонах — 481 мс.')).toBeVisible();
  await expect(page.getByText(/Середнє по Україні з’явиться після 20 результатів/)).toBeVisible();

  const stored = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  expect(stored).not.toContain('nern');
  expect(posts).toHaveLength(1);
  expect(Object.keys(posts[0] as object).sort()).toEqual(['hour', 'meanRtMs']);
  expect(errors).toEqual([]);
  expect(foreignRequests).toEqual([]);
});

test('with enough data the result compares with Ukraine at this hour', async ({ page }) => {
  await mockPulse(page, { n: 40, ms: 380 });
  await page.goto('/test');
  await takeTest(page);
  await expect(page.getByText('По Україні о цій порі — 380 мс.')).toBeVisible();
  await expect(page.getByText(/Ти швидше, ніж \d+% учасників з України\./)).toBeVisible();
});

test('switching the average off sends nothing', async ({ page }) => {
  const posts = await mockPulse(page);
  await page.goto('/settings');
  await page.getByText('Анонімне середнє по Україні', { exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Анонімне середнє по Україні' })).not.toBeChecked();
  await page.goto('/test');
  await takeTest(page);
  await expect(page.getByTestId('word')).toBeVisible();
  expect(posts).toHaveLength(0);
});

test('a challenge link: banner → test → who is faster', async ({ page }) => {
  await mockPulse(page);
  await page.goto('/?vs=312&from=Даша');
  await expect(page.getByText('Даша реагує за 312 мс. Зможеш швидше?')).toBeVisible();
  await page.getByRole('link', { name: 'Прийняти виклик' }).first().click();
  await takeTest(page);
  await expect(page.getByText(/^Виклик від Даша: /)).toBeVisible();
});

test('keep results with one checkbox → Today → check-in → History', async ({ page }) => {
  await mockPulse(page);
  await firstTestAndSave(page);
  await expect(page.getByTestId('today-result')).toBeVisible();

  await page.getByRole('button', { name: 'Сон: Більше' }).click();
  await page.getByRole('button', { name: 'Кава' }).click();
  await expect(page.getByText('Збережено на цьому телефоні').first()).toBeVisible();

  await page.getByRole('link', { name: 'Історія' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Історія');
  await page.getByRole('button', { name: 'Розгорнути графік' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

/** Adds past valid daily tests straight into IndexedDB, on the same device as the real one. */
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
          medianRtMs: 300,
          meanRtMs: 300,
          meanSpeed: 3.33,
          lapses: 0,
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

test('after 3 tests on other days: streak and your usual level', async ({ page }) => {
  await mockPulse(page);
  await firstTestAndSave(page);
  await seedHistory(page, 3);
  await page.reload();
  await expect(page.getByText('4 дні')).toBeVisible();
  await expect(page.getByText(/^300\s*мс$/)).toBeVisible();
});

test('starting an experiment shows the plan and the verdict status', async ({ page }) => {
  await mockPulse(page);
  await firstTestAndSave(page);
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
  await mockPulse(page);
  await firstTestAndSave(page);
  await page.goto('/privacy');

  const [json] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Експортувати все · JSON' }).click(),
  ]);
  expect(json.suggestedFilename()).toMatch(/^nern-\d{4}-\d{2}-\d{2}\.json$/);

  const [csv] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Експортувати тести · CSV' }).click(),
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
