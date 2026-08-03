# PageAgent — session handoff

**Read this first, then `docs/IMPLEMENTATION-PLAN.md`.** Resumes a long build after a context clear.
Last updated after the **AI-first risk classifier (#67)** merged. **All of Phase 8 (8.1–8.5) + 10.1 merged to `main`**, plus post-live fixes **#63/#65** and the AI-first classifier **#67**. Core single-action flow **verified live on the user's Chrome Canary**. Repo `danduh/pageagent`.

> **TARGET RUNTIME = Chrome Canary** (all APIs present: Prompt API/Nano, `document.modelContext`, embeddings). Do NOT hedge with stable-channel version numbers (148/149/150/152) or their missing APIs — user directive. The in-app preview browser (Chromium 148) is a tooling limitation, not the product target. The engine's honest-degradation code stays as the plan specifies (framing directive, not a code change).

## What PageAgent is
Chrome MV3 extension that "turns any web page into something you can talk to": scan the current page's
DOM → manufacture a **Tool** per actionable control → let Chrome's **on-device** LLM (Gemini Nano / Prompt
API) operate the page via **Chat** (later voice). Nothing leaves the machine in the core loop. Also **fuses**
the site's OWN declared WebMCP tools (`document.modelContext`). Product docs `docs/00`–`07`; design
`docs/DESIGN-BRIEF.md`; engine topology decision `docs/adr/0001-…`.

## ✅ Current state — it is REAL, end-to-end, on-device (not a puppet)
**All of Phase 8 (8.1–8.5) + 10.1 merged to `main`; AI-first risk classifier merged (#67).** **169 tests green**; panel bundle ~266 KB. Core flow **VERIFIED LIVE on the user's Canary** (capability → scan → tool-gen → WebMCP fusion → on-device INTENT_SCHEMA loop → execute → honest report + undo).
- **Spike A2 (#47):** Prompt-API host = the **side panel** (create() works there). Native tool-calling **unusable** on Nano → manual `INTENT_SCHEMA` loop. `spikes/FINDINGS.md`.
- **Phase 7 (#49):** real DOM **scan** + **tool-gen** of the live active tab, behind `EnginePort`.
- **Phase 9 (#51):** the **on-device capped loop** — type intent → model picks ONE tool → tier → gate (locate-or-decline) → execute on a **re-resolved** live element → certainty-ladder report + one-tap reverse. First confirmed action, on-device. (Adversarial review found + fixed **6** real safety bugs.)
- **Phase 8.1 (#53):** **WebMCP fusion** — read the page's declared `document.modelContext` tools via `getTools()`, merge with DOM tools (site-declared wins), invoke via `executeTool`. Declared tools badged "From this site" + an MCP icon. (Review found + fixed **7** real bugs incl. a postMessage-forgery hole.)
- **Phase 8.4 (#55):** the **Tools-tab "Run"** now executes for real (was an honest hand-back) — same tier→gate→execute→report pipeline as Chat, incl. declared tools. Shared `runSelectedTool`.
- **Phase 8.2 (merged, #61):** **freshness/staleness** — the extension now notices when the live page drifts from its last scan (DOM mutation past a threshold, SPA route change, full navigation/reload, tab switch) and marks the tool-set stale so a moved control can't be blindly run. Pure reducer `src/engine/freshness.ts`; content-script `MutationObserver` + location poll push a `page-changed` notice (`content.ts`); `EnginePort.onPageChange` (live: runtime message + tab events, **filtered to the scanned tab + window**); App combines sticky drift with a transient "wrong tab" flag, guards `send`/`runTool` when stale, resets on re-scan. **Key safety fix (2 review rounds, 8 findings):** every message is now pinned to `boundTabId` (the tab a scan was taken from), so an execute can never land on a different tab the user switched to; the undo remembers its own tab too.
- **Phase 8.3 (merged, #59):** **real reversibility classifier** — `classifyAction(signal,opts)` in `src/safety/classifier.ts` tiers each action from keyword signals + action-type + origin (keyword tiers are an unchangeable floor; action-type + origin only ESCALATE; the Tier-2 money/sign-out/delete-account set is un-configurable). Threaded into `toolgen` (page origin) + `fusion` (declaring origin). Two review rounds fixed 22 findings (under-gating gaps like "Buy now"/"Cash out"/"Empty Trash" + over-gating like "Analog output"/"$5 off"). NFKC + look-alike normalization resists odd-character evasion. `classifyTier(text)` string wrapper kept for the stub.
- **Phase 10.1 (merged, #57):** **best-effort multi-step** — `runAgentLoop` sequences steps (observe → **re-scan → re-plan**) up to a cap, **opt-in via a `rescan` dep** so the single-action core is byte-identical when absent (Execute-tab stays single). Injection-safe between-step history (tool ids + categorical status, JSON-escaped). Stops honestly on model-`done`, a stale/unmapped tool (never fires), decline/cancel, repeat (canonical-args guard), or the cap. Chat opts in (`live.ts` `rescanForLoop`). Two adversarial-review rounds → **9 bugs fixed** (reverse wrong-element → **fingerprint-pinned undo**; concurrent-scan race → **inFlight owner-identity guard**; re-plan-prompt injection; false-"done"; multi-arg/reordered-key repeat guard; reverse-during-run). Also fixed 2 Canary console warnings: **Prompt-API `expectedInputs`/`expectedOutputs: en`** (output-language attestation) and dropped the unused cross-world **`modulepreload`** (`vite.config` `modulePreload:false`).
- **Post-live fixes (merged):** site-tool **empty-args + explicit failure should STOP not retry** (#63); **multi-step only when the request asks for it** — a plain single-action request no longer fires a conflicting 2nd action (#65; `looksMultiStep` gates re-scan/re-plan behind sequencing cues like "then/next/;").
- **AI-first risk classifier (merged, #67):** the **on-device model is now the risk decision-maker**. In ONE batched, JSON-schema-constrained call it rates EACH scanned control `safe`/`midrisk`/`highrisk` + **confidence 0–100**; a confident verdict (**≥ 85, configurable**) is trusted outright — it can **raise OR lower** the tier — else the deterministic keyword flow (`classifyAction`) decides that one control; **no model / empty reply → keyword flow for everything** (graceful). Controls are shown to the model by **safe surrogate tokens** (`c0,c1…`; the page-controlled id is never placed structurally → a hostile label can't inject) and framed as inert data; **every scan re-classifies FRESH** (incl. the between-step re-scan) so a changed control is never judged by a stale prior-page verdict. **DESIGN — settled, do not re-litigate: pure AI judgment, NO always-on backstop** (the money/delete-account/sign-out lock was offered and the **user declined it**). Pure pieces `buildRiskPrompt`/`parseRiskClassification`/`saferVerdict`/`decideRisk`/`RISK_SCHEMA` in `src/safety/classifier.ts` are unit-tested; the batched call `classifyRisksWithAi` runs a fresh isolated Nano session in `src/engine/live.ts` `doScan`. A **pre-merge adversarial review (4 dimensions: injection-safety, correctness, refactor-regression, ship-blockers) found 0 issues.** The same PR carried a **code-simplification pass** — App.tsx `startRun` + `addReport` helpers removing the 3× run-scaffold copy-paste (one home for the Stop/abort lifecycle), and dead-code removal (`ReResolution`, `ContentResponse`, `StepRecord.actionType`).

**The stub is still the fixtures puppet** (`src/fixtures/index.ts`, `src/safety/classifier.ts`) — it now only drives **tests + the dev gallery**; the loaded extension uses the **live engine** (`src/engine/live.ts`), selected in `App.tsx` via `isExtensionRuntime()`.

## Architecture (the live path)
`EnginePort` (`src/engine/port.ts`) is the ONE seam — `capability/page/scan/tools/runIntent(text,signal,host)`.
`createLiveEngine()` returns `LiveEngine = EnginePort & { reverseAction, runTool }`.
- **On-device brain** `src/engine/agentLoop.ts`: `runAgentLoop` (Chat) + the extracted **`runSelectedTool(tool,args,deps)`** — the shared tier→gate→execute→report tail used by BOTH Chat and the Execute-tab. `INTENT_SCHEMA`, `extractJsonFromResponse`/`coerceArgs`/`parseIntent`, `buildSystemPrompt` (page text is **inert data**, injection defence), `outcomeToReport`/`declineText`. `ToolRunDeps` ⊂ `LoopDeps`.
- **Live engine** `src/engine/live.ts`: creates the Nano session eagerly (`ensureSession`, ~6 s cold warmup), `prompt(t,{responseConstraint:INTENT_SCHEMA})`. `makeToolRunDeps(host,signal,provenanceFor)` builds gate/execute that **branch on `tool.source`**: `manufactured` → `bridgeExecute` (DOM, over the message bus); `declared` → `invokeDeclaredTool` (WebMCP). Gate does a dry-run **locate-or-decline** before `host.confirm`.
- **Content bridge** `src/content/content.ts` (isolated world): `scan`/`execute`/`execute-declared` handlers over `chrome.tabs.sendMessage`; relays declared invokes to the MAIN world over `window.postMessage` (guarded by `ev.source===window`). `src/content/main-world.ts`: reads `document.modelContext.getTools()` (+ re-reads on `toolchange`), invokes via `executeTool`. Protocol `src/content/messages.ts`.
- **Scan/resolve/execute** `src/content/scanner.ts` (`walkDom`+`analyzeActionable`+`scanDom`), `accname.ts`, `resolve.ts` (`reResolve` four-outcome, decline-on-ambiguity), `execute.ts` (`executeAction` + observed before/after).
- **Fusion** `src/engine/fusion.ts`: `declaredToTool` (+`humanize` before tiering), `mergeTools` (site-wins), `interpretDeclaredResult` (honest — a `{success:false}` return is never "Done"). Tool-gen `src/engine/toolgen.ts`. Types `src/engine/scan-types.ts` (`ScannedElement`, `ElementFingerprint`, `ExecOutcome` incl. `disconnected`, `DeclaredToolDef`, `ObservedChange`).
- **App** `src/sidepanel/App.tsx`: engine selection; `send`→`runIntent`; `runTool`→`engine.runTool`; `reverse`→`reverseAction`; **gate-as-promise** (`host.confirm` sets `pendingGate` + resolves via `gateResolverRef` on approve/cancel/Stop); Stop/Escape.

## ⚠️ Hard-won gotchas (do NOT relearn these the hard way)
1. **`document.modelContext.executeTool(tool, args)` wants `args` as a JSON STRING.** An object throws *"Failed to parse input arguments"*; results come back as JSON strings (parse them). Handled in `main-world.ts`. NOTE: the WebMCP **demo page** `windowai.danduh.me/webmcp` **polyfills** modelContext to accept objects — it lies about the native contract. Test on the local `demo/settings.html` (native API).
2. **`executeTool` needs the live `RegisteredTool` OBJECT from `getTools()`, not a name** (name → *"not of type 'RegisteredTool'"*). MAIN world keeps the objects.
3. **Only `document.modelContext` — NEVER `navigator.modelContext`** (deprecated Chrome 150+; user directive).
4. **Native/function tool-calling is unusable on Nano** — always the manual structured-output loop.
5. **Reloading the extension does NOT re-inject content scripts into open tabs** → the **page** must be reloaded, else execute fails with the `disconnected` "reload the page" message (not "stale").
6. **`ev.source===window`** guard on both wire listeners is load-bearing security (blocks cross-origin subframe forgery) — the standard content-script↔page pattern; keep it.
7. Confirm-gate invariants are load-bearing (`src/surfaces/ConfirmGate.test.tsx`) — never regress.

## DECISION: agent-loop framework (researched + verified this session)
**Keep the hand-rolled loop. Do NOT adopt LangChain / LangGraph / Vercel AI SDK.** Verified against real npm tarballs:
- All frameworks' agent/tool abstractions require **native tool-calling** (dead on Nano); we'd hand-roll structured output regardless.
- LangChain's `ChromeAI` adapter is in the **sunset `@langchain/community`** package and can't pass `responseConstraint`. AI SDK's `chrome-ai` targets the **deprecated 2024 `ai.assistant`** namespace + drags ~21 MB MediaPipe. Heavy bundles for zero real gain.
- Our loop calls `prompt(text,{responseConstraint})` **directly — 0 KB, no adapter**. LangChain's own sunset note even recommends app-code/MCP tools — which is what we already do.
- **For multi-step (10.1):** extend the async generator (0 KB), or add a tiny CSP-safe FSM **`robot3` (~1.5 KB)** / XState only if the step logic gets tangled. NOT full LangGraph.

## NEXT (Phase 8 FULLY merged; 10.1 done; AI-first classifier #67 merged)
- **10.2 Graceful degradation** *(recommended next)*: mechanical surfaces (browse/Run/Scan) fully usable with **zero model**; Chat disabled-with-explanation, not broken; keyword/substring retrieval fallback + "narrow your request" on dense tool-sets.
- **10.3 Cloud fallback** (opt-in, labeled, Offshore) and **11.1 embeddings top-k**, **11.x voice/profiles** — all Later.
Also loose ends: prettier declared-tool report (currently dumps raw JSON); least-privilege `activeTab` injection (ADR 0001 fast-follow); a fixture-page suite for the honesty edges (10.4).

## How to test LIVE (needs the user's Chrome Canary + Nano)
```bash
npm run build                                   # → dist/
(cd demo && python3 -m http.server 8792 &)      # serve the fixture
```
1. `chrome://extensions` → Load unpacked `dist/` (or reload ↻ after a rebuild).
2. Open `http://localhost:8792/settings.html` — **then RELOAD that page** (content-script injection, gotcha #5).
3. Panel (⌘⇧Y) auto-scans. `demo/settings.html` has DOM controls (checkboxes/buttons) + **5 registered WebMCP tools** (`listPreferences`, `setPreference`, `filterSettings`, `deactivateAccount` [Tier-2 gate], `exportData` [returns `{success:false}` → honest "did not complete"]).
4. Chat: `turn off marketing emails` → flips the checkbox, "Done" + undo. Tools tab: Run any tool. Declared tools show the MCP icon + "From this site".
The in-app preview browser is **Chromium 148 (no modelContext / no resident Nano)** — good only for UI/CSS smoke tests, NOT the model or WebMCP. Real model/fusion work must be driven on the user's real Chrome (via Claude-in-Chrome for probes, or the user for the panel — the side panel can't be automated).

## Conventions (do not regress)
- TS strict + `verbatimModuleSyntax` (`import type`), `noUnusedLocals/Parameters` (prefix unused `_`), no `any`.
- ESLint + `jsx-a11y`; CSS uses **semantic tokens only** (raw hex only in `src/styles/tokens.css`; e.g. brand = `--brand` / small-element `--brand-ink`).
- Never oversell reliability/autonomy/privacy; no padlock/shield; meaning never by color/icon alone; ≥44px targets. `spikes/**` is lint/prettier-ignored.

## Build / verify
```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## Process / GitHub
- **Issue-first**; branch `feat|fix|docs|chore/<slug>`; **one PR per phase**; PR body links **plain `Closes #n`** (⚠️ bold `**#n**` breaks auto-close). Labels: engine/safety/ui/a11y/spike/docs/… Squash-merge + delete branch. Merge only when the user asks.
- Everything through **#55** + **#57 (10.1)** + **#59 (8.3)** + **#61 (8.2)** + post-live **#63/#65** + **#67 (AI-first classifier + cleanup)** merged. Epic **#7** open.

## The pattern that worked — lean on it (ultracode is ON)
For each phase: build the spine solo (contracts/engine/wiring) with **committed unit tests**, then **run an adversarial-review Workflow** over the safety-critical code (find → adversarially verify) BEFORE committing — it caught **13 real bugs** across Phases 9 + 8.1 that unit tests missed. Apply confirmed fixes + lock with tests, rebuild, then verify LIVE on `demo/settings.html`. Workflow research agents want `agentType:'general-purpose'` for web access.
