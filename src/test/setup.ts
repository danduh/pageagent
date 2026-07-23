import '@testing-library/jest-dom/vitest';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);
// globals:false means React Testing Library's auto-cleanup isn't registered — do it here
// so renders don't accumulate (otherwise axe sees duplicate landmarks across tests).
afterEach(() => cleanup());

// Minimal chrome stub so the panel's chrome.* guards don't throw under jsdom.
(globalThis as unknown as { chrome: unknown }).chrome = {
  tabs: {
    query: (_query: unknown, cb?: (tabs: unknown[]) => void) => cb?.([]),
  },
};
