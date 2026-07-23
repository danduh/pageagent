import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'docs/**',
      'spikes/**',
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Accessibility is the flagship — jsx-a11y recommended is a hard gate.
  jsxA11y.flatConfigs.recommended,
  reactHooks.configs['recommended-latest'],
  {
    // App + shared browser code (side panel, content scripts, service worker).
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, chrome: 'readonly' },
    },
  },
  {
    // Build/config files run in Node.
    files: [
      '*.config.{ts,js}',
      'manifest.config.ts',
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
      'scripts/**/*.{js,mjs}',
    ],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Tests run in jsdom via Vitest.
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'e2e/**'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  }
);
