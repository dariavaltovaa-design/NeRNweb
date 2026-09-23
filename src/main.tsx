import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

// Onest: fallback if Fixel fails to load (Cyrillic + Latin only).
// JetBrains Mono: the test counter, which shows only digits, so Latin is enough.
// Browsers download these files only when a character actually needs them.
import '@fontsource/onest/cyrillic-400.css';
import '@fontsource/onest/cyrillic-500.css';
import '@fontsource/onest/cyrillic-600.css';
import '@fontsource/onest/latin-400.css';
import '@fontsource/onest/latin-500.css';
import '@fontsource/onest/latin-600.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './index.css';

import { router } from './app/router';
import { I18nProvider } from './i18n/I18nProvider';

const root = document.getElementById('root');
if (!root) throw new Error('#root is missing in index.html');

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  </StrictMode>,
);
