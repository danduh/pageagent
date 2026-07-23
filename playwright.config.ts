import { defineConfig } from '@playwright/test';

// E2E loads the built extension in a headed, persistent Chromium context.
// Requires `npm run build` first and `npx playwright install chromium`. Not part
// of the required CI job (needs a display + browser binaries); run locally / in a
// headed CI lane. See e2e/extension.spec.ts.
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: { headless: false },
});
