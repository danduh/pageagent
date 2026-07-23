import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

// MV3 build. `vite build` emits a CSP-clean dist/ (no eval, no remote code).
// `vite build --watch` (npm run dev) is the reliable reload path — MV3's strict
// CSP forbids the eval-based Vite dev server inside the panel (Step 1.2).
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true,
  },
});
