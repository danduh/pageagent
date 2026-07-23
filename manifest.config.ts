import { defineManifest } from '@crxjs/vite-plugin';

// Origin-trial token (Step 1.5) is injected from the environment at build time and
// MUST NOT be committed. On Canary/Dev channels the Prompt API works without it
// (see spikes/FINDINGS.md — availability was "available" on Chrome 152); the token
// is for stable-channel origin-trial coverage.
const trialToken = process.env.PAGEAGENT_TRIAL_TOKEN;

const icons = {
  16: 'icons/icon16.png',
  32: 'icons/icon32.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png',
};

export default defineManifest({
  manifest_version: 3,
  name: 'PageAgent',
  version: '0.0.1',
  description: 'Turn any web page into something you can talk to — on-device, in the page in front of you.',
  minimum_chrome_version: '128',
  icons,
  action: {
    default_title: 'PageAgent — open the panel',
    default_icon: icons,
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  // Least-privilege (REQ-PERM). The <all_urls> content-script matches below are the
  // one broad grant needed to prove the entry points in Phase 1; Step 7.0 reconciles
  // the host-access model against the engine's real needs before shipping.
  permissions: ['sidePanel', 'scripting', 'activeTab', 'storage'],
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/content.ts'],
      run_at: 'document_idle',
    },
    {
      // MAIN world: the surface where WebMCP document.modelContext tools register later.
      matches: ['<all_urls>'],
      js: ['src/content/main-world.ts'],
      run_at: 'document_idle',
      world: 'MAIN',
    },
  ],
  commands: {
    toggle_panel: {
      suggested_key: { default: 'Ctrl+Shift+Y', mac: 'Command+Shift+Y' },
      description: 'Open the PageAgent side panel and focus its input',
    },
  },
  ...(trialToken ? { trial_tokens: [trialToken] } : {}),
});
