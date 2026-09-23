import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// The theme/language script must run before the first paint, so it is inlined into index.html.
// The CSP still forbids inline scripts in general and allows exactly this one by its hash.
const themeScript = readFileSync(new URL('./src/theme-init.js', import.meta.url), 'utf8').trim();
const themeHash = `'sha256-${createHash('sha256').update(themeScript).digest('base64')}'`;
const withThemeHash = (headers: string) =>
  headers.includes(themeHash)
    ? headers
    : headers.replace("script-src 'self'", `script-src 'self' ${themeHash}`);

// CSP lives in one place — public/_headers (Netlify reads it). The local preview server sends
// the same header, so e2e tests catch anything the production policy would block.
function cspFromHeadersFile(): string {
  const headers = readFileSync(new URL('./public/_headers', import.meta.url), 'utf8');
  const match = /Content-Security-Policy:\s*(.+)/.exec(withThemeHash(headers));
  if (!match?.[1]) throw new Error('Content-Security-Policy not found in public/_headers');
  return match[1].trim();
}

function inlineThemeScript(): Plugin {
  let outDir = 'dist';
  return {
    name: 'nern:inline-theme-script',
    configResolved: (config) => {
      outDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: (html) =>
      html.replace('<script src="/theme-init.js"></script>', `<script>${themeScript}</script>`),
    // After the build: put the same hash into the _headers file that Netlify will serve.
    closeBundle: () => {
      const file = resolve(outDir, '_headers');
      writeFileSync(file, withThemeHash(readFileSync(file, 'utf8')));
    },
  };
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    inlineThemeScript(),
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
        background_color: '#0B0B0C',
        theme_color: '#0B0B0C',
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
        // Fonts: Fixel, the Cyrillic and Latin cuts of Cormorant, and the counter's digits.
        // Onest is only a fallback and is not precached.
        globPatterns: [
          '**/*.{js,css,html,svg,png,txt}',
          'fonts/*.woff2',
          'assets/cormorant-{cyrillic,latin}-300-*.woff2',
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
    headers: { 'Content-Security-Policy': cspFromHeadersFile() },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
