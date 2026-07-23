# PageAgent — Documentation Index

**Purpose:** The entry point to PageAgent's product-inception docs — what to read, in what order, and how to use them to start product development. This set answers *what PageAgent is and why*; it deliberately stops short of *how to build it*.

PageAgent is a Chrome extension that turns any web page into something you can talk to: it scans the current page, manufactures a set of tools from its buttons, links, and inputs, and lets Chrome's built-in on-device AI operate the page for you through a chat (and, later, voice) assistant — privately, on your machine, on pages that exist today. It dissolves the WebMCP chicken-and-egg problem by manufacturing the agent's tool surface client-side instead of waiting for websites to expose their own.

These eight documents are **product inception only** — pitch, definition, requirements, users, ideas, landscape, risks, and a capabilities reference. They state WHAT PageAgent must do and WHY. Planning, architecture/HLD, tech-stack choices, data models, and sprint plans are **intentionally not here yet** — they come after this inception set is agreed.

## The documents (reading order)

| # | File | What it answers |
|---|------|-----------------|
| 00 | [`00-brief.md`](00-brief.md) | The one-page pitch: what PageAgent is, the problem it solves, why now, who it's for, and the codename/alternatives. Start here. |
| 01 | [`01-product-definition.md`](01-product-definition.md) | The authoritative scope: what PageAgent IS and IS NOT, the core-concepts **glossary**, the user-facing **surfaces**, and the in-scope / out-of-scope and **MVP-vs-Later** boundary. The shared reference all other docs assume. |
| 02 | [`02-requirements.md`](02-requirements.md) | The testable product requirements as stable **REQ-IDs** with MoSCoW priorities — capability statements (WHAT/WHY), including graceful-degradation behavior, never mechanism. |
| 03 | [`03-users-and-use-cases.md`](03-users-and-use-cases.md) | Who it's for (personas) and the jobs they hire it to do, via narrated scenarios — each tagged with an honest reliability read (Reliable today / Works with caveats / Aspirational). |
| 04 | [`04-ideas-and-backlog.md`](04-ideas-and-backlog.md) | The idea bank of future/optional scope (Strong next / Maybe / Wild), each with its value and its honest catch. A parking lot, not a roadmap — nothing here is committed. |
| 05 | [`05-competitive-landscape.md`](05-competitive-landscape.md) | The field PageAgent enters — the reference DevTools extension, the incumbent browser agent, RPA tools, cloud agents — and the durable wedge, plus where PageAgent honestly does *not* win. |
| 06 | [`06-risks-and-open-questions.md`](06-risks-and-open-questions.md) | The honest risk register (R1–R10 with severity) and the open product/policy questions to resolve before or during planning. Names the hard parts; proposes no mitigations. |
| 07 | [`07-capabilities-reference.md`](07-capabilities-reference.md) | Plain-language reference to the four Chrome built-in AI capabilities PageAgent leans on (WebMCP, Prompt API/Nano, Embeddings, Web Speech) — what each is, its honest current reality, and the PageAgent need it serves. |

Read 00 → 01 first (pitch, then scope + glossary); they anchor everything else. 02–03 make the scope concrete (requirements and use-cases). 04–07 provide the surrounding context — future ideas, the competitive field, the risks, and the capability reality — and can be read in any order once 00–01 are understood.

## How to use these docs to start product development

- **Agree the scope before planning.** Treat `01-product-definition.md` (the IS/IS-NOT list, surfaces, and MVP boundary) and the **MUST** requirements in `02-requirements.md` as the definition of the first release. The MUSTs together constitute the MVP; SHOULDs map to "Later"; COULDs are credited future scope.
- **Trace forward from REQ-IDs.** When planning, designing, or writing tests, reference the stable `REQ-<AREA>-<n>` IDs from `02` rather than restating requirements — they are the contract between inception and everything downstream.
- **Resolve the open questions first.** The open questions in `06-risks-and-open-questions.md` (auto-execution posture, consent model, cloud-fallback stance, which sites to target first, success metrics) are product/policy decisions that should be settled before or early in planning — several materially shape any design.
- **Keep the honesty discipline.** The reliability tags in `03`, the risk severities in `06`, and the capability caveats in `07` are load-bearing. Design and messaging must not oversell what the on-device model and DOM-scan can reliably do; single confirmed actions are the reliable core, long autonomous chains are not.
- **Then, and only then, produce the HOW.** Architecture/HLD, tech-stack, data models, and phased plans are the next layer of documents — built on top of this set, not mixed into it.

## Glossary

There is one canonical glossary, in **`01-product-definition.md` → Core concepts & glossary**. Every other doc uses those terms exactly — **Page, Scan, Action, Tool, Tool-set / Profile, Agent / Intent-loop, Execute, Confirm-gate** — so when a term is unclear, that section of `01` is the single source of truth; the surfaces (Chat, Tools, Execute, Scan/Gen, Profiles) are defined in the same doc.
