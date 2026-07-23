# Phase 0 derisking spikes

Two throwaway probes that settle the two assumptions the whole product rests on
**before** we freeze the engine architecture (the `EnginePort` contract, Step 3.0).
They are deliberately outside the shipping code and can be deleted after their
findings are recorded in [`FINDINGS.md`](./FINDINGS.md).

| Spike | Question | Issue |
|-------|----------|-------|
| **A** — `spike-a-languagemodel/` | Does `LanguageModel` (Prompt API / Gemini Nano) actually work **from the MV3 side-panel document**, or only from a content script / offscreen document? | #5 |
| **B** — `spike-b-handle/` | Can an element handle be **re-resolved across an SPA re-render**, and can a MAIN-world script read `document.modelContext`? Which re-resolution strategy survives? | #6 |

Why they matter: Spike A decides where the agent brain (the capped intent-loop)
lives — which changes the content-script bridge topology, the loop location, and
the Stop/abort channel. Spike B underpins the liveness-recheck and the
**locate-or-decline** safety guarantee of the Confirm-gate (if handles don't
re-resolve, that guarantee rests on quicksand).

## Requirements
- **Spike A** needs a Chrome that supports the Prompt API for extensions, with
  Gemini Nano downloaded and (for real use) an origin-trial token. Even without a
  token the probe reports availability honestly (`unavailable`), which is itself a
  useful finding.
- **Spike B** needs any recent Chrome.

## How to run

### Spike A
1. `chrome://extensions` → enable Developer mode → **Load unpacked** → select
   `spikes/spike-a-languagemodel/`.
2. Click the extension's toolbar icon to open its side panel.
3. Read the on-screen report and the DevTools console for the side panel.
4. Record the result in `FINDINGS.md` → *Spike A*.

### Spike B
1. `chrome://extensions` → **Load unpacked** → select `spikes/spike-b-handle/`.
   (If serving the fixture from `file://`, also enable *Allow access to file URLs*
   for the extension; or serve the folder over `http://localhost`.)
2. Open `spikes/spike-b-handle/spa-fixture.html`.
3. Click **Capture handle**, then **Simulate SPA re-render**, then read the
   per-strategy re-resolution results on the page and in the console.
4. Record the result in `FINDINGS.md` → *Spike B*.
