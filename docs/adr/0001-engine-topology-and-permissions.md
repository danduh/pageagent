# ADR 0001 — Engine topology, Prompt-API host, and permission model

**Status:** Accepted · **Date:** 2026-07-25 · **Phase:** 7.0 (Scope B engine foundations)
**Supersedes the "Prompt-API host document" open decision** in `docs/IMPLEMENTATION-PLAN.md`.

## Context

Scope B replaces the fixture stub with the real engine behind the same `EnginePort`
seam (`src/engine/port.ts`). Before any real scanning lands, Step 7.0 must settle three
things the whole engine architecture rests on: **where the on-device loop runs**, **how
the panel reaches the page**, and **what host access we actually need**. Two of these
were gated on the Spike-A follow-up, now resolved (`spikes/FINDINGS.md` → *Spike A2*).

## Decisions

### 1. Prompt-API host = the side panel (CONFIRMED, Spike A2)

`LanguageModel.create()` **succeeds in the real MV3 side-panel document** at the
extension origin (Chrome 152, `availability: "available"`, ~1 ms create, ~1 s
steady-state routing, **~6 s one-time cold warmup**). Therefore:

- The **agent brain lives in the side panel**: the capped `INTENT_SCHEMA` loop and the
  `LanguageModel` session are created and held in the side-panel document. **No offscreen
  document.** (Offscreen was the fallback if `create()` had failed in the panel — it did
  not.)
- The session is **created eagerly** on panel open once `availability` is `available`
  (to absorb the ~6 s cold warmup), with an honest "thinking on your device" state — never
  a network-flavoured spinner. (Wired in Phase 9.)
- Native tool-calling stays **off** — re-confirmed unusable at the extension origin (0/3
  dispatch). The loop uses the manual `INTENT_SCHEMA` mechanism; single-turn routing was
  4/4 correct incl. a 36-tool set.

### 2. Bridge topology: panel ↔ isolated content script ↔ MAIN world

```
┌─────────────────────────┐   chrome.tabs.sendMessage(tabId, …)   ┌──────────────────────────┐
│  Side panel (extension   │ ────────────────────────────────────▶ │ Content script (ISOLATED │
│  origin)                 │ ◀──────────────────────────────────── │ world) — the DOM scanner  │
│  · EnginePort (live)     │   {SCAN|PAGE_INFO|ABORT} / results     │ + executor               │
│  · LanguageModel loop    │                                        └────────────┬─────────────┘
│  · abort controller      │                                          window.postMessage │ (same tab)
└─────────────────────────┘                                          ┌────────────▼─────────────┐
                                                                     │ MAIN world — reads        │
                                                                     │ document.modelContext     │
                                                                     └──────────────────────────┘
```

- The **panel** owns orchestration, the loop, the `LanguageModel` session, and the
  **AbortController**. It talks to the content script with `chrome.tabs.sendMessage`
  (request/response, keyed by a `requestId`).
- The **isolated content script** does the DOM scan and (Phase 8) execution. It has no
  page-JS access but full DOM access — the anti-spoof / prompt-injection boundary.
- The **MAIN-world island** is the only surface that can read the page's
  `document.modelContext` (WebMCP). It hands presence + declared tools to the isolated
  content script via `window.postMessage` (bridged onward to the panel). Kept minimal in
  the thin slice (presence only); fusion is Phase 8.1.
- **Abort:** a separate `{type:'ABORT', requestId}` message sets a per-request flag the
  scan loop polls at its yield points. The AbortController lives in the panel, so **Stop
  works even if the service worker is dead** (see §4).

### 3. Permission model — thin slice vs. shipping (least-privilege)

**Thin slice (now):** keep the **declared content scripts** already in `manifest.config.ts`
(`matches: ['<all_urls>']`, isolated + MAIN world). This proves the scan→tool-gen vertical
with the least moving parts. It is **not a new escalation** — it is the Phase-1 entry-point
grant; crucially we still ship **no `host_permissions`** (no elevated fetch/cookies).

**Shipping model (fast-follow, tracked):** move to **`activeTab` + programmatic injection**
(`chrome.scripting.executeScript({ target, world })`) so the scanner is injected **only on
the active tab, only when the user acts** (open/summon = the activation that grants
`activeTab`; re-scan after a tab switch is the deliberate "Scan this page?" moment,
REQ-PRIV-4). Removes the standing `<all_urls>` content script. Deferred because the
`activeTab`-grant lifecycle across tab switches + CRXJS injection mechanics deserve their
own focused step, not a rider on the first real scan. **REQ-PERM-1/2 is honoured now
(no host_permissions); REQ-PERM-3's minimal-injection refinement is the fast-follow.**

### 4. MV3 service-worker lifecycle

Because the loop + state + AbortController live in the **side panel** (a persistent
document while open), **not** in the service worker:

- An idle-terminated SW (~30 s) **cannot** leave an in-flight action half-done — the panel
  drives each step and observes its result. The SW's only jobs are opening/focusing the
  panel (existing) and, later, tab-lifecycle broadcasts.
- **Stop/abort** is panel-local and always reachable regardless of SW state.
- Durable cross-restart state (last tool-set per tab) will live in `chrome.storage.session`
  keyed by tab id (Phase 8.2 freshness). The thin slice keeps the tool-set in panel memory;
  a panel close = a clean re-scan, which is the honest behaviour.

## Consequences

- Step 7.2 builds the panel↔content-script bus + MAIN-world read on this topology.
- Step 9.2 creates the `LanguageModel` session in the panel and reuses `mcpAgentLoop.ts`.
- A follow-up issue tracks the `activeTab` + programmatic-injection least-privilege move
  before any store submission (no silent late escalation at review).
