import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

// Two families only: Cormorant (upright, light) for big headings, Fixel for everything else.
// No italics: Cyrillic italic letters (т, д, и, п) read like Latin ones in a UI.
import '@fontsource/cormorant/cyrillic-300.css';
import '@fontsource/cormorant/latin-300.css';
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
