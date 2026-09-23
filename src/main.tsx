import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

// Cormorant: editorial headlines and the Form number (Cyrillic + Latin, light roman and italic).
// JetBrains Mono: the test counter (digits only → Latin).
// Browsers download these files only when a character actually needs them.
import '@fontsource/cormorant/cyrillic-300.css';
import '@fontsource/cormorant/latin-300.css';
import '@fontsource/cormorant/cyrillic-300-italic.css';
import '@fontsource/cormorant/latin-300-italic.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './index.css';

import './app/install';
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
