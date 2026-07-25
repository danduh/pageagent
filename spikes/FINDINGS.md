# Spike findings

Record results here after running the probes. These findings gate the Step 3.0
`EnginePort` contract and the Phase 7 bridge topology.

> **Environment caveat (applies to BOTH spikes).** Both probes ran on **2026-07-23**
> in **Chrome 148.0.7778.280 / Electron 42 — the Claude desktop app's *embedded*
> Chromium**. This is **NOT** the user's real Chrome profile and **NOT** an MV3
> side-panel / content-script host in the shipping extension. Claude-in-Chrome was
> not connected, so the user's actual Chrome 148 (where a capability page reports
> Prompt API + Tool calling "Ready/Stable") could **not** be driven directly.
> Treat everything below as a **strong directional signal, not the final
> side-panel-context verdict** — each spike names exactly what must be re-verified
> in the real host before a decision is frozen.

## Spike A — `LanguageModel` in the MV3 side-panel document (#5)

- **Date / Chrome version:** 2026-07-23 · Chrome **148.0.7778.280 / Electron 42** (embedded Chromium in the Claude desktop app). ⚠️ Not the user's real Chrome profile; not an MV3 side-panel document. Strong signal, not the final side-panel verdict.
- **Hardware / Nano downloaded?** Nano **not resident** — `availability() === "downloadable"`. Crucially the state was `downloadable`, **not** `unavailable`, so the host **qualifies** for the model: the hardware / OS / Chrome-build gate is **passable** in a 148-class environment. Target hardware otherwise unprofiled.
- **Origin-trial token present?** **No.** The probe ran on a **plain web origin**, not the `chrome-extension://` extension origin, and carried no `trial_tokens`. The `LanguageModel` surface was present anyway in this build.
- **`typeof LanguageModel` in the side-panel document:** **Not measured in the side panel.** In the embedded-Chromium document, `typeof self.LanguageModel === "function"` — the **modern global** is present; the legacy `self.ai.languageModel` fallback was not needed.
- **`LanguageModel.availability()` result:** **`"downloadable"`** — the modern **string-returning** `availability()` (not the older `capabilities()` object) is live and returned a real state **without throwing**.
- **`LanguageModel.create()` succeeded in the side panel?** **No — `create()` never ran.** It threw **"requires a user gesture."** Because `create()` did not execute **and** the context was embedded Chromium (not the extension side panel), the definitive side-panel-create question is **unresolved**, and **nothing about native tool-calling was tested.**

**Verdict — strong-but-not-final positive signal; the "Prompt-API host document" decision stays OPEN.**
Chrome 148 exposes `LanguageModel` as a **function** and its `availability()` machinery returns a real `"downloadable"` in a renderer-backed document. That raises confidence that the MV3 side-panel document — also renderer-backed, and uniquely the context with a **persistent DOM, durable JS state, and a genuine user-activation source** — can host the agent brain and trigger the model download. **But Step 0.5's acceptance is NOT met:** `create()` was blocked by the gesture requirement and the context was not the extension side panel. Do **not** freeze the Step 3.0 `EnginePort` loop-locus or the Phase 7 bridge topology on this evidence. Provisional lean: the **side panel** is the strong default host (offscreen docs and the service worker have no user gesture, and the SW dies at ~30s idle), pending the follow-up below.

Consequences already decided by this spike:
- **Model download is user-gesture-gated (Step 1.5).** The first `create()` (download trigger) is gated exactly like `sidePanel.open()` (Step 0.1's "no async gap → no user-gesture throw" rule). It must fire **synchronously inside a user-activation event with no preceding `await`** (an `await` before it can consume the activation and re-throw). Split **detect** from **provision**: the passive preflight may call `availability()` (safe — it did not throw) but must **never** speculatively call `create()`. Add an explicit, labeled **"Download on-device model (~N MB)"** affordance whose click handler calls `create({ monitor })`, surfacing `downloadprogress` into the `downloading` state.
- **Availability state machine (Step 7.1 / 1.5).** The plan's `available / downloadable / downloading / unavailable` names map **1:1** onto the real string enum; the observed value is `"downloadable"`. The edge `downloadable → downloading → available` is **user-gesture-gated, not automatic** — model it as a user-triggered transition and render `downloadable` as an **actionable** state (offer download), distinct from `downloading` (progress) and `unavailable` (no path). Do **not** assume `available`; first run is `downloadable`.

**Follow-up test before freezing (run in ONE live session):**
1. **Side-panel `create()` confirmation.** Load the real MV3 extension (extension origin + `aiLanguageModelOriginTrial` token) on the user's Chrome 148 with Nano present. Fire `create()` **inside a click handler, no `await` before it**, and record whether it **succeeds in the side-panel document**. If it does NOT, name the fallback (offscreen document for the loop; side-panel/content-script gesture for the download kickoff) and flag the Step 7.2 bridge, Step 9.2 loop-location, and Stop/abort impact.
2. **Native tool-calling vs. manual `INTENT_SCHEMA` bake-off** (same session). On a fixed prompt suite (3–5 tools, then a dense 30–50 tool set), compare native tool/function-calling against `create({ responseFormat: INTENT_SCHEMA })` + `extractJsonFromResponse` / `coerceArgs` on routing accuracy, malformed-output rate, latency, and tool-overload behaviour. **Decision rule (fixed in advance):** flip Step 9.2 only if native calling is *materially* more reliable **AND** stable across ≥2 Chrome versions; otherwise keep the manual capped loop. Test **structured JSON output separately** from tool-calling — the manual loop only needs the former.

**Residual unknowns (Spike A):**
- Does `LanguageModel.create()` actually succeed in the **real** MV3 side-panel document (`chrome-extension://` origin + `aiLanguageModelOriginTrial` token) on Chrome 148? Untested — Step 0.5's core acceptance is not yet met.
- Does **native tool-calling** work at all on 148, and does it beat the manual `INTENT_SCHEMA` loop? Untested; the capability-page "Stable" claim is unverified.
- Does `availability()` report the same value in the **extension side-panel context with the origin trial** as it did on the plain web origin? Availability can vary by origin/context/build.
- Does **structured JSON output** (`responseFormat: INTENT_SCHEMA`) — what the manual loop actually depends on — work reliably on 148, independent of tool-calling? Not exercised.
- Real-target **download UX**: size, time, and whether a **single** gesture carries the whole `downloadable → downloading → available` transition, or the session must be re-created post-download.
- Does the **embedded-Chromium / Electron 42** pathway faithfully mirror stock Chrome 148's on-device downloader? (The `downloadable` + gesture-throw strongly suggest yes, but this was not the real profile.)
- API behaviour in a **service worker vs. document** context (relevant only if the loop/download-trigger is ever considered for the SW; Step 7.0).

## Spike B — element-handle re-resolution across an SPA re-render (#6)

- **Date / Chrome version:** 2026-07-23 · Chrome 148.0.7778.280 / Electron 42 (embedded Chromium). ⚠️ Not the user's real Chrome profile; not an MV3 side-panel / content-script host. Strong directional signal, not the final verdict.
- **`document.modelContext` readable from MAIN world?** The **MAIN-world reach path itself worked** — the `world: "MAIN"` content script executed and read `'modelContext' in document` — but the property was **absent (`false`)** in this environment, consistent with WebMCP being an unshipped origin trial. So the **mechanism** (reading page globals from a MAIN-world island) is **validated**; the **presence** of `document.modelContext` is **not**, and must be re-verified in real Chrome 148 with the OT enabled. This **reinforces keeping the internal registry as the reliable base** (Register-vs-internal-registry decision; Step 8.1).
- **Re-resolution after a re-render** (fresh node identities via `replaceChildren`, with an order shuffle on alternate renders) — which strategies hit the intended node:
  - [ ] **live object reference (`WeakRef`) — STALE (detached).** The captured node survived as an object but `isConnected === false` after the re-render. Worthless for **acting**; useful only as a **negative liveness check** (deref → null or `!isConnected` ⇒ definitely stale ⇒ re-resolve or decline; never click it).
  - [x] **`id` selector — HIT**, but every fixture control had a hand-authored **stable, semantic** id (`btn-rerun`). Real controls frequently have **no id, or auto-generated/volatile ids** (React `:r0:`, Angular/Ember hashes). Strong signal *when present and stable*; too low-coverage and not guaranteed-stable to be primary.
  - [x] **CSS path — HIT, but borrowed.** The resolver anchored to the nearest ancestor id and stopped (`button#btn-rerun`); it never exercised a structural `nth-of-type` chain. A **disguised id hit** — a truly structural path would have failed under the reorder exactly like DOM index. On id-less controls, cssPath degrades to positional and breaks.
  - [x] **accessible-name / text match — HIT (on its own merits).** Matched the normalized accessible name (`"Rerun failed jobs"`) across **both** the re-render **and** the reorder, independent of id and position. **The only strategy that survived without borrowing from an id.** Weakness: accessible name is often **non-unique** (the fixture's own three "Retry" rows), so it must be paired with role + a disambiguator + match-verification.
  - [ ] **DOM index / position — WRONG NODE.** The `tools.reverse()` reorder moved the target from index 1 to index 3; index re-resolution **confidently returned `btn-logs` ("View logs")**. This is the **dangerous** failure — not a miss but a *plausible wrong control that would have been clicked.* Never primary; at most a last-resort tiebreak *behind* verification, never used to act.

**Verdict — no single locator is reliable on its own; adopt a multi-signal fingerprint + a mandatory verification gate with decline-on-ambiguity as a first-class outcome.**
The two clean, merit-based survivors are **accessible-name/role match (primary)** and **stable id (confirmatory, when present)**. `cssPath`'s HIT was entirely borrowed from an id and collapses to positional on id-less controls; `WeakRef` is dead-on-arrival for acting; DOM index returns a **wrong** node under reorder. Because many real controls have **no stable id**, the load-bearing path is **role + accessible-name + nearby-text fingerprint + match-verification**, and **decline-on-ambiguity is a required first-class outcome, not an edge case.**

The product re-resolution strategy is therefore a **multi-signal fingerprint captured at scan time** —
`{ role, normalized accessible-name, tag/input-type, stable-id-if-present, nearby-text/label, container fingerprint, ordinal-within-matching-group, WeakRef }` — re-resolved by:
1. `WeakRef` fast-path **only** as a liveness-negative check;
2. candidate generation by **role + accessible-name**;
3. id used to **confirm/disambiguate**, not as sole locator;
4. nearby-text/container, then ordinal, to break ties;
5. a **mandatory match-verification gate** returning one of **four outcomes** — **resolved-and-verified / not-found / ambiguous / stale** — where **>1 survivor ⇒ DECLINE (ambiguous)** and **0 ⇒ DECLINE (not-found)**, never a positional fallback that acts.

This is the fixture's `isIntended(el) = el.isConnected && accName(el) === TARGET` predicate promoted to a contract. It underpins the pre-execute liveness re-check (8.4) and the Confirm-gate **locate-or-decline** guarantee (8.5): re-resolve → verify role + name + type + visible + enabled → highlight the **live** node → act, else decline honestly. Staleness/invalidation must key on **fingerprint mismatch, not node existence** — after the reorder a button still sat at the old position, so an existence/position check would have passed while pointing at the wrong control.

**First-class risks to record (the locate-or-decline guarantee rests on these being handled, not on this spike alone):**
- The **ambiguity/decline path is unproven** — the fixture's target had a *unique* accessible name; the repeated-name case (its own three "Retry" job-row buttons) was never captured as the target, so "decline on >1 match" is **untested against real data**. Feeds **D11** and the **element-handle strategy** decision.
- Only **light-DOM re-render + reorder** was exercised — no open/closed shadow DOM, virtualized/infinite lists, canvas/image controls, cross-route SPA navigation, or attribute-only mutation. The honest-decline for those hard cases (REQ-REL-3; Steps 7.3/8.5) is **not validated here**.
- **id stability on real frameworks is unmeasured** — the fixture used hand-authored stable ids; React `:r0:`, Angular/Ember hashed/volatile, and index-suffixed ids were never stressed.
- **WeakRef GC timing:** only **STALE** (deref → detached node) was observed, never **GONE** (deref → null). The liveness-negative fast path must handle **both**.
- **No performance data** on re-query cost on a genuinely large DOM (interacts with the Step 7.3 scan-performance budget).

**Residual unknowns (Spike B):** as above — ambiguity/decline unproven, hard-DOM cases untested, real-framework id stability unmeasured, `document.modelContext` presence + MAIN-world read unconfirmed in the real host, WeakRef GONE case unobserved, re-query cost on large DOM unmeasured.

---

## Canary run (Chrome 152 Canary) — 2026-07-23

Driven live via Claude-in-Chrome on the user's **Chrome 152.0.0.0 Canary**, on an https page (`example.com`). Still **not** the MV3 side-panel document, but a real profile with Nano resident — this retires most of the residual unknowns.

### Spike A (#5) — Prompt API on Canary 152
- `typeof LanguageModel === "function"`; **`availability() === "available"`** — Nano is **resident** (no download needed on this machine).
- **`create()` succeeds with NO user gesture** (the gesture requirement only applies to the `downloadable`/`downloading` states). `create()` ~1 ms; `prompt()` → "PONG" in ~1.3 s.
- **Structured output (`responseConstraint`): works** — valid JSON in ~0.9 s, semantically correct routing ("rerun the failed jobs" → `click_rerun_failed_jobs`) — **but not strictly schema-faithful** (emitted `"tool":{"type":"click_rerun_failed_jobs"}` for a `string`-typed enum field). → the loop's robust **parse + coerce** layer is **validated as necessary**, not optional.
- **Native tool-calling: NOT usable.** `create({ tools: [...] })` is *accepted*, but the model **never dispatches**: with a matching `click_rerun_failed_jobs` tool it (a) replied in prose asking for context, and (b) under a forceful "call a tool, never reply in prose" system prompt emitted **`run_jobs(status="failed")` as plain text** — hallucinating a tool name and never invoking `execute()`. This **re-tests and CONFIRMS** the docs/07 §2 assumption on Chrome 152.

**Verdict (Spike A):** the on-device brain is **viable and fast** on 152; **the manual capped `INTENT_SCHEMA` loop is confirmed** (native tool-calling stays off — re-test done, decision rule not met); structured-output-with-coercion is the routing mechanism. **Residual:** confirm `create()` in the *actual MV3 side-panel document* under the extension origin + origin trial (naturally covered when Phase 1 builds the real extension); and download UX on a *fresh* machine (this one already had Nano resident).

### Spike B (#6) — handle re-resolution on Canary 152
- **`document.modelContext` is PRESENT** on Chrome 152 (was absent on the embedded 148) — the WebMCP surface exists in this build. Internal registry stays the reliable base; page-surface registration is now testable with real declared tools.
- **Unique target, reordered re-render:** `WeakRef` STALE · `id` HIT · accessible-name HIT (1 match) · DOM index **WRONG** → decision **ACT**. Matches the 148 result.
- **Ambiguous name, no id (the residual gap):** 2 name matches → `byName: AMBIGUOUS` → decision **DECLINE**. ✅ The **decline-on-ambiguity path is validated against real data** — the core of the locate-or-decline guarantee holds.

**Verdict (Spike B):** the multi-signal fingerprint + four-outcome gate + **decline-on-ambiguity** are confirmed on real Chrome 152. **Residual:** hard-DOM cases (shadow/virtualized/canvas/cross-route) and real-framework id stability + re-query cost (tracked on #6/#10).

---

## Spike A2 — follow-up in the REAL MV3 side-panel document (#5/#10) — 2026-07-25

Ran the enhanced follow-up probe (`spikes/spike-a2-followup/`) **inside the actual MV3 side-panel document** of a throwaway extension, on the user's **Chrome 152.0.0.0** (stable profile, Nano resident). This is the context every prior run lacked: a genuine `chrome-extension://` origin + a real `side_panel` document. **It meets Step 0.5's core acceptance, which the 148-embedded and 152-plain-page runs did not.** Raw JSON archived in the session; the load-bearing numbers are below.

- **Context:** `chrome-extension://iakcikgnfcjbbmmgmbgaflenlcbgkdgp/panel.html`, `isExtensionOrigin: true`, Chrome **152.0.0.0**, `typeof self.LanguageModel === "function"`, `availability() === "available"` (Nano resident — no download on this machine).

### 1. `create()` in the side-panel document — **SUCCEEDS ✓ (the headline)**
- `LanguageModel.create({})` **succeeded in the real side-panel document**, `~1 ms`. `session.prompt("…PONG")` returned `"PONG"` in **~5.9 s on the FIRST call** (cold session warmup); every subsequent structured/routing prompt was **~1.0–1.1 s**.
- **⇒ The "Prompt-API host document" open decision is RESOLVED: the side panel IS a valid host.** The agent brain (capped intent-loop) lives in the **side panel** — **no offscreen document required**, which keeps the Step 7.2 bridge topology simple (panel hosts the loop; content script only scans/executes) and the Stop/abort channel local to the panel.
- **Latency consequence (Phase 9 UX):** the ~6 s cold-start is a one-time session warmup. Create the session **early/eagerly** (on panel open, once `available`) and show an honest "thinking on your device" state — never a network-flavored spinner. Steady-state single-turn routing is ~1 s.

### 2. Native tool-calling vs. `INTENT_SCHEMA` bake-off — **native still UNUSABLE ✗; manual loop STAYS**
Three native-tool-calling turns via `create({ tools: [...with execute()...] })`; in **all three the model NEVER dispatched** a tool (`execute()` never fired), it replied in prose or emitted a raw reasoning trace:
- 5-tool set: `dispatched: false` — replied *"Please provide more context so I can help you rerun the failed jobs…"* (~3.6 s).
- 5-tool set + forceful "you MUST call a tool, never reply in prose" system prompt: `dispatched: false` — emitted a raw **`<|channel>thought` reasoning trace** as prose (~9.4 s), still no dispatch.
- 36-tool set: `dispatched: false` — *"Please tell me what you are referring to…"* (~1.5 s).

The **`INTENT_SCHEMA`** arm, same prompts, same session mechanism as Phase 9 will use: **4/4 routing turns correct, 0 malformed** —
- structured-output test `"rerun the failed jobs"` → `click_rerun_failed_jobs` ✓ (~1.0 s)
- small bake-off `"rerun the failed jobs"` → `click_rerun_failed_jobs` ✓ (~1.0 s)
- dense bake-off `"turn off marketing emails"` (**target embedded among 36 tools**) → `toggle_marketing_emails` ✓ (~1.1 s)

**⇒ Decision rule (flip only if native is *materially more reliable*): NOT met — native is the opposite (0 % dispatch vs 100 % correct routing). The manual capped `INTENT_SCHEMA` loop is confirmed on the extension origin, re-confirming docs/07 §2. This is now the 2nd context on 152 (plain https + extension side panel) plus the 148 signal — no context has ever shown usable native tool-calling.** Change scoped, if ever, to the model-output→intent parse seam only.

### 3. Structured output (`responseConstraint` + `INTENT_SCHEMA`) — works; parse/coerce still required
- `session.prompt(text, { responseConstraint: INTENT_SCHEMA })` is the working call (the modern prompt-time constraint, not `create({responseFormat})`). Valid JSON, correct routing, **fast (~1 s)**, reliable at 36 tools.
- **Schema-faithfulness is INCONSISTENT run-to-run:** this run emitted a proper `"toolName": "<string>"` (`schemaFaithful: true`), but the 152 Canary run emitted a non-faithful `{"tool":{"type":…}}`. Because faithfulness cannot be relied on, **`extractJsonFromResponse` + `coerceArgs` stay mandatory** (validated, not optional).

### Verdict (Spike A2) — the two blockers on the engine architecture are cleared
1. **Prompt-API host = the side panel (confirmed).** Phase 7.0/7.2 proceed on: loop + `LanguageModel` session in the side panel; content script does scan/execute over the message bus; abort channel is panel-local.
2. **Manual capped `INTENT_SCHEMA` loop (confirmed).** Phase 9.2 reuses `mcpAgentLoop.ts` (`INTENT_SCHEMA`, `extractJsonFromResponse`, `coerceArgs`, `buildSystemPrompt`, `MAX_TOOL_CALLS`) nearly verbatim. Single-action routing is reliable even on a dense set → embeddings top-k (Phase 11) is a large-page optimization, not a correctness prerequisite.

**Residuals (small, non-blocking):**
- **No-gesture create() at the extension origin not independently isolated.** The side-panel run was a button click (`userActivationActive: true`). Attempted to isolate it via Claude-in-Chrome driving `chrome-extension://…/panel.html` as a tab, but `navigate` force-prefixes `https://` and cannot load a `chrome-extension://` URL. Strongly implied regardless: the 152-Canary plain-page run showed no-gesture `create()` when `available`, and Chrome's own error text ("Requires a user gesture when availability is downloading or downloadable") means the gate does **not** apply in the `available` state. The detect/provision split (`src/lib/capabilities.ts`) already handles the fresh-machine `downloadable` case (first `create()` gesture-gated to trigger download).
- **Fresh-machine download UX still unobserved** — this machine had Nano resident. Record size/time when first seen on a machine in the `downloadable` state.
- **`create({tools})` is *accepted* but inert** — passing `tools` doesn't error, it just never dispatches; don't mistake acceptance for support.
