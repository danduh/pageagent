# PageAgent — Requirements

**Purpose:** The product-level requirements for PageAgent — WHAT it must do and WHY, expressed as testable statements with stable REQ-IDs and MoSCoW priorities. This doc says nothing about HOW to build it. See `01-product-definition.md` for the scope, surfaces, and glossary these requirements assume, and `00-brief.md` for the pitch.

---

## How to read this doc

- **REQ-IDs are stable.** `REQ-<AREA>-<n>`. Reference them from planning, tests, and sibling docs. Never renumber; retire an ID rather than reuse it.
- **Priority is MoSCoW**, scoped to the product vision (not a release plan):
  - **MUST** — required for PageAgent to be itself; maps to the MVP boundary in `01-product-definition.md`.
  - **SHOULD** — high-value, expected soon; mostly the "Later" list.
  - **COULD** — desirable future scope; credited but not committed.
- Requirements are **capability statements**, not designs. Where a requirement names a browser capability (on-device model, embeddings, speech, `document.modelContext`), it states the user-facing behavior that capability enables, and the graceful-degradation behavior when it is absent — never the mechanism.
- Terms in **bold** (Page, Scan, Action, Tool, Tool-set, Profile, Agent/Intent-loop, Execute, Confirm-gate) are used exactly as defined in `01-product-definition.md`.

---

## 1. Scanning & tool generation

*What PageAgent must detect on a page and how it must turn that into tools. This is the crux capability — see `06` for the honest reliability risks it carries.*

- **REQ-SCAN-1 (MUST).** On request, PageAgent must **Scan** the current **Page** and detect its actionable elements — at minimum buttons, links, text inputs, selects, and menu items — in the page's current state.
- **REQ-SCAN-2 (MUST).** For each detected element PageAgent must generate one **Tool** representing one **Action** (click / type / choose / follow-link), with a plain-language name and description derived from the page (visible label, accessible name, or nearby text) so a user and the **Agent** can tell what the tool does.
- **REQ-SCAN-3 (MUST).** When a **Tool** cannot be given a meaningful human-readable name from the page (e.g. an icon-only control with no accessible label), PageAgent must still represent it honestly rather than inventing a misleading name — or omit it — so the user is never shown a tool whose effect is misrepresented.
- **REQ-SCAN-4 (MUST).** PageAgent must let the user **re-Scan** on demand, because the **Page** can change after the first scan; a re-scan must reflect the page as it is at that moment.
- **REQ-SCAN-5 (SHOULD).** PageAgent should keep the active **Tool-set** reasonably in step with the page during a task — after an **Action** changes the page, the tools it offers should reflect the changed page rather than the stale one (see REQ-AGENT-4).
- **REQ-SCAN-6 (SHOULD).** When a site exposes its own declared tools (`document.modelContext`), PageAgent should **prefer those** over DOM-derived tools for the same actions, and fall back to scanning where the site declares none ("fusion"). It must be transparent to the user which tools are the site's own vs manufactured from the DOM.
- **REQ-SCAN-7 (SHOULD).** PageAgent should detect actionable elements that are not in the simplest part of the page (e.g. inside expandable menus or nested regions) so that common controls are not silently missed. It must not claim coverage it cannot deliver (see REQ-REL-3).
- **REQ-SCAN-8 (COULD).** PageAgent could let the user narrow or scope a scan (e.g. "just this dialog," "just the toolbar") to reduce noise on dense pages.

---

## 2. Chat & agent interaction

*How the user expresses intent and how the Intent-loop turns it into action.*

- **REQ-CHAT-1 (MUST).** PageAgent must provide a **Chat** surface where the user states what they want in plain language (typed) and receives a plain-language response.
- **REQ-CHAT-2 (MUST).** From a user's request, the **Agent** must select the most relevant **Tool(s)** for the current **Page** and drive execution toward satisfying the request.
- **REQ-CHAT-3 (MUST).** After acting, PageAgent must **report back** in the Chat what it did (or attempted), in terms the user can understand, including when it did nothing and why.
- **REQ-CHAT-4 (MUST).** When the request is ambiguous, maps to no available **Tool**, or maps to several equally-plausible tools, PageAgent must say so and ask the user rather than guessing and acting.
- **REQ-AGENT-1 (MUST).** The **Intent-loop** must be **capped** — a bounded number of steps per request — and must stop and hand back to the user when the cap is reached, when it is stuck, or when it needs a decision.
- **REQ-AGENT-2 (MUST).** For a single-**Action** request, PageAgent must reliably map intent → the correct tool → execution. Single, confirmed actions are the reliable core of the product (see `06`).
- **REQ-AGENT-3 (SHOULD).** For a request that needs more than one step, the **Agent** should execute steps in sequence, observing the result of each before choosing the next — never planning a long chain blindly up front.
- **REQ-AGENT-4 (SHOULD).** Between steps the **Agent** should re-check the **Page**, because an **Action** can change what is on screen; it must not act on tools that no longer correspond to the current page.
- **REQ-AGENT-5 (SHOULD).** PageAgent should make the user's control obvious at every step — the user can stop, correct, or take over at any point in the loop.
- **REQ-AGENT-6 (MUST).** PageAgent must set honest expectations about multi-step reliability: it must not present long, unattended task completion as something it guarantees.

---

## 3. Execution, safety & confirmation

*Auto-executing actions in a logged-in session is a live safety surface — see `06`. These are the guardrails between intent and action.*

- **REQ-EXEC-1 (MUST).** PageAgent must be able to **Execute** each generated **Action** on the live **Page** — click, type into a field, choose an option, follow a link.
- **REQ-EXEC-2 (MUST).** PageAgent must provide an **Execute** surface to run a single **Tool** manually, outside of Chat, for precision and for users who prefer picking an action to describing it.
- **REQ-SAFE-1 (MUST).** Before executing an **Action** that is destructive or hard to undo (e.g. sign out, pay, send, delete, submit, purchase), PageAgent must present a **Confirm-gate**: a preview of exactly what it is about to do, and require explicit user approval before proceeding.
- **REQ-SAFE-2 (MUST).** The **Confirm-gate** preview must be specific and truthful — it must name the concrete action and target (which button, which field, which value), not a vague summary — so the user's approval is informed.
- **REQ-SAFE-3 (MUST).** PageAgent must default to caution: when it is unsure whether an action is destructive or irreversible, it must treat it as if it were and confirm.
- **REQ-SAFE-4 (MUST).** PageAgent must never silently perform an action the user did not ask for. Every executed **Action** must be traceable to a user request or a manual **Execute**, and must be reported (REQ-CHAT-3).
- **REQ-SAFE-5 (SHOULD).** PageAgent should let the user cancel an in-progress action or sequence and stop cleanly, leaving the page in a known state as far as it is able.
- **REQ-SAFE-6 (SHOULD).** PageAgent should let the user set, per site, which actions always require confirmation and which are trusted to run without asking (per-site trust; see REQ-PROF-2).
- **REQ-SAFE-7 (COULD).** PageAgent could offer **undo** for executed actions beyond confirm-gating, where the page makes reversal possible.
- **REQ-SAFE-8 (SHOULD).** PageAgent must not treat the content of the **Page** as instructions to itself — text on the page (including hidden or injected text) must never be able to make PageAgent execute actions the user did not ask for. Autonomy comes only from the user.

---

## 4. Tool retrieval at scale

*Real pages can expose 50–100+ actionable elements; showing the Agent all of them at once hurts both accuracy and speed. See `06` on the Nano quality ceiling.*

- **REQ-RETR-1 (SHOULD).** When a **Page** produces many **Tools**, PageAgent should surface to the **Agent** only the tools most relevant to the user's current request, rather than all of them, so tool selection stays accurate.
- **REQ-RETR-2 (SHOULD).** Relevance ranking should be based on the meaning of the user's request, not just literal keyword matches, so a user's natural phrasing finds the right tool even when wording differs from the page's labels.
- **REQ-RETR-3 (SHOULD).** Retrieval must not hide a genuinely relevant tool such that the user's achievable request silently fails; when confidence is low, PageAgent should widen the set or ask rather than quietly drop the right tool.
- **REQ-RETR-4 (MUST — degradation).** Where the capability that powers meaning-based retrieval is unavailable, PageAgent must still function on pages with few tools and must degrade gracefully (e.g. simpler matching, or asking the user to narrow the request) rather than break.
- **REQ-RETR-5 (COULD).** The full generated **Tool-set** should remain browsable by the user (via the **Tools** surface) even when retrieval only feeds a subset to the Agent — retrieval narrows what the model sees, not what the user can see.

---

## 5. Voice

*The accessibility flagship — real today, but with honest caveats (see the capability reference `07` and the risks in `06`).*

- **REQ-VOICE-1 (SHOULD).** PageAgent should let the user speak their request instead of typing it (voice in), so the Chat surface is usable hands-free.
- **REQ-VOICE-2 (SHOULD).** PageAgent should be able to speak its responses aloud (voice out), so a user can operate a page without reading the screen.
- **REQ-VOICE-3 (MUST — honesty).** PageAgent must be transparent about the voice privacy boundary: where speech-to-text is not on-device (audio leaves the machine), the user must be told, because it differs from the on-device privacy guarantee of the core loop (REQ-PRIV-1).
- **REQ-VOICE-4 (SHOULD).** Voice interaction must respect the same safety rules as typed interaction — a spoken command for a destructive action must still hit the **Confirm-gate** (REQ-SAFE-1); voice must not become a bypass.
- **REQ-VOICE-5 (SHOULD).** Voice quality and availability vary by system; PageAgent should degrade gracefully to typed interaction when speech in or out is unavailable, and never leave a voice-reliant user stranded without feedback.

---

## 6. Profiles & persistence

*Saved per-site tool-sets and per-site trust, so PageAgent gets better on sites the user returns to.*

- **REQ-PROF-1 (SHOULD).** PageAgent should let the user save a **Tool-set** for a site as a **Profile**, so it recognizes and reuses those tools on return visits instead of starting cold.
- **REQ-PROF-2 (SHOULD).** A **Profile** should store per-site trust preferences — which actions always require a **Confirm-gate** and which are trusted to run without asking (REQ-SAFE-6).
- **REQ-PROF-3 (SHOULD).** The user must be able to view, edit, and delete any saved **Profile** and its trust settings, and clear all saved data, at any time.
- **REQ-PROF-4 (MUST — where persistence exists).** Any saved data (profiles, tool-sets, trust settings, history) must be stored **locally on the user's machine** only; PageAgent must not persist the user's data to a backend or server (REQ-PRIV-2).
- **REQ-PROF-5 (COULD).** PageAgent could let the user record a sequence of actions as a named, replayable flow (a macro) tied to a site.
- **REQ-PROF-6 (COULD).** PageAgent could let a Profile carry over cross-page or multi-tab flows for a site, as a future direction.

---

## 7. Non-functional requirements

### 7.1 Privacy & on-device processing

*This is the whole point, not a nicety — see `00-brief.md`.*

- **REQ-PRIV-1 (MUST).** The core loop — reading the **Page**, mapping the user's intent to a **Tool**, and executing — must run **on the user's machine**. Neither the page content nor the user's intent may leave the device in the on-device path.
- **REQ-PRIV-2 (MUST).** PageAgent must not send the user's page content, intent, or activity to any backend as a condition of normal operation, and must not retain server-side data about the user.
- **REQ-PRIV-3 (MUST).** Any path that does leave the device — a **cloud fallback** where on-device capability is missing, or non-on-device speech — must be **clearly labeled as such to the user before it is used**, so the privacy trade is never silent (see REQ-AVAIL-2, REQ-VOICE-3).
- **REQ-PRIV-4 (MUST).** PageAgent must operate only on the **Page in front of the user, in the user's own session**, on the user's behalf — never as a scraper, crawler, or background data collector (reinforces the "is NOT" list in `01`).

### 7.2 Safety & reversibility

- **REQ-SAFEN-1 (MUST).** Reversibility must govern autonomy: the more destructive or hard-to-undo an **Action**, the more explicit the user's approval must be. Reversible actions may flow; irreversible ones must gate (REQ-SAFE-1..3).
- **REQ-SAFEN-2 (MUST).** The user must always be able to interrupt, and control must default to the user — PageAgent must never be in a state where the user cannot stop it (reinforces REQ-AGENT-5, REQ-SAFE-5).

### 7.3 Performance & latency

- **REQ-PERF-1 (SHOULD).** A single, confirmed action should feel responsive — from request to visible result fast enough that the user does not doubt whether it is working; on-device operation is what makes this achievable.
- **REQ-PERF-2 (SHOULD).** Scanning a typical page and generating its tools should complete quickly enough not to interrupt the user's flow; large or complex pages may take longer and PageAgent should indicate progress rather than appear frozen.
- **REQ-PERF-3 (SHOULD).** Tool retrieval (section 4) exists partly to protect latency and accuracy as tool counts grow; performance must not collapse on tool-heavy pages.

### 7.4 Reliability & graceful degradation

- **REQ-REL-1 (MUST).** When PageAgent cannot confidently interpret the page or the request, it must **fail safe and say so** — do nothing and explain — rather than take a wrong or unintended action.
- **REQ-REL-2 (MUST).** PageAgent must degrade gracefully when an assumed capability is missing (on-device model, embeddings, speech, `document.modelContext`): reduced function with a clear explanation, never a broken or silent failure (see REQ-RETR-4, REQ-VOICE-5, REQ-AVAIL-1..2).
- **REQ-REL-3 (MUST — honesty).** PageAgent must not overstate its coverage. Where DOM→tools reliability is genuinely hard (SPAs, shadow DOM, virtualized lists, icon-only controls, canvas, dynamic re-render), PageAgent must be honest about what it can and cannot operate, and must not present an unreliable action as reliable.
- **REQ-REL-4 (SHOULD).** When an executed **Action** does not have the expected effect on the page, PageAgent should detect the mismatch and report it rather than assume success.

### 7.5 Permissions & least-privilege

- **REQ-PERM-1 (MUST).** PageAgent must request only the access it needs to operate the current **Page** on the user's behalf, and must be transparent about what that access is and why.
- **REQ-PERM-2 (SHOULD).** PageAgent should act on a page only with the user's awareness — it should not silently begin operating pages the user did not engage it on.
- **REQ-PERM-3 (SHOULD).** The user should be able to control where PageAgent is and isn't allowed to operate (e.g. disable it on specific sites), consistent with per-site **Profiles** and trust settings.

### 7.6 Accessibility

*Accessibility is the flagship impact — see `00-brief.md`. These requirements make that claim real, not decorative.*

- **REQ-A11Y-1 (MUST).** PageAgent's own surfaces (Chat, Tools, Execute, Scan/Gen, Profiles) must be operable by keyboard and by assistive technology, and must meet a recognized accessibility bar — the tool for accessibility must itself be accessible.
- **REQ-A11Y-2 (SHOULD).** PageAgent should let a user operate a target website end-to-end without a mouse and without reading dense UI, via chat and (later) voice — this is the flagship capability, not an afterthought.
- **REQ-A11Y-3 (SHOULD).** PageAgent should lean on pages' accessibility semantics (accessible names, roles, labels) when naming tools, so that better-labeled pages yield clearer tools — and should be honest where those semantics are missing (REQ-SCAN-3).

### 7.7 Browser & availability assumptions

- **REQ-AVAIL-1 (MUST).** PageAgent must detect whether the required on-device capabilities are present and, when they are not, show a **clear banner** explaining what is unavailable and what the user can and cannot do as a result.
- **REQ-AVAIL-2 (MUST).** Where on-device capability is missing, PageAgent may offer a **clearly-labeled cloud fallback** as a bridge — never presented as the product, always with the privacy trade made explicit before use (REQ-PRIV-3). The thesis assumes on-device becomes the default in every browser soon; the fallback exists for the interim.
- **REQ-AVAIL-3 (SHOULD).** PageAgent should assume a moving target: browser AI capabilities and the WebMCP surface are evolving. It should prefer richer capabilities when present and never hard-require a capability that may be absent for a given user without a graceful path (REQ-REL-2).
- **REQ-AVAIL-4 (SHOULD).** PageAgent should be honest about the incumbent risk: it does not depend on a browser-maker's own agent and is designed to work where that agent will not — on-device, open, and on pages the native agent does not cover (see `06`).

---

## Traceability

- MoSCoW maps to the MVP boundary in `01-product-definition.md`: the **MUST** requirements together constitute the MVP; **SHOULD** items align with that doc's "Later" list; **COULD** items are credited future scope.
- The honest hard parts referenced throughout (REQ-REL-3, REQ-AGENT-6, REQ-SCAN-3, REQ-AVAIL-4) are elaborated in the risks doc (`06`); the surfaces named in these requirements are defined in `01-product-definition.md`.
