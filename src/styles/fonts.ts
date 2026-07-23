// Self-hosted fonts — bundled woff2 via @fontsource. No CDN / no external requests
// (MV3-CSP-clean, on-device ethos). Vite fingerprints the woff2 into dist/assets.
//
// We import the `latin` + `latin-ext` subsets only (drops Cyrillic/Greek/Vietnamese)
// to keep the bundled payload lean while still covering Western accents, currency,
// and punctuation — so page-derived Tool names don't tofu (Step 2.6 / #15). Fuller
// script coverage can be added per-need without changing the token layer.

// Display — Hanken Grotesk (sparse: headings, empty states)
import '@fontsource/hanken-grotesk/latin-500.css';
import '@fontsource/hanken-grotesk/latin-ext-500.css';
import '@fontsource/hanken-grotesk/latin-600.css';
import '@fontsource/hanken-grotesk/latin-ext-600.css';
import '@fontsource/hanken-grotesk/latin-700.css';
import '@fontsource/hanken-grotesk/latin-ext-700.css';

// Body / UI — IBM Plex Sans
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-ext-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-ext-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-ext-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-sans/latin-ext-700.css';

// Tool identifiers / scan output — IBM Plex Mono
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-ext-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-ext-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-ext-600.css';

// Hyperlegible accessibility mode — Atkinson Hyperlegible
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-ext-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import '@fontsource/atkinson-hyperlegible/latin-ext-700.css';
