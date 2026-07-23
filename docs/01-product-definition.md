# PageAgent — Product Definition & Scope

**Purpose:** The authoritative definition of what PageAgent IS and IS NOT, its core concepts and glossary, its user-facing surfaces, and the in-scope / out-of-scope and MVP-vs-later boundaries. This doc is the shared reference for all sibling docs — see `00-brief.md` for the pitch.

---

## What PageAgent IS

- A **Chrome extension** that lets a user operate the current web page by talking to it — typed or spoken.
- A tool that **manufactures a set of actions from any page's own DOM** (its buttons, links, inputs, selects, menu items) and hands them to an on-device AI as usable tools.
- An **on-device assistant**: the model that maps intent to action runs on the user's machine, so the page content and the user's intent stay private.
- A **safety-first operator**: it previews and confirms before taking actions that can't be easily undone.
- A **bridge to the agentic web** that prefers a site's own declared tools when present and falls back to scanning the page when they aren't.

## What PageAgent is NOT

- **Not a website integration.** It requires nothing from the site owner; it works on pages as they ship today.
- **Not a cloud agent.** The core loop does not send the page or the user's intent to a remote model. (A clearly-labeled cloud fallback may exist where on-device capability is missing — see MVP boundary.)
- **Not a full-autonomy "set it and forget it" bot.** It is reliable for single, confirmed actions; it does not promise long, unattended, multi-step task completion.
- **Not a scraper, crawler, or data-exfiltration tool.** It operates the page in front of the user, on the user's behalf, in the user's own session.
- **Not a developer devtool.** It is the mainstream/consumer assistant version of the "scan a page and inject tools" idea — the reference DevTools product inspired it, but PageAgent is built for end users, not for inspecting a page's internals.
- **Not tied to any one website or task.** It is general-purpose across the web.

---

## Core concepts & glossary

Defined in product terms (what each *means* to a user, not how it's built).

- **Page** — the specific web page the user is currently on, in its current state. PageAgent always acts on the page in front of the user, in the user's own logged-in session.
- **Scan** — reading the current page to discover what a user could act on: its buttons, links, inputs, selects, and menu items. A scan reflects the page *right now*; if the page changes, it can be scanned again.
- **Action** — one thing that can be done to the page: click this button, type into this field, choose this option, follow this link. The atomic unit PageAgent executes.
- **Tool** — an action packaged for the assistant to use, with a plain-language name and description derived from the page (e.g. `fill_search`, `click_sign_out`). Tools are what the AI chooses among; each tool maps to one action.
- **Tool-set / Profile** — the collection of tools available for a given page or site. A **Profile** is a tool-set the user has saved for a site so PageAgent recognizes and trusts it on return visits, along with the user's preferences for that site (e.g. which actions always require confirmation).
- **Agent / Intent-loop** — the assistant's reasoning cycle: understand what the user asked, pick the most relevant tool(s), execute, observe the result, and continue until the request is satisfied or it needs the user. The loop is capped and re-checks the page between steps because the page can change.
- **Execute** — actually performing an action on the page (or running one tool directly, by hand). Execution is the moment PageAgent touches the live page.
- **Confirm-gate** — a checkpoint that shows the user what PageAgent is about to do and asks for approval before executing actions that are destructive or hard to undo (sign out, pay, delete, send). The safety layer between intent and action.

---

## Surfaces

The user-facing areas of the extension and what each is *for*.

- **Chat** — the primary surface. The user states what they want, in text or by voice; the assistant responds, acts on the page, and reports what it did. This is where the intent-loop lives and where most users spend their time.
- **Tools** — a browsable list of the tools generated for the current page, each in plain language. Lets the user see what the assistant *can* do here and builds trust in what's on offer.
- **Execute** — a manual surface to run a single tool directly, without going through chat. For precision, for testing a tool, and for users who prefer picking an action to describing it.
- **Scan / Gen** — the surface to (re)scan the current page and inspect what was detected and generated. Lets the user refresh the tool-set when a page has changed and see how the page was interpreted.
- **Profiles** — where saved per-site tool-sets and per-site trust settings live. Lets the user manage which sites PageAgent knows, what it's allowed to do without asking, and reuse tool-sets across visits.

---

## In scope vs out of scope

### In scope

- Operating the **current page** in the user's active tab and session.
- **Manufacturing tools from the DOM** of arbitrary pages.
- **Preferring a site's own declared tools** (`document.modelContext`) when present, scanning when not.
- **On-device** intent-to-tool mapping and execution as the core loop.
- **Chat (typed) and voice** interaction.
- **Safety**: previews, confirm-gates, and per-site trust settings for risky actions.
- **Per-site profiles** and saved tool-sets.

### Out of scope

- **Website-side changes** or asking sites to adopt anything.
- **Full unattended autonomy** and long multi-step task guarantees.
- **Cross-page or multi-tab orchestration** as a promise (a future direction, not a commitment).
- **Bulk scraping, crawling, or background data collection.**
- **A general chatbot** untethered from acting on the current page.
- **Backend accounts or server-side storage** of the user's data.

---

## MVP (first release) vs Later

Feature-level split. No timeline or effort implied.

### MVP — the first release must

- Scan the current page and **generate tools from its DOM**.
- Provide the **Chat** surface with **typed** input, driving the **on-device intent-loop** to pick and execute a tool.
- Reliably perform **single, confirmed actions** (click / fill / select / follow-link).
- Provide a **confirm-gate** with an action preview before destructive/irreversible actions.
- Show the **Tools** list and an **Execute** surface for running one tool manually.
- Provide **Scan / Gen** so the user can re-scan a changed page.
- Show a clear banner when the on-device capability is unavailable, with a **clearly-labeled cloud fallback** where on-device isn't yet present (the thesis assumes on-device goes default soon; the fallback is a bridge, not the product).

### Later — credited as future scope

- **Voice** input and spoken responses (the accessibility flagship) — real but with today's speech caveats.
- **Embeddings-based tool retrieval** — feed the model only the most relevant tools so pages with 50–100+ tools stay accurate and fast.
- **Profiles**: saved per-site tool-sets and per-site trust/allowlist settings.
- **Recorded macros / replayable named flows.**
- **`.well-known/mcp` fusion** — richer blending of a site's real declared tools with DOM-scanned ones.
- **Cross-page / multi-tab tasks.**
- **Undo** for executed actions beyond confirm-gating.
