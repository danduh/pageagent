import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(dir, '../dist');

// Loads the built, unpacked MV3 extension and asserts its service worker registers.
// Prerequisite: `npm run build` (dist/ must exist) + `npx playwright install chromium`.
test('the unpacked extension loads and its service worker registers', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [`--disable-extensions-except=${distPath}`, `--load-extension=${distPath}`],
  });
  try {
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker');
    expect(sw.url()).toContain('service-worker');
  } finally {
    await context.close();
  }
});
