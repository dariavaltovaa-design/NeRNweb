# NeRN — пам'ять для агента

Головний документ — `SPEC.md` (розділ «Зміни до ТЗ — 23 вересня 2026» описує все, що змінилося). Протокол: спершу план, код після «так»; нові залежності — лише з дозволу; жодних мережевих запитів у коді.

## Команди

| Команда                           | Що робить                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Дев-сервер (http://localhost:5173)                                                           |
| `npm run build`                   | Перевірка типів + продакшн-збірка в `dist/`                                                  |
| `npm run preview`                 | Роздає `dist/` з тим самим CSP, що й Netlify (http://localhost:4173)                         |
| `npm test`                        | Юніт-тести (Vitest): рушій, статистика, i18n                                                 |
| `npm run e2e`                     | Збирає `dist-e2e` (тест на стиснутому годиннику) і запускає Playwright (Pixel 7 + iPhone 15) |
| `npm run lint` / `npm run format` | ESLint / Prettier                                                                            |
| `npm run icons`                   | Перегенерувати тимчасові іконки в `public/icons/`                                            |

## Структура

- `src/engine/` — рушій PVT (`pvt.ts`), параметри (`config.ts`), seed-генератор. Без React; UI отримує команди через `PvtView`.
- `src/stats/` — метрики сеансу, Форма, експерименти й bootstrap, «Ціна скролу», підпис дня. Чисті функції + `stats.test.ts`.
- `src/db/` — Dexie: `schema.ts`, `db.ts` (версії), `repo.ts` (усі читання/записи, експорт, видалення), `exists.ts` (перевірка без Dexie для відвідувачів).
- `src/i18n/` — `uk.ts` (джерело форми), `en.ts` (типізований як `Messages`), `format.ts` (множини, `fill`).
- `src/ui/` — токени (`tokens.css`), шрифти, `FormRing`, кнопки, діалог, контроли.
- `src/app/` — роутер (ліниві екрани), макети, тема, встановлення PWA, `useAppData`.
- `src/features/<екран>/` — екрани.
- `src/theme-init.js` — вбудовується в `index.html` під час збірки; CSP дозволяє його за хешем.
- `public/_headers`, `public/_redirects` — CSP, заголовки, SPA-перенаправлення (для будь-якого способу деплою).

## Конвенції

- Кольори, шрифти, розміри — лише токени. Стандартні палітри Tailwind вимкнені (`--color-*: initial`).
- Типографіка: `serif-caps` / `serif-italic` (Cormorant), `kicker` (дрібні великі підписи), `font-display` (Fixel Display). Табличних цифр не ставити.
- Тексти — лише через `useI18n().m`. Без «!», крім `newPeak`. Без дієслів минулого часу (рід).
- Коміти англійською, Conventional Commits.

## Ухвалені рішення

- 2026-09-23 — Шрифти: Fixel + Cormorant + JetBrains Mono, усі OFL. Inter, Onest та інші — ні. Без «ШІ-естетики».
- 2026-09-23 — Дизайн за референсами Sobha Privy Collection і Lumen (принципи, не копії).
- 2026-09-23 — Новий репозиторій `Desktop/nern/` → github.com/dariavaltovaa-design/NeRNweb.
- 2026-09-23 — Мова й тема в `localStorage`; база IndexedDB створюється лише після 18+.
- 2026-09-23 — TypeScript 6.0 (typescript-eslint поки не підтримує 7).
- 2026-09-23 — `build.assetsInlineLimit: 0`: жодних `data:`-шрифтів під CSP.
- 2026-09-23 — Невалідність через фальстарти: фальстартів більше, ніж валідних реакцій.
- 2026-09-23 — Звичний діапазон — після ≥ 5 сеансів після калібрування. Перцентилі — тип 7.
- 2026-09-23 — Lighthouse mobile (локально, gzip): Performance 81–91, Accessibility 100, Best Practices 100. Основна вага — React DOM + React Router.
