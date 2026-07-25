# PageAgent — session handoff

**Read this + `docs/IMPLEMENTATION-PLAN.md` first.** This resumes a long build after a context clear.

## What PageAgent is
A Chrome MV3 extension that "turns any web page into something you can talk to": scan the current page's
DOM → manufacture a **Tool** per actionable element → let Chrome's **on-device** LLM (Gemini Nano / Prompt
API) operate the page via a **Chat** (later voice) assistant. Nothing leaves the machine in the core loop.
Product docs: `docs/00`–`07`. Design: `docs/DESIGN-BRIEF.md` + `docs/design/PageAgent.dc.html`.

## ⚠️ Current honest state (this is the important part)
**Scope A (Phases 0–5) is DONE and merged — but it is ALL A UI PROTOTYPE ON MOCK FIXTURES.**
There is **no real intelligence and nothing touches a real page**:
- The "Chat" is a **puppet**: `src/fixtures/index.ts` keyword-matches ~5 hardcoded phrases (`rerun the failed
  jobs`, `turn off marketing emails`, `where do I turn off two-factor`, `delete`, `export`) and replays a
  canned turn sequence. The Confirm-gate is triggered by a keyword classifier (`src/safety/classifier.ts`).
- Tools/Scan are mock tool-sets (`SPARSE_TOOLS`, `DENSE_TOOLS`), not read from a live DOM.
- The on-device model is **not wired** to anything (capability detection exists but the loop is scripted).

The user (rightly) reacted to this feeling like a fake demo. **The agreed next move is option (A): make it
real** — a thin end-to-end slice that actually scans a live page, generates tools, and uses the on-device
model to run one, on a real page. That is Scope B (Phases 7–9).

## The linchpin: the `EnginePort` seam
Everything in the panel talks to the engine through ONE interface — swap the mock for the real engine here
and no surface changes:
- `src/engine/port.ts` — `EnginePort`: `capability()`, `page()`, `scan(signal)`, `tools()`,
  `runIntent(text, signal): AsyncIterable<Turn>`.
- `src/engine/stub.ts` — `createStubEngine()` (the current mock, from fixtures).
- `src/engine/types.ts` — Tool, ScanResult (ok/partial/failed), Coverage, GatePreview, ReResolution
  (four-outcome union), Certainty, etc.
- `src/sidepanel/App.tsx` — imports `createStubEngine`; owns all state + orchestration (send→runIntent,
  Execute run→gate, availability/degraded, scan). **Scope B: introduce a real engine factory implementing
  EnginePort and swap the import** (keep the stub for tests/gallery).

## THE NEXT TASK (option A — Scope B thin slice), from `docs/IMPLEMENTATION-PLAN.md`
Build the real engine, thinnest vertical slice first (one real page → real tools → run one non-destructive
click). Plan steps (in order):
- **7.0** Permission + MV3 service-worker-lifecycle reconciliation (where the loop/state lives; abort survives
  SW restart). **Prompt-API host document = the side panel — CONFIRMED (Spike A2, 2026-07-25; see below +
  `spikes/FINDINGS.md`):** `create()` succeeds in the real side-panel document at the extension origin (Chrome
  152, `available`). No offscreen document — panel hosts the loop + `LanguageModel` session; content script
  scans/executes over the bus; abort channel is panel-local.
- **7.1** Real capability detection (already have `src/lib/capabilities.ts` detect/provision split).
- **7.2** Content-script + **MAIN-world** bridge (`src/content/content.ts`, `src/content/main-world.ts` are
  stubs today) + a typed panel↔page message bus + tab-binding + an **abort/Stop channel**.
- **7.3** DOM scan → actionable elements (open shadow roots + nested regions; honest coverage; a
  re-resolvable handle per element) with a **scan-performance budget** on large pages.
- **7.4** Tool generation (plain name from accessible-name/nearby-text; honest unlabeled per REQ-SCAN-3).
- **8.1** WebMCP registration + read site-declared `document.modelContext` (fusion); internal registry as base.
- **8.2** Re-scan/freshness + **stale-handle rejection** (dead handle → refuse, don't blind-click).
- **8.3** Reversibility classifier + tier (replaces the mock `classifyTier` behind the same signature).
- **8.4** Execute engine (click/type/choose/follow-link) with a **liveness re-check** (locate-or-decline).
- **8.5** Confirm-gate wired to real DOM (truthful preview from live metadata; **decline if not locatable**).
- **9.1b** Prompt-injection structural enforcement (page content only inert; every action user-provenanced).
- **9.2** On-device **capped `INTENT_SCHEMA` loop** (understand→pick ONE tool→execute→observe→continue).
  **Native tool-calling is NOT usable — use the manual loop** (see spike findings).
- **9.3** Locus + interruptibility wired to the real loop. **Phase 9 = first confirmed action end-to-end.**

## Spike findings that gate the engine (`spikes/FINDINGS.md`)
Verified on Chrome 152 Canary (page context):
- `LanguageModel` present; `availability()` → `"available"`; **`create()` works with no gesture when
  available** (gesture only gates the download). `prompt()` ~1.3s.
- **Native tool-calling is NOT usable** (model emits `run_jobs(...)` as text, never dispatches) → **keep the
  manual capped `INTENT_SCHEMA` loop.** Structured output (`responseConstraint`) works but is NOT strictly
  schema-faithful → **keep a robust parse/coerce step**.
- Element re-resolution (Spike B): **multi-signal fingerprint** — primary = role + accessible-name re-query;
  WeakRef = liveness-negative only; **DOM index never acts**; stable id confirmatory; **decline on ambiguity**.
  Four-outcome union: `resolved-verified | not-found | ambiguous | stale`.
- `document.modelContext` **present** on 152 (WebMCP surface exists) — but keep the internal registry primary.
- **RESOLVED (Spike A2, 2026-07-25):** `create()` **succeeds in the REAL MV3 side-panel document** at the
  extension origin (`chrome-extension://…`, Chrome 152, `availability: "available"`, ~1 ms create, ~1 s
  steady-state routing, **~6 s one-time cold warmup** → create the session eagerly on panel open). **Native
  tool-calling re-confirmed unusable at the extension origin** (0/3 dispatch across 5-tool, 5-tool-forceful,
  36-tool — prose / raw `<|channel>thought` traces) → **manual `INTENT_SCHEMA` loop stays**; **INTENT_SCHEMA
  routing was 4/4 correct incl. the 36-tool set.** Residual: no-gesture create() at the extension origin not
  independently isolated (Claude-in-Chrome can't navigate `chrome-extension://` URLs) — strongly implied
  (available-state gate doesn't apply); fresh-machine download UX still unobserved. Probe:
  `spikes/spike-a2-followup/` (throwaway — safe to delete once this is internalized).

## Reuse (sibling repos referenced by the plan)
- `/Users/danielos/dev/window-ai/chat`: `mcpAgentLoop.ts` (→ `INTENT_SCHEMA`, `extractJsonFromResponse`,
  `coerceArgs`, `buildSystemPrompt`, `MAX_TOOL_CALLS`), `modelContext.ts`, `recipeTools.ts` (Tool contract),
  `ApiStatus.tsx`/`MissingFlagBanner`, `Embeddings/*`, `mcp-probe.html` (fusion fixture).
- `/Users/danielos/dev/e2e-ids-finder/src/manifest.json`: `trial_tokens` + `aiLanguageModelOriginTrial` pattern
  (origin-trial token is env-injected at build via `PAGEAGENT_TRIAL_TOKEN`, never committed; see manifest.config.ts).

## Repo map (Scope-A, all real code, mock data)
- `src/sidepanel/App.tsx` — orchestration; `main.tsx`, `styles.css` (shell), `index.html`.
- `src/surfaces/` — Header, Chat, ConfirmGate, ProcessingLocus, ToolsSurface, ScanGen, AvailabilityBanner
  (+ `contracts.ts` = frozen prop contracts; each has a co-located `.css`).
- `src/components/` — `primitives.{tsx,css}` (Button incl. `firm` variant / Toggle / Tabs / ListRow / Field /
  Badge / Chip / Banner / Card), `icons.tsx` (11 line icons, NO padlock/shield).
- `src/styles/tokens.css` (two-tier tokens, both themes, 3 color jobs), `fonts.ts` (self-hosted woff2).
- `src/engine/`, `src/fixtures/index.ts`, `src/safety/classifier.ts`, `src/lib/capabilities.ts`,
  `src/background/service-worker.ts`, `src/content/{content,main-world}.ts`.
- `manifest.config.ts` (CRXJS), `vite.config.ts`, `scripts/check-{contrast,cvd}.mjs`, `.github/workflows/ci.yml`.

## Conventions (do not regress)
- TS strict + `verbatimModuleSyntax` (`import type`), `noUnusedLocals/Parameters` (prefix unused `_`), no `any`.
- ESLint + `jsx-a11y`; CSS references **semantic tokens only — no raw hex** (raw hex lives only in tokens.css).
- **Confirm-gate safety invariants are load-bearing — never regress** (`src/surfaces/ConfirmGate.test.tsx`):
  initial focus on the SAFE action, Enter can't confirm (type=button, no form), Escape cancels, Tier-2 value
  re-acknowledgment (comprehension, NO timer/press-and-hold), locate-or-decline, **Halt red only at Tier 2**.
- Never oversell reliability/autonomy/privacy; no padlock/shield; meaning never by color/icon alone; ≥44px targets.

## Build / verify / run
```bash
npm install
npm run typecheck && npm run lint && npm run test && npm run build && npm run check:contrast && npm run format
```
Load: `npm run build` → `chrome://extensions` → Developer mode → Load unpacked → **`dist/`** → toolbar icon or
⌘⇧Y. The **dev gallery** at the panel bottom (`▸ Screen gallery`) drives states: dense page, locus
(on-device/unavailable/off-device → availability banner + degraded mode), gate triggers, clear transcript.

## Process / GitHub (repo `danduh/pageagent`)
- Issue-first; PRs link with **plain `Closes #n`** (⚠️ markdown-bold `**#n**` breaks GitHub auto-close — bit us
  twice). Simple labels: feature/bug/design/docs/infra/ui/safety/a11y/engine/spike/epic/blocked. Branch
  `feat|fix|docs|chore|spike/<slug>`. One PR per phase; squash-merge + delete branch.
- **Open issues:** #7 (epic), #5/#6 (spikes), #10 (Canary follow-up — needs Claude-in-Chrome on user's Chrome),
  #44/#45 (last Scope-A UI polish — fold into Phase 6). Everything Phases 0–5 is closed & merged.

## The workflow-authoring pattern that worked (for future phases)
Spine SOLO (types/contracts/engine/fixtures/App wiring) → a **Workflow** authors the separable presentational
pieces in PARALLEL against the frozen contracts + an adversarial critic → I integrate, apply critic fixes,
add committed tests, verify the gate, then verify LIVE in the preview browser (`preview_start name:"dist"`,
resize 380px, navigate `/src/sidepanel/index.html`, drive via `preview_eval`). Note: workflow file output is
HTML-escaped — `html.unescape()` before writing. Ultracode is on: lean into workflows for substantive phases.

## Suggested first action in the fresh session
**The Spike-A follow-up is DONE (2026-07-25) — host document = side panel, manual loop confirmed (above).**
Start **Phase 7** with a thin slice: content-script MAIN-world bridge (7.2) → real DOM scan of a simple page
(7.3) → tool-gen (7.4) → show REAL tools in the existing Tools surface. That alone makes it stop being a
puppet. Then 8.4/8.5 (execute + gate on a real element) → 9.2 (the on-device loop — reuse `mcpAgentLoop.ts`
nearly verbatim, session created eagerly in the side panel) for the first real confirmed action.
