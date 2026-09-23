import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// CSP lives in one place — netlify.toml. The local preview server sends the same
// header, so e2e tests catch anything the production policy would block.
function cspFromNetlifyToml(): string {
  const toml = readFileSync(new URL('./netlify.toml', import.meta.url), 'utf8');
  const match = /Content-Security-Policy\s*=\s*"([^"]+)"/.exec(toml);
  if (!match?.[1]) throw new Error('Content-Security-Policy not found in netlify.toml');
  return match[1];
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registration goes into a separate file, not an inline <script>, so the CSP stays strict.
      injectRegister: 'script-defer',
      includeManifestIcons: false, // already precached by globPatterns below
      manifest: {
        name: 'NeRN',
        short_name: 'NeRN',
        description: 'Тест уваги на 90 секунд. Твої дані лишаються на твоєму телефоні.',
        lang: 'uk',
        start_url: '/today',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B0C10',
        theme_color: '#0B0C10',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Only the app's own static files. Never user data (that lives in IndexedDB).
        // Fonts: Fixel and the test counter's digits. Onest is only a fallback, it is not precached.
        globPatterns: [
          '**/*.{js,css,html,svg,png,txt}',
          'fonts/*.woff2',
          'assets/jetbrains-mono-latin-[0-9]*.woff2',
        ],
        navigateFallback: '/index.html',
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    // Never inline files as data: URLs — the CSP allows fonts and images only from our domain.
    assetsInlineLimit: 0,
  },
  preview: {
    headers: { 'Content-Security-Policy': cspFromNetlifyToml() },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
