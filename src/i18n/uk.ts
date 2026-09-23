// Ukrainian is the source dictionary: its shape defines the type every other language must match.
// Rules (SPEC): "ти", sentences up to 12 words, no exclamation marks except «Новий пік!».

export const uk = {
  nav: {
    label: 'Основна навігація',
    today: 'Сьогодні',
    history: 'Історія',
    experiments: 'Експерименти',
    settings: 'Налаштування',
  },
  landing: {
    headline: 'Твоя увага. Твої дані. Твої експерименти.',
    mission:
      'Тест уваги на 90 секунд, щоб ставити експерименти над власним життям. Дані ніколи не залишають твій телефон.',
    tryDemo: 'Спробувати 60 секунд',
    privacyLink: 'Як NeRN береже твої дані',
  },
  onboarding: {
    title: 'Знайомство',
    placeholder: 'Тут будуть три короткі кроки: вік, тест і зручний час.',
  },
  test: {
    placeholder: 'Тест з’явиться на наступному етапі.',
    back: 'Назад',
  },
  today: {
    title: 'Сьогодні',
    placeholder: 'Тут з’явиться твоя Форма дня.',
  },
  history: {
    title: 'Історія',
    placeholder: 'Тут буде графік твоєї Форми за 60 днів.',
  },
  experiments: {
    title: 'Експерименти',
    placeholder: 'Тут будуть експерименти над твоїми звичками.',
  },
  privacy: {
    title: 'Приватність',
    placeholder: 'Усі твої дані лежать лише на цьому пристрої.',
  },
  settings: {
    title: 'Налаштування',
    language: 'Мова',
    theme: 'Тема',
    themeSystem: 'Як у системі',
    themeLight: 'Світла',
    themeDark: 'Темна',
    themeNote: 'Екран тесту завжди темний, щоб результати були порівнянні.',
    privacy: 'Приватність',
  },
  notFound: {
    title: 'Такої сторінки немає',
    home: 'На головну',
  },
  units: {
    days: { one: '{n} день', few: '{n} дні', many: '{n} днів', other: '{n} дня' },
  },
};
