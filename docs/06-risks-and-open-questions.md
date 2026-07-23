# PageAgent — Risks & Open Questions

**Purpose:** An honest risk register plus the open questions that must be resolved before or during planning. This doc names the hard parts and the unsettled decisions — it does **not** propose mitigations, designs, or answers. See `00-brief.md` for the pitch, `01-product-definition.md` for scope and glossary.

---

## How to read this

- **Risks** are things that are true about the world and could hurt the product. Each states *what it is*, *why it bites*, and a *severity* (High / Med / Low). Severity reflects likelihood × impact on whether PageAgent can deliver on its thesis, not effort to address.
- **Open questions** are decisions PageAgent's owners must make. They are framed as things to resolve, not answers. Most are product/policy calls, not engineering design.
- Nothing here prescribes *how* to fix anything. Mitigation belongs in planning, not in an inception risk register.

---

## Risk register

### R1 — DOM → tools reliability across the messy web
**Severity: High** (this is the crux — see `00-brief.md`)

**What it is.** PageAgent manufactures its tools by reading the live page. Real pages are hostile to that: single-page apps that re-render, shadow DOM, virtualized/infinite lists where most rows don't exist yet, icon-only buttons with no readable label, canvas- or image-rendered controls, custom widgets that aren't real buttons/inputs, and dynamic content that appears only after interaction.

**Why it bites.** If the scan misses an action, mislabels it, or generates a tool that no longer maps to a live element, the assistant either can't do the task or — worse — does the *wrong* thing. Every downstream promise (chat, voice, accessibility, automation) rests on the tool surface being an accurate, current picture of the page. Unreliable tools don't just fail; they erode the trust the whole product needs.

---

### R2 — Auto-executing actions in authenticated sessions is a live safety surface
**Severity: High**

**What it is.** PageAgent's headline value is operating pages *behind the user's login* — bank, email, work tools. That means it can click "pay," "delete," "send," "sign out," "confirm order," or "share" in a session that carries the user's real authority. A misread intent or a misgenerated tool executes with the user's full privileges.

**Why it bites.** The tasks with the most value (see `00-brief.md`'s on-device unlock) are exactly the ones where a wrong action is expensive and often irreversible. The `confirm-gate` (see `01-product-definition.md`) is the designed answer, but the risk is structural: any assistant that clicks real buttons in real sessions is one bad classification away from real harm, and users' tolerance for that is very low.

---

### R3 — Multi-step / re-scan reliability
**Severity: High**

**What it is.** Many real requests need more than one action ("filter to failed jobs, then re-run them"). Between steps the page changes — new content loads, elements move, the previous tool-set goes stale — so PageAgent must re-scan and re-plan mid-task. Each hop compounds the chance of a missed or mislabeled element (R1) and a wrong action (R2).

**Why it bites.** Users will *ask* for multi-step things naturally; the product can't easily forbid it. But reliability degrades multiplicatively across steps, and the on-device model is weak at planning long chains (R4). The gap between "reliable single confirmed action" (the MVP core) and "what users will try to do" is a standing source of failure and disappointment.

---

### R4 — On-device model (Nano) quality ceiling for intent → tool mapping
**Severity: High**

**What it is.** The on-device model is good at classifying a request into one well-labeled tool, and weak at deep multi-step planning. Its accuracy drops as the tool list grows and as tools resemble each other (many near-identical buttons on one page). It also has a smaller quality ceiling than cloud models for nuanced or ambiguous intent.

**Why it bites.** On-device is the whole thesis (`00-brief.md`), so the product lives inside this ceiling. Pages routinely produce 50–100+ tools; without narrowing, selection accuracy falls and context fills up. Embeddings-based retrieval is the intended answer but is *Later* scope (see `01-product-definition.md`), so the MVP must be honest about how many/similar tools it can handle well.

---

### R5 — Capability availability & origin-trial/flag reality
**Severity: High**

**What it is.** The browser primitives PageAgent depends on are early: the on-device Prompt API, on-device embeddings, and the WebMCP tool-registration surface are variously behind flags, in origin trial, in Canary/EPP, or shipping without the pieces the thesis assumes. Native tool-calling in the on-device model is not reliably shipped, forcing a manual intent loop. The thesis explicitly *assumes* these go default in every browser soon — an assumption that may slip.

**Why it bites.** If the capabilities aren't present for a normal user, the product can only run via the clearly-labeled cloud fallback (`01-product-definition.md`) — which contradicts the on-device promise that justifies operating authenticated pages. The gap between "what the demo needs" and "what a shipped browser gives a real user today" is a real threat to the product's reason for existing on the timeline it assumes.

---

### R6 — Incumbent absorption (the native browser agent)
**Severity: High**

**What it is.** The browser maker's own agent (Gemini-in-Chrome / Mariner-style) could ship the same "operate any page by chat" capability, first-party, deeply integrated, and default-on — absorbing PageAgent's core use case.

**Why it bites.** A first-party agent has advantages PageAgent can't match on integration or distribution. If it also runs on-device and privately, PageAgent's wedge narrows sharply. The durable differentiators (`00-brief.md`) — on-device privacy, open/hackable, and working where the native agent *won't* (or won't be trusted) — must actually hold; if the incumbent covers them too, the product's defensibility is thin.

---

### R7 — Web Speech STT is cloud-backed today
**Severity: Med**

**What it is.** Voice input (speech-to-text) in Chrome routes audio to Google's servers; it is not on-device. Voice output (text-to-speech) uses OS voices and is mostly local but varies in quality, and there is no on-device AI TTS. Voice is *Later* scope and is the accessibility flagship (see `01-product-definition.md`).

**Why it bites.** The flagship accessibility story is "operate any page by voice, privately, on-device." But the moment the user speaks, audio leaves the machine — directly contradicting the privacy promise on precisely the authenticated pages where it matters most (speaking a payee name, an account number, a message). Selling voice as private, or as fully on-device, would be dishonest; the caveat has to travel with the feature.

---

### R8 — Sites that forbid or actively resist automation
**Severity: Med**

**What it is.** Some sites prohibit automated interaction in their terms, deploy anti-bot defenses, or break when driven programmatically. PageAgent acts *as the user*, in the user's own session, but it is still automating clicks the site may not welcome.

**Why it bites.** Beyond breakage, there's a policy and reputational surface: a privacy-first assistant that trips fraud defenses, violates terms, or gets a user's account flagged undermines the trust that is the product's core asset. Where the line sits between "assistive technology acting for the user" and "disallowed automation" is genuinely unsettled and not purely technical.

---

### R9 — User over-trust / automation complacency
**Severity: Med**

**What it is.** As PageAgent works, users stop reading confirm-gates and approve by reflex. The better it gets at routine actions, the more a rare wrong action sails through an inattentive approval.

**Why it bites.** The confirm-gate is the primary safety layer (R2), and its protection decays exactly as the product succeeds. This is a well-known pattern in assistive automation and it directly threatens the safety story that makes operating authenticated pages acceptable.

---

### R10 — Scan reads sensitive on-page content
**Severity: Med**

**What it is.** Scanning an authenticated page to find actions means reading a page that contains balances, health data, messages, and personal details. Even though the on-device thesis keeps this local, the extension is *ingesting* highly sensitive content to do its job.

**Why it bites.** It raises the stakes on the on-device promise (any leak, logging, or cloud-fallback path becomes a serious exposure), and it shapes what the product may and may not retain, log, or send. It also intersects with the consent model (see open questions) — users must understand what "scan this page" actually reads.

---

## Open questions

Decisions to resolve before or during planning. These are product and policy calls; they are listed as questions, not answers.

### Auto-execution posture
- **How aggressive should auto-execution be by default?** Where does the default sit on the spectrum from "propose every action and wait" to "just do it"? Does the default differ for read-only vs. state-changing actions?
- **What defines a "destructive or hard-to-undo" action** that must pass the confirm-gate, and who decides — heuristics, the user, per-site settings, or a mix?
- **Should there be a hard stop list** of actions PageAgent never takes automatically regardless of settings (e.g. payments, account deletion, sending money)?

### Scope: which surfaces and sites first
- **Which kinds of pages/sites should the MVP target first** to prove reliability — simple form-driven sites, a few high-value authenticated sites, or breadth across arbitrary pages? (Bears directly on R1.)
- **How does PageAgent behave when a scan is low-confidence** — degrade gracefully, warn, or decline to offer tools it isn't sure about?
- **What is the honest, stated reliability boundary** communicated to users (single confirmed actions reliable; long chains not)?

### Sites that forbid automation
- **What is PageAgent's stance when a site's terms or defenses signal automation is unwelcome?** Proceed as user-agent, warn, or refrain — and is this per-site configurable?
- **Where is the product's own line** between assistive operation on the user's behalf and disallowed automation, and how is that communicated?

### Consent & permission model
- **What does a user consent to, and when** — per site, per session, per action class, once globally? How is "PageAgent may read and act on this page" surfaced honestly (R10)?
- **What is retained, if anything** — tool-sets, profiles, transcripts — and what is the user's control over it?
- **How is the cloud fallback consented to and labeled**, given it contradicts the on-device promise (R5)? Is it opt-in, and does it ever engage silently? (It must not.)
- **How is voice's cloud-backed STT disclosed** so users aren't misled about privacy (R7)?

### The on-device / availability bet
- **What does PageAgent do for the majority of users who don't have the on-device capabilities yet (R5)?** Is the cloud fallback a first-class path or an explicit, temporary bridge — and does shipping it dilute the thesis?
- **What is the minimum capability bar** below which PageAgent declines rather than degrades?

### Differentiation vs. the incumbent
- **What is the sharpest, most defensible wedge** if the native browser agent ships the same core capability (R6) — privacy, openness/hackability, accessibility depth, or working where the native agent won't?
- **Who is the primary user we optimize for first** — accessibility users (the flagship impact), privacy-conscious users, or power users — when their needs pull the product in different directions?

### Success metrics
- **How do we define success for the MVP** in product terms — task-success rate on single confirmed actions, trust/retention, accessibility outcomes, or something else?
- **What counts as a "safe" track record** — e.g. rate of wrong/unintended executions that slip past the confirm-gate — and what threshold is acceptable to ship?
- **How is accessibility impact measured**, given it's the flagship justification and not a generic usage metric?

---

*This register is deliberately incomplete on solutions. Its job is to make the hard parts and the unresolved decisions visible before planning begins.*
