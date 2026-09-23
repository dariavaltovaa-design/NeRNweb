/// <reference types="vite/client" />

/** Injected by vite.config.ts from package.json. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** "1" only in the e2e build: the test runs on a compressed clock. */
  readonly VITE_FAST_TEST?: string;
}
