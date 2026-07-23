# PageAgent — Design Brief
### A draft *description* to hand to Claude Design (not a built design)

> **Status: DRAFT.** This is a written design brief — art direction, information
> architecture, an enumerated screen/state checklist, and normative copy — prepared
> so a downstream **Claude Design** step can generate the actual screens. It deliberately
> contains **no finished HTML/CSS or pixel-final mockups**; it describes *what to design and why*.
>
> **Grounded in:** the PageAgent product-inception set in [`docs/`](./README.md) —
> the brief (`00`), definition + glossary (`01`), requirements/REQ-IDs (`02`),
> users/use-cases (`03`), ideas (`04`), competitive landscape (`05`), risks (`06`),
> and the Chrome built-in-AI capabilities reference (`07`). Glossary terms
> (**Page, Scan, Action, Tool, Tool-set/Profile, Agent/Intent-loop, Execute, Confirm-gate**)
> are used exactly as defined in `01`; load-bearing requirements are cited by REQ-ID.
>
> **How to turn this into a design run:** feed §§2–14 to Claude Design as the prompt.
> §§5–6 fix the form factor and IA; §7 is the production checklist; §§8–11 are normative
> constraints (safety, accessibility, palette, copy); §13 lists the decisions still open
> for the human owner — surface them, don't silently resolve them.

---

## 1. What this document is, how to use it, and the one rule

This is a **design brief** for PageAgent — a written direction handed to a downstream "Claude Design" step. It is **not** the built design. It contains art direction (named palette, type pairing, layout concept, motion posture), an information architecture, an enumerated screen/state checklist, and normative copy — everything the design step needs to produce screens that could only be PageAgent. It deliberately does **not** contain finished HTML/CSS or a pixel-final mockup.

**How to use it:** Sections 5–6 fix the form factor and IA as the committed build target — build to them; the owner-ratification of that direction, like the other working positions this brief takes, is tracked in §13. Section 7 is the concrete production checklist. Sections 8–11 are normative: the safety behavior, accessibility numbers, palette hexes, and microcopy are load-bearing, not placeholder — treat them as constraints, not suggestions. Section 12 is the "do not become this" guardrail. Section 13 lists the decisions still open for the human owner; do not silently resolve them — surface them.

**The one rule that overrides everything: never oversell reliability, autonomy, or privacy.** PageAgent operates real, authenticated sessions (bank, work, health, mail). The interface and its words must claim only the reliability it has (single, confirmed **Action**s — not long unattended chains, REQ-AGENT-6, REQ-REL-3), only the autonomy the user granted (never the **Page**'s, REQ-SAFE-8), and only the locality it is actually keeping (the honest processing-locus state machine, never an always-green badge, REQ-PRIV-1/3). When in doubt, the design says less and shows more. Honesty is not a section of this product — it is the product.

---

## 2. The product in one paragraph, and the single job of the design

**PageAgent turns any web page into something you can talk to.** It **Scan**s the current **Page**, then **Gen**erates (manufactures) a set of **Tool**s from the page's own DOM (buttons, links, inputs, selects, menu items) — each a single **Action** with a plain-language name derived from the page — and lets Chrome's on-device LLM operate the page for the user through a **Chat** assistant driving a capped **Agent / Intent-loop** (understand → pick **Tool** → **Execute** → observe → continue), re-checking the page between steps. ("**Gen**" is the generation step — turning detected elements into the **Tool-set** — and pairs with **Scan** as one inspectable surface, §6.) Nothing about the page or the user's intent leaves the machine in the core loop (REQ-PRIV-1). It gets better as sites declare their own tools via WebMCP ("fusion").

**The single job of the design:** make it *safe and legible* to point an on-device agent at your most sensitive logged-in pages — by making three things true at a glance on every screen: **(1) you can see which Page the Tools belong to and how they were derived** (open, inspectable), **(2) you can see where this turn is being processed** (on your device vs. off it), and **(3) nothing destructive happens without a specific, truthful preview you deliberately approve.** If the design nails only "a nice chat UI," it has failed. The spine of this product is the Page + the Tool-set + the trust surface, not a chatbot with a website attached.

---

## 3. Who it's for, and the emotional target

Lead persona is the flagship; every other persona benefits from the same rigor.

1. **Accessibility user — FLAGSHIP.** Operates any site by chat (later voice), at *intent level* ("turn off marketing emails"), not pixel level ("click the third toggle"). The panel is their **only window onto a page they cannot see**, so report-backs and the Confirm-gate are load-bearing, not decorative (REQ-A11Y-2). If a screen-reader or keyboard-only user cannot fully operate PageAgent's own panel, the entire thesis collapses.
2. **Power user / automator** — repetitive web chores.
3. **Ops / on-call engineer** — drives dashboards/consoles mid-incident in high-privilege authenticated sessions. Sharpest proof of the on-device thesis; signature demo = "rerun the failed jobs" on a CI page.
4. **Everyday non-technical user** — "where is that setting?", "turn off marketing emails."
5. **Developer (secondary)** — probes the agentic web, validates fusion. Served by *progressive disclosure*, never by making the default UI a devtools panel.

The brief names the accessibility user as the persona whose needs win when personas conflict; the owner is asked to confirm that ordering (§13).

**Emotional target: calm, private competence.** The feeling is a *steady operator at an instrument panel* — a local tool that answers to you, tells you plainly what it did and what it couldn't, and stops to check before anything it can't undo. Not a chirpy copilot, not a magic autonomous genie, not a cloud service borrowing your session. Trust is earned by candor and restraint, and it is the one asset the design cannot spend.

---

## 4. Design principles / north stars

1. **Locality is the whole point — signal it spatially, never with a padlock.** Privacy is a *locality* claim ("it stays here / on your machine"), not a cryptographic one. Express it as an enclosure / "your machine" boundary that off-device paths visibly breach. Forbid padlock/shield/lock iconography — it implies a guarantee the product doesn't make and is the single most overused privacy cliché (wedge #1; REQ-PRIV-1).
2. **Tell the truth about where processing happens — an honest state machine, not a reassurance sticker.** A persistent, first-class **processing-locus indicator** names where the current turn's *reasoning* runs (On-device / Off-device / Unavailable) and *changes state truthfully in real time*. Its On-device resting state is deliberately **quiet — dormant instrumentation, not an affirmative "you're protected" claim** — so a standing local state never hardens into an always-green badge (privacy theater, prohibited). It earns trust precisely because it visibly changes when the cloud fallback runs. **A turn can be *mixed*:** the LATER voice path reasons on-device while cloud STT sends audio off-device, so a single reasoning-locus state can't tell the whole truth. Whenever *any* data leaves the device, the indicator must carry a distinct, always-on **audio-egress marker**, suppress the private resting affordance, and name *what* left. The exact mixed-turn semantics are an owner decision (§13). (REQ-PRIV-3, REQ-AVAIL-2, REQ-VOICE-3.)
3. **Open and inspectable, in plain language — the anti-black-box.** The **Tool**s the **Agent** could use are browsable in plain language; every report-back names the specific **Tool** used as an inspectable chip; **Scan / Gen** shows *how the page was interpreted*, not just a result. Machinery (selectors, DOM detail) is one tap away, never front-and-center — the line between "inspectable" and "a JSON poker" (wedge #3; REQ-RETR-5, REQ-SCAN-6).
4. **Reversibility governs friction; danger is kept scarce.** No "Are you sure?" bolted onto everything. A reversibility ladder (§8) spends friction like scarce currency so the **Confirm-gate** never trains a click-through habit — the structural answer to over-trust (Risk R9; REQ-SAFEN-1).
5. **Fail safe and say so — honesty is a first-class state, not an error.** When PageAgent can't confidently read the page or the request, it does nothing and explains, as *competence* (calm, not red) (REQ-REL-1). The "I can't tell which button deletes" moment is a trust signal a black box can't offer.
6. **Free & ambient — proven by absence.** No credit/token/usage meter, no "N actions left," no upgrade CTA, no cost hint anywhere. Quiet, persistent presence on every page; local "thinking" feedback, never network-flavored "contacting server…" spinners (wedge #2).
7. **Accessibility-first, so the tool for accessibility is itself exemplary.** WCAG 2.2 AA is the floor; named AAA reaches are binding because PageAgent owns its whole palette and DOM (§9). Intent-level chat operation *is* the accessibility posture (REQ-A11Y-1/2).

---

## 5. Form factor & platform

**Recommendation (taken as the committed build target for MVP, one dimension flagged open; owner ratification of the direction tracked in §13): the Chrome MV3 side panel is the home.** All lenses converge here, and for the same reason: it is the only surface that is simultaneously *persistent* (survives clicks into the Page and focus changes, so the Agent can watch the Page while the user reads it and vice-versa), *roomy in the tall dimension* (Chat transcript + Tools list), and — load-bearing — **browser chrome, not page content**. That separation is what lets the assistant be visibly *not part of the site* on an authenticated page, rendered where the Page cannot restyle, occlude, spoof, or inject into it (REQ-SAFE-8 prompt-injection resistance; REQ-PRIV-4 "your session, on your behalf"). For accessibility it is a stable, separately-focusable document with a keyboard/SR focus model fully under our control.

**Alternatives, weighed and demoted:**
- **Toolbar action popup** — dismisses on focus loss and on any click into the Page. Fatal for an Intent-loop that must observe the Page between steps (REQ-AGENT-4) and hostile to a persistent switch-access workflow. **Keep the toolbar action button, demoted to entry point + at-a-glance status badge** (available / degraded / acting), not the workspace.
- **In-page content overlay** — injected into arbitrary DOM: z-index/style collisions, spoofable by the Page, muddies the agent-vs-page trust boundary, fights the host page's own focus order and a11y tree. **Note only as a possible *future* affordance for pointing at a specific on-page element**, never as the home.

**Flagged OPEN:** the side panel's ~320–400px width is a real constraint on the Tools list, source/risk badges, and truthful Confirm-gate previews. Pressure-test the narrow column against a 50–100-**Tool** Page before locking. This is the one form-factor decision to revisit if the column proves too tight (§13).

---

## 6. Surface map & information architecture

**Five surfaces, four navigational destinations, one cross-cutting layer.** Behind a persistent, labeled, keyboard-navigable tab bar directly under the header (not a hidden sheet — discoverability of the trust surface *is* the trust mechanism, and a stable tab order serves the flagship persona):

- **Chat — hero and home / default landing.** The Intent-loop lives here; report-backs and clarifications happen here (REQ-CHAT-1/2/3/4).
- **Tools — the browsable trust surface, with Execute folded in.** *Do not build Execute as a co-equal fifth tab.* REQ-EXEC-2's "run one **Tool** by hand, outside Chat" is a **"Run" affordance on each Tool row** — the same list that builds trust (REQ-SCAN-2, REQ-RETR-5) is where a single Tool is run. Each row carries: plain-language name + Action-type badge, a **source badge** (site-declared via `document.modelContext` vs DOM-manufactured, REQ-SCAN-6), and a **risk badge** (destructive Tools announce they will hit a Confirm-gate).
- **Scan / Gen — the inspectable detection view.** (**Scan** reads the page; **Gen** is the generation of the **Tool-set** from the detected elements.) *What was detected and how it was interpreted* (element → **Tool** mapping), the coverage-honesty summary ("N tools from M elements; K unlabelled controls I can't name" — REQ-SCAN-3/7, REQ-REL-3), scan progress (REQ-PERF-2), and (COULD) scan scope (REQ-SCAN-8). Header re-Scan is the fast path; this is the deep one.
- **Profiles — clearly-marked LATER.** Saved **Tool-set**s + per-site trust. IA and copy must reinforce local-only — never imply server storage (REQ-PROF-3/4, REQ-PRIV-2).

**Confirm-gate is a cross-cutting layer, not a destination** — inline in the Chat transcript when the Intent-loop reaches a destructive Action, and wrapping a Run in the Tools/Execute path (§8).

**Persistent three-zone single column:**
1. **Header (compact, always visible):** (a) **Page identity** — favicon + origin + short title (the Tools belong to *this* Page; on a logged-in site the origin reassures it's the user's real session); (b) **scan-freshness** with an always-reachable **re-Scan** control; (c) the **processing-locus indicator** — On-device "Local node" *quiet resting* state / Off-device (loud, labeled) / Unavailable, plus the always-on **audio-egress marker** on any mixed turn (LATER voice, §4); plus an **acting indicator + always-available Stop** while the loop runs (REQ-AGENT-5, REQ-SAFEN-2).
2. **Surface body (vertical majority):** the active surface; a **banner strip** slots between header and body when availability changes (REQ-AVAIL-1) or the Page goes stale.
3. **Context-pinned footer:** on Chat, the composer (text now; mic as a clearly-labeled LATER affordance).

**IA principle that makes degradation graceful — separate what needs the model from what doesn't.** Only Chat's Intent-loop needs the on-device model. Browsing **Tools**, running one via **Execute**, and inspecting **Scan / Gen** are mechanical. Keep the surfaces architecturally separable so that when on-device capability is absent (REQ-AVAIL-1) and the user has *not* opted into cloud fallback, **Chat is disabled-with-explanation while Tools + Execute + Scan stay fully usable** (REQ-REL-2). An honest, still-useful state, not a dead extension.

**Freshness state machine (rendered in the header):** **Fresh → Aging → Stale → Scanning → Failed.** Staleness is triggered by SPA route change, URL change, DOM mutation past a threshold, or the Intent-loop's between-step page re-check (REQ-AGENT-4) noticing a mismatch (REQ-REL-4). When stale, the UI proactively offers re-Scan; the Agent must refuse to fire a **Tool** that no longer corresponds to the current Page and stop/report instead.

**Panel is bound to the active tab's Page.** On tab switch, swap header identity + **Tool-set** and show a *"these Tools are for [previous page] — Scan [this page]?"* state rather than silently pointing stale Tools at a new Page/session (REQ-AGENT-4, REQ-REL-1, REQ-PRIV-4).

**LATER destinations/affordances (design as clearly-marked future states only):** Profiles + per-site trust; Voice (mic in the composer with cloud-STT caveat); embeddings-based top-k retrieval (narrows what the *Agent* sees, never what the *user* browses, REQ-RETR-5); recorded macros; fusion via `.well-known/mcp`; cross-page/multi-tab.

---

## 7. Screens & states to design (production checklist)

**Shell & onboarding**
1. Side-panel shell: header (Page identity + freshness + locus indicator) + tab bar + surface body + context-pinned footer, in the narrow-tall column — light and dark.
2. First-run / permissions explainer: what access is needed and why + the on-device privacy promise (REQ-PERM-1, REQ-PRIV-1).
3. Fresh Page, not-yet-scanned empty state ("Scan this page to begin").
4. Unsupported/blocked Page honest state (chrome://, PDF viewer, restricted page).
5. Scan consent / "what I read on this page, on your device" micro-disclosure (Risk R10).

**Availability & privacy states**
6. Availability banner — on-device unavailable: persistent, non-dismissable, states what still works vs not (REQ-AVAIL-1).
7. Cloud-fallback offered state — labeled "Offshore" treatment, explicit opt-in *before* use (REQ-AVAIL-2, REQ-PRIV-3).
8. Processing-locus indicator in all three truthful states — On-device (quiet resting, *not* an affirmative "protected" claim), Off-device (loud, labeled), Capability-unavailable — plus the mixed-turn compound treatment (reasoning-locus + always-on audio-egress marker) for the LATER voice path.
9. The transition moment when the locus indicator flips On-device → Off-device (the one place the strongest motion is reserved).

**Chat (hero) — signature scenarios**
10. Chat empty/idle state: page-aware, calm, NOT "Ask me anything"; Page-grounded example prompts derived from *this* Page's Tools; Chat input auto-focused; the summon shortcut surfaced.
11. Chat mid Intent-loop: visible + SR-exposed "Scanning / Working" status with the between-step page re-check, and an always-visible Stop (REQ-AGENT-5); static `prefers-reduced-motion` variant of the working indicator.
12. Report-back turn, one per rung of the **certainty ladder** (§11): Done (verified) / Sent-unconfirmed / Couldn't / Didn't (fail-safe "I did nothing and why").
13. **"Rerun the failed jobs"** on an authenticated CI page (ops; on-device proof) — including the batch-count question ("re-run 3 failed jobs?") previewed truthfully.
14. **"Turn off all marketing emails"** — Tier 0 single reversible toggle, no gate, observed-result report ("…the page now shows 'Preferences saved.'"), with the **one-tap reverse** present on the trust-ledger entry (§8).
15. **"Where do I turn off two-factor?"** — read-only wayfinding, guidance-first, visibly "I won't touch anything" posture.
16. Clarification/ambiguity ask (REQ-CHAT-4): several-plausible (choice chips), maps-to-nothing, genuinely-vague.
17. The **crux honesty moment** (icon-only toolbar, "delete this draft"): "I found 3 unlabelled buttons and can't tell which deletes — run them one at a time in Execute?" routing to Execute, never guessing (REQ-SCAN-3).
18. Cap-reached hand-back (REQ-AGENT-1) and the honest "single-action reliable, not an unattended chain" framing (REQ-AGENT-6).
19. Mid-task Page-changed / re-Scan-needed state (REQ-AGENT-4); action-didn't-have-expected-effect report (REQ-REL-4).
20. Per-turn cloud label on any turn that used cloud fallback or (LATER) cloud STT.
21. Prompt-injection posture made visible — the structural "I only ever act on what *you* ask, never on text the page contains" statement; any "this page contains text that reads like commands" line framed as best-effort / non-exhaustive, never as a claim of reliable detection (REQ-SAFE-8).
22. Transcript provenance treatment: the visual walling-off of user request vs. quoted inert page content vs. agent action.

**Confirm-gate (cross-cutting)**
23. **Tier 1** — "Cancel my subscription": truthful preview (named button + Billing location + verbatim consequence + reversibility + user-provenance + locate-on-page highlight), verb-restating proceed button, safe action default-focused.
24. **Tier 2** — "Pay $500 to Jordan" / "Sign out of Chase": escalated deliberate-act (value re-acknowledgment), safe action default-focused, distinct heavy treatment.
25. Unsure-posture gate — hedged "I'm not certain this can be undone, so I'm checking," visually distinct from confident-destructive.
26. Forced-colors / Windows High Contrast rendering of the gate.

**Tools / Execute / Scan-Gen**
27. Tools list populated: plain-language name + Action-type badge + description + source badge + risk badge + Run affordance — one sparse Page AND one dense Page (50–100+, with search/filter, hinting LATER top-k).
28. Single Tool row: plain-language default vs. one-tap "details" expansion (element it maps to) — proving open-but-not-a-JSON-poker.
29. Mixed-provenance page: some rows "From this site" (declared/WebMCP), some "Read from the page" (DOM-manufactured) — the fusion story at a glance.
30. Execute single-Tool run, including a value field for input-type Tools (e.g. `fill_search`), routing through the Confirm-gate when destructive.
31. Tools: honest low-confidence / unlabelled-controls state; and empty (no actionable elements) honest state.
32. Scan/Gen: scan-in-progress (Halide read-line sweeping a wireframe, resolving controls into Tools); result summary with coverage caveats; element→Tool inspection view; scan-failed / partial state.
33. Freshness state machine rendered in header (Fresh/Aging/Stale/Scanning/Failed) + proactive re-Scan offer.
34. Tab-switch state: "these Tools are for [previous page] — Scan [this page]?".

**Accessibility artifacts**
35. Focus-visible specimen sheet across buttons, toggles, list rows, tabs, inputs — light, dark, forced-colors — proving 2.4.11/2.4.13 and ≥3:1.
36. Report-back optimized for screen readers: describes the *observed page-state change*, incl. the multi-step re-scan case and the fail-safe outcome.
37. Tools list with roving-`tabindex` arrow-key navigation (one tab stop, not 50–100) + honest presentation of unlabeled tools with position-based description.

**LATER (clearly labeled future states)**
38. Voice mic in the composer carrying the inline cloud-STT "audio leaves your device" caveat + the persistent **audio-egress marker** (§4/§8) whenever audio is leaving; the spoken Confirm-gate requiring deliberate (non-bare-"yes") confirmation.
39. Profiles: saved Tool-sets list; per-site trust settings showing the un-silenceable hard-stop floor; view/edit/delete + clear-all-local-data.

Every key state ships **light and dark** variants.

---

## 8. Safety & trust UX

This is the load-bearing surface (Risk R2, R9). If it reads like a generic "Are you sure?", the product has failed its own thesis.

### Reversibility ladder — friction spent as scarce currency (REQ-SAFEN-1)
- **Tier 0 — Flow (reversible):** toggle a setting, fill a search box, follow a link, open a menu. **No gate** — executes and lands in the **trust ledger**, where each Tier-0 execution carries an **immediately-visible one-tap reverse** (re-invoking the action's inverse — toggle back, clear the field; distinct from a general undo *history*, which is LATER, REQ-SAFE-7). "Turn off all marketing emails" belongs here — deliberately *not* a scary modal. Restraint here is what keeps Tier 2 meaningful.
  **But "reversible" is a *claim* made by a weak on-device model, not a fact** (R1/R4). The safeguard for a *confidently wrong* classification — the model sure a control is reversible when it fires something irreversible — has three parts: (a) "reversible" must clear a **reversibility-confidence bar** — below it the action is treated as destructive and **gated** (REQ-SAFE-3); (b) on **authenticated / high-stakes origins the classifier biases conservative**, gating any state-changing action it is not confident is *both* reversible *and* low-consequence (a low-consequence, clearly-reversible settings toggle like marketing-emails still stays Tier 0); and (c) the one-tap reverse in the ledger is the visible net when the call is wrong. The residual risk this leaves — and the acceptable default auto-execution posture — is a named owner decision (§13).
- **Tier 1 — Confirm-gate (destructive / hard-to-undo):** delete a draft, cancel a subscription, submit a form, discard changes. Truthful preview + one deliberate approval (REQ-SAFE-1).
- **Tier 2 — High-consequence, the hard-stop class:** pay/send money, sign out, delete account, irreversible send. Escalated deliberate-act. **Rare by construction** — because the user almost never sees it, its appearance reads as categorically different. That scarcity *is* the anti-reflex mechanism.

The difference between tiers is **structural and typographic**, not "louder animation." Reserve the single highest-alert accent (Halt red) for Tier 2 only.

### Confirm-gate anatomy — a specific, truthful, *verifiable* preview (REQ-SAFE-1/2)
1. **Action verb** in glossary terms (click / type / choose / follow-link), plain language.
2. **Concrete target, doubly identified:** the manufactured **Tool** name *and* the on-page label/location ("the **Cancel subscription** button in the Billing section").
3. **Exact value, verbatim,** for type/choose Actions — quoted, visually distinct from PageAgent's own text (`jordan@acme.com`; `$500.00`). Never paraphrase.
4. **Consequence + reversibility class, plainly:** "This ends your Pro plan on 30 Aug 2026 and can't be undone from here."
5. **Provenance:** "Because you asked: *'cancel my subscription.'*" (REQ-SAFE-4, and the anti-injection tell).
6. **Locate-on-page:** the gate scrolls to and outlines the *actual live DOM element* it will operate. **If it cannot locate/highlight the element, that is a low-confidence signal — decline, don't gate-and-proceed** (REQ-REL-1). For a non-sighted user, provide the equivalent verifiable anchor in the announced preview — the precise form of that anchor is an open question (§13).

### Three confidence postures (never fake uniform confidence)
- Confident-reversible → Tier 0 flow (subject to the reversibility-confidence bar above).
- Confident-destructive → firm Tier 1 gate, neutral and matter-of-fact.
- **Unsure whether it's destructive → treat as destructive and gate (REQ-SAFE-3), and say so:** "I'm not certain this can be undone, so I'm checking first." Visually distinct from confident-destructive — an uncertainty marker, not a louder red.

### Anti-reflexive-approval (R9) — resolved position
The **only legitimate anti-reflex levers** are: (a) proportionate *scarcity* of the gate, (b) making the *truthful detail* the thing you interact with, and (c) never defaulting to the dangerous action.

**Do:**
- **Never pre-focus or default-highlight the destructive button; Enter/Return must never fire Confirm.** The safe action (Cancel / Keep / "Don't cancel") holds default focus.
- **Lead with the consequence, not the verb.** "You'll be signed out of Chase and need your password to get back in" beats "Confirm sign out."
- **Proceed button restates the concrete destructive verb or amount** — `[Cancel subscription]`, `[Pay $84.30]` — never generic `OK`/`Confirm`. Because details vary every time, users can't learn to rubber-stamp a boilerplate shape.
- **For Tier 2, require an act that can't be muscle memory, anchored to the truthful detail: value re-acknowledgment** — actively confirm the specific concrete target (the `$500.00`, the recipient, the account name) so approval forces reading the real target. This is a *comprehension* act, not a redundant-entry burden — it qualifies for WCAG 3.3.7's "essential" exemption — and it must be fully **keyboard-, switch-, and screen-reader-operable** (e.g. select-and-confirm the shown value). It is the **sole** Tier-2 lever: **no press-and-hold** and no other sustained or timed gesture (those are forced waits this section refuses, and they are hostile to the flagship motor-impaired persona).

**Refuse (flag any downstream instinct toward these):**
- **No countdown timers or forced waits** — they train "wait, then click," add nothing to comprehension, and are hostile to the flagship accessibility persona (REQ-A11Y; WCAG 2.2.1). (This is why press-and-hold is out.)
- **No disabled-then-enabled Confirm button** as the friction — same failure, and it fails AT.
- **No rotating button positions, shuffled labels, or decoy buttons.**

*Reconciling motion with these bans:* Tier 2 may carry distinct visual *weight* — a heavier entrance, a settle — so it doesn't read as a routine card. That is **expressive weight, not a timing gate**: it must not disable-then-enable the control, must not impose a wait, and must honor `prefers-reduced-motion`. The comprehension friction (value re-acknowledgment) does the work; motion only signals "this is different."

### The honest decline / fail-safe — a first-class calm state, not an error
When PageAgent can't confidently interpret the page or request, it does nothing and says so (REQ-REL-1/3) as *competence*: calm neutral treatment, never red, never apologetic, never blaming the user or the site. It states what it *can* see, why it stopped, and the next move. This is a brand moment.

### The "I can't tell which button" moment → route to Execute
On unlabelled/ambiguous candidates for a destructive intent (REQ-SCAN-3), **never guess.** Surface the ambiguity, list candidates with whatever is known (position, icon guess, nearby text), state plainly it can't disambiguate, and hand off to **Execute** (one tap, carries context, still gated if destructive) — never silently drop the user's original intent.

### Prompt-injection resistance made visible (REQ-SAFE-8) — a structural guarantee, not a detection claim
REQ-SAFE-8 is *structural*: PageAgent never treats page content as instructions, and autonomy comes only from the user. It is **not** a promise to reliably *detect* injected instructions (detection is inherently unreliable). So the surfaced protection leads with the guarantee, not with a catch. The transcript visually walls off three things so they can never be confused: **(1) what the user asked**, **(2) what the page contains** (quoted, inert, "read-only material," styled so it can never read as a command or an agent action), **(3) what PageAgent decided and did.** Every proposed Action carries user-provenance; any action not traceable to a user turn does not run. Any "this looked like an instruction" line the UI shows is best-effort and non-exhaustive — never framed as "I caught it and ignored it."

### Interruptibility (REQ-AGENT-5, REQ-SAFEN-2)
Whenever the Intent-loop acts, a **persistent, always-reachable Stop** is part of the panel chrome — not buried, visually distinct from Send. **Escape stops** (keyboard-first). Stop is immediate and leaves the page in a known state as far as possible (REQ-SAFE-5). PageAgent must never be in a state where the user cannot stop it — essential for the ops persona mid-incident.

### Confirm-gate placement & semantics (reconciled)
The gate is an **inline card in the Chat transcript** (and a wrapper over an Execute Run) — *not* a separate screen and *not* a panel-hijacking modal habit that trains dismissal. It stays in context so the preview sits adjacent to the intent that produced it and lands in the traceable transcript. **But it is programmatically a focus-trapped `role="alertdialog"` / `aria-modal` region:** it captures focus, blocks further loop progress until resolved, announces its preview assertively, and returns focus to the triggering context on close. Visually inline, behaviorally modal — this satisfies both "don't train modal-swatting" and "AT must treat it as the hard interruption it is." Tier 2 escalates the treatment (heavier weight, value re-acknowledgment) within the same panel.

### Per-site trust (LATER) — with a hard floor that can't be configured away
- Trust is **per Action-class + per-site**, never blanket "trust everything here." Granting it is a deliberate, informed, revocable act, shown in the **Profile**, re-confirmed on meaningful page change.
- **Hard floor (recommendation, pending owner sign-off — §13):** the Tier-2 hard-stop class — pay/send money, delete account, sign out, irreversible send — can **never** be silenced by any trust setting. A configurable floor is not a floor. Per-site trust may relax only the reversible-ish middle.

---

## 9. Accessibility requirements (flagship)

PageAgent is a tool *for* accessibility, so it must be exemplary, not merely conformant. **WCAG 2.2 AA is a hard floor on every MVP surface** (Chat, Tools, Execute, Scan/Gen; Profiles when it lands — REQ-A11Y-1), with named AAA reaches **binding** because PageAgent owns its entire palette and DOM.

**Two product-specific truths drive the work:**
1. **The panel is the only window onto the page.** A blind SR user cannot see what happened when PageAgent clicked. The report-back must describe the *observed page-state change*, not just the attempt: "Marketing-emails toggle is now off; the page shows 'Preferences saved.'" — fusing REQ-CHAT-3 with REQ-REL-4/REQ-REL-1. A silent success is indistinguishable from a silent failure.
2. **SR and voice habits amplify over-trust (R9).** SR users press Enter; voice users say "yes" reflexively. The Confirm-gate focus model must make neither reflex able to approve a destructive Action.

**The numbers that bind the palette (§10):**
- **Body/label text 7:1 (WCAG 1.4.6 AAA).** **Large text 4.5:1** — the enhanced-contrast large-text floor under 1.4.6 AAA (**not** 3:1, which is the AA/1.4.3 figure). **Non-text UI components and state indicators ≥3:1 (1.4.11)** — that 3:1 governs non-text only, and never applies to text of any size. 4.5:1 is a *fallback ceiling for a flagged exception* on body text, never a goal — any surface where a needed color can't reach 7:1 for body text is flagged for review, not silently dropped.
- **Target size 44×44 CSS px (2.5.5 AAA)** as the floor — NOT the AA 24px minimum. Binds button/toggle/list-row sizing.
- **Focus appearance:** meet 2.4.11 (Focus Not Obscured), reach 2.4.13 — ≥2px indicator, ≥3:1 against both the control and adjacent background, never suppressed, driven by `:focus-visible`.
- **No meaning by color alone (1.4.1):** destructive Tools, cloud-fallback badges, error/uncertainty states carry icon + text label, not just red/amber.
- **Forced-colors / Windows High Contrast** renders the full panel and the Confirm-gate legibly; honor `forced-colors` and `prefers-contrast`; no meaning via background images or CSS-only shapes.
- **Reflow & zoom (1.4.10, 1.4.4):** zero horizontal scroll at 200% zoom and large OS text; relative units (rem/ch), never fixed-px text containers.
- **No timing on decisions (2.2.1):** the Confirm-gate must never auto-dismiss or count down.

**Keyboard model:**
- **Summon & focus:** a global `chrome.commands` shortcut opens the panel *and* moves focus into it (motor users can't be required to land a click on the toolbar action). The default binding is an open owner decision (§13); the capability is not.
- **Home base = the Chat input** — on open and after the Agent hands back (REQ-AGENT-5), focus returns predictably there; a documented key returns to it from anywhere.
- **Landmarks & linear order:** header → tablist (Chat / Tools / Scan) → active surface → Chat input; skip-to-input affordance.
- **Tools list uses roving `tabindex` + arrow-key navigation — one tab stop, not 50–100.** Enter/Space runs the focused Tool via Execute.
- **Stop is always keyboard-reachable** (Escape + persistent visible control). Focus is never trapped anywhere the user can't cancel the Agent.

**Confirm-gate focus (safety-critical):** focus-trapped `alertdialog`; **initial focus on Cancel or the non-actionable preview text, NEVER on Approve;** the specific truthful preview announced **assertively** before any control is reachable; Approve and Cancel distinct, labeled, 44×44+; Approve weighted as the deliberate, secondary action. For Tier 2, the value re-acknowledgment (§8) is a **comprehension act operable by keyboard, switch, and SR** — never a timed or sustained gesture.

**Screen-reader semantics & live-region posture:**
- Chat transcript = `role="log"`, `aria-live="polite"`; announce **complete messages, never token-by-token** (streaming into a live region makes SRs stutter and re-read — explicit anti-pattern).
- **Announcement altitude:** summarize the loop's internal micro-steps, don't narrate each; announce meaningful transitions politely ("Scanning… 42 tools found"; "Done — marketing emails are off"); reserve **assertive** for the Confirm-gate, errors, and fail-safe outcomes. Neither spam every step nor go silent (silence reads as a hang).
- Scanning/executing uses `role="status"` with a visible *and* SR-exposed working indicator — not a bare spinner.
- Tools' accessible names = their plain-language name + description + a spoken destructive flag ("marked destructive — will ask before running"); unnameable controls presented honestly to AT too ("Unlabeled button 1 of 3, near the trash icon — no accessible name found") with the accessible Execute-one-at-a-time fallback. PageAgent leaning on the page's own accessible names/roles/labels to name Tools (REQ-A11Y-3) means better-labeled pages yield clearer Tools — and honest gaps where they don't.

**Reduced motion:** honor `prefers-reduced-motion`; the thinking/executing indicator, message entrance, and surface transitions all have a static equivalent that still conveys "working" via text/state. No meaning carried only by animation; no bouncing dots as the sole progress signal.

**Voice hooks (LATER, clearly labeled):** push-to-talk preferred over open mic, fully keyboard/switch-operable, recording state visible *and* SR-announced; voice-out interruptible and always mirrored in the transcript (REQ-VOICE-5); the **spoken Confirm-gate is not a bypass** — the preview is read aloud, destructive approval needs an unambiguous deliberate confirmation (a bare "yes" is insufficient for money/delete/send, keep a non-voice path, REQ-VOICE-4); **cloud-STT disclosed before first use** with a persistent visible + SR-announced **audio-egress marker** (§4/§8) whenever audio leaves the device (REQ-VOICE-3, REQ-PRIV-3).

---

## 10. Visual / art direction — "Local Instrument"

**Concept.** A small, private instrument that comes on *inside your own machine* to help you operate the Page in front of you. Drawn from what the product actually is: **on-device silicon** (the calm resting glow of a device working locally, not a network), **the browser viewport** (a framed live Page you operate), and **the workbench / parts-catalogue** (messy DOM controls read, labelled, and racked as inspectable **Tool**s). Posture: *calm precision* — an instrument panel, not a chat toy; a workbench, not a devtools JSON dump. **Identity is name-agnostic** — anchored on a mark and palette, not a wordmark — so a rename to Sesame / PagePilot / Handle / Converse is a glyph/string swap.

### Palette — both themes designed with equal care
Neutrals are a chosen **"Graphite-Verdigris" ramp** — cool graphite carrying a faint teal-green undertone biased toward the accent — deliberately *not* pure mid-grey and *not* the warm-cream AI cluster.

**Core — Light**
- `--bg` Mist `#E9EFED` · `--surface` Paper `#F8FBFA` · `--ink` Substrate `#0D1A18`
- `--muted` Graphite `#47605A` · `--line` Hairline `#CBD8D4`
- `--brand` Halide `#0F9C8E` (small text / links use `--brand-ink` `#0A756B` to satisfy the 7:1 body-text bar; Halide itself is for fills, large elements, focus rings at ≥3:1)

**Core — Dark** (the instrument at rest, signal glowing gently — *not* neon-on-black)
- `--bg` Substrate `#0B1614` · `--surface` Panel `#12211E` · `--ink` `#E7F0ED`
- `--muted` `#8CA59F` · `--line` `#26403A`
- `--brand` Halide `#33CFBD` (dim `#1E9C90`). Unlike Light — where plain Halide clears only ≥3:1 and small text/links must fall back to `--brand-ink` — **dark Halide `#33CFBD` clears the 7:1 body bar on both dark backgrounds** (≈8.5:1 on Panel `#12211E`, higher on Substrate `#0B1614`), so it doubles as the small-text/link color directly with no separate carve-out. Annotate the exact measured ratios against `--surface` and `--bg` in the deliverable so the 7:1 bar is verifiable in *both* themes.

### Warm secondary — "Filament" (the hand-catalogued Tools surface + the tint behind mono tool tokens): light `#9C7E4E` / tint `#ECE3CF`; dark `#CBA870` / tint `#241E14`. Desaturated and **role-restricted** so it never collides with caution-amber and is never used for status. The cool **Halide** (live compute / signal) vs warm **Filament** (hand-made, inspectable Tools) duality maps directly onto the product.

### Three separate color jobs — never blur them
1. **Brand accent (Halide teal)** — identity/signal only. Deliberately outside the safety trio, and deliberately **NOT sky-blue** (which would collapse the on-device-vs-cloud distinction). Never used for success/safe status.
2. **Semantic safety trio** — **Safe / Verdant** `#1E874A` (dark `#46C07E`) · **Caution / Amber** `#B5730A` (dark `#E4A63A`) · **Destructive / Halt** `#B03A2E` (dark `#E5645A`), an earthy brick red — *serious, not alarmist neon*. Each ships a background tint. Halt is reserved for Tier 2.
3. **Processing-locus states** — On-device is the calm default, rendered as **quiet, dormant instrumentation** (solid filled surfaces, a faint Halide signal, the "Local node" mark) — *not* an affirmative "you're protected" badge; emphatic treatment is reserved for the truthful transitions and active processing. Off-device is a distinct material: cool desaturated **"Offshore" slate-blue** `#4E6E8C` (dark `#7B99B8`). *Validate teal-brand vs. Verdant-safe separation, and Offshore vs. both, under protanopia/deuteranopia simulation; tune to hit AA (AAA for body where reachable) in both themes (§13).*

### On-device vs. leaves-device — a distinct visual language, coded redundantly
This distinction is the whole point and must survive color-blindness and greyscale — so **never hue alone**:
- **On-device / private / yours** — calm default: solid filled surfaces, a faint Halide signal, a persistent **"Local node" mark** in the header (a filled dot inside a rounded square = *your chip / your machine* — **avoid the literal padlock/shield/lock**), no warning affordance at all. It reads as **instrumentation at rest, not reassurance.** Copy: "On your device."
- **Leaves-device** (cloud fallback, cloud-STT) — a different *material*: Offshore slate-blue, **dashed/ticked borders**, an explicit **outbound-aperture glyph**, a mandatory inline label **shown before use** ("This leaves your device"), and the one place motion travels *out of the frame*. Crossing the threshold must feel deliberate — never silently themed like local. For the **mixed voice turn** (reasoning local, audio off for STT), this same leaves-device material attaches to a distinct **audio-egress marker** that stays lit and **suppresses the private resting affordance for as long as audio is leaving** — even though reasoning is still local — and the label names *what* left ("audio sent for transcription; reasoning stayed on your device"). Whether the indicator carries a compound (reasoning-locus + audio-egress) signal or shows the most-exposed path with a "what left" label is an owner decision (§13).

### Making Tools feel inspectable & open (wedge #3)
Render **Tool**s as **spec-cards on a rail**, not a JSON blob:
- Mono **tool identifier** as headline (`click_rerun_failed_jobs`) — reads like a real part number.
- Plain-language description in body type; a small **Action-type glyph** (click / type / choose / follow-link) so the atomic Action taxonomy is scannable.
- A **provenance line** ("from: button 'Re-run failed jobs'") — the trust move — plus the source badge (site-declared vs DOM-manufactured).
- **Hover/focus highlights the source element in the live Page.**
- **Progressive disclosure:** selector / DOM detail expands for the developer without dumping internals on everyone.
- Corners modest (~6px), hairline borders, a functional **left-edge tick keyed to Action-type** — explicitly *not* the decorative accent-bar-on-rounded-card cliché.

### Typography — engineered, legibility-first, inlined (no CDN; REQ-PERF)
- **Display (sparse — empty states, banners, onboarding):** **Hanken Grotesk** (Semibold/Bold) — characterful humanist grotesque; deliberately *not* Inter or Space Grotesk.
- **Body / UI:** **IBM Plex Sans** — engineered/humanist "designed by an engineer" DNA, open apertures, disambiguated I/l/1/0.
- **Mono / tool identifiers, scan output, selectors:** **IBM Plex Mono** — mechanical letterforms make manufactured **Tool**s read as real packaged parts; slashed zero on.
- **"Hyperlegible mode" (accessibility setting, flagship persona):** swaps body to **Atkinson Hyperlegible Next** at larger sizes and looser spacing — accessibility as a designed, switchable posture. (Open: Atkinson as *default* vs. opt-in, weighed against the inlined side-panel payload — §13.)
- All faces OFL, **inlined as subsetted woff2** with a tight weight set to keep the side-panel payload lean.

### Iconography
Line icons, consistent ~1.75px stroke, slightly squared joints (engineered, not pill-soft), 24px grid, echoing a small node/terminal-dot motif. **No emoji** and no generic rounded-SaaS set. A dedicated set of **state glyphs** carries meaning: the Local node, the leaves-device outbound aperture, the Confirm-gate checkpoint.

### Motion posture — restrained, meaningful; it lives on every page, quietly
- **Scan:** a thin Halide read-line sweeps a wireframe of the detected Page, resolving controls into **Tool**s one by one — honest progress that *stops*, not a spinner.
- **Execute:** one decisive "actuation" (120–160ms firm ease, no bounce) + a single provenance pulse on the live element — one atomic Action happened.
- **Confirm-gate:** motion deliberately *slows*; Tier 2 carries distinct heavier weight (expressive weight only — never a timer or disabled-then-enabled control; §8).
- **Report-back:** a calm settle, checklisted — and *equally calm when it failed or was unsure*.
- **Locus flip to Off-device:** the one place the strongest, out-of-frame motion is reserved.
- No celebratory confetti / bouncy success. All motion honors `prefers-reduced-motion` with a meaning-preserving reduced fallback; avoid attention-grabbing idle animation (battery/perf, REQ-PERF).

### Layout
Left-aligned, clear reading order (never centered-everything), 44px+ targets, Halide `:focus-visible` rings. Instrument-panel single column per §6.

### Explicit anti-cliché notes (do not produce these)
Warm cream `#F4F1EA` + serif display + terracotta; near-black canvas with a lone acid-green/vermilion pop; purple-to-blue gradient hero (or any gradient hero / orb); Inter or Space Grotesk as the "safe" face; emoji as section markers or status; everything centered; blanket `rounded-lg` + decorative accent-bar-on-rounded-card; broadsheet hairline rules used decoratively; sky-blue as the brand; the brand teal used for success/safe; raw JSON/devtools dump for Tools; sparkle/✨ motifs; anthropomorphic avatar; remote-model "typing…" dots.

---

## 11. Voice & copy guidelines

Copy is the safety layer users read before approving an Action in a logged-in bank/health/CI session. The register, tense, and structure below are normative.

### Voice: the steady operator
A skilled operator narrating over your shoulder — cockpit callout-and-confirm, not chirpy copilot-buddy. Calm, plain, candid. A *tool reporting*, not a persona performing.
1. **The user is the only authority.** "you asked"; first-person singular **"I"** for the agent-as-instrument; never "we," never a coaxing "let's" (reinforces REQ-SAFE-8).
2. **Past tense, concrete nouns**, quoting the page's own labels/values: "I turned off **'Marketing emails'** and clicked **Save**." Never a vague summary (REQ-SAFE-2, REQ-CHAT-3).
3. **Limitation first.** When there's a caveat, it leads: "I couldn't find…", "I'm not sure which…", "I didn't act because…".

### The certainty ladder (the load-bearing report-back pattern, REQ-REL-4/REQ-CHAT-3)
Distinguish what was *verified* from what was merely *sent*. "successfully" is banned as a reflex — only "Done" is earned, and only when observed.

| Rung | When | Voice |
|---|---|---|
| **Done** | sent *and* expected page change observed | "Done — I turned off 'Marketing emails' and the page now shows 'Preferences saved.'" |
| **Sent, unconfirmed** | sent, effect not verifiable | "I clicked **'Re-run failed jobs.'** I can't confirm the page reacted — check the run status." |
| **Couldn't** | attempted and failed, or target absent | "I couldn't set a 'posted this week' filter — there's no such control on this page, so I left dates unset." |
| **Didn't** | chose not to act (fail-safe) | "I didn't do anything. Deleting can't be undone and I couldn't tell which button deletes, so I won't guess." |

### Message anatomy (screen-reader-first)
One headline clause (what happened) → optional specifics → optional next step, each a self-contained sentence. No "see above," no "click here," no meaning by color/position alone — the *word* carries safe/caution/destructive.

### Presenting a Tool: human label vs. inspectable identifier
- **Default (Chat, Tools, Execute):** plain label **"Rerun failed jobs,"** Action-type badge (**Click / Type / Choose / Follow link**), provenance line in the page's words.
- **On inspect (Scan / Gen):** raw `click_rerun_failed_jobs` in mono + derivation ("From DOM · button · accessible name 'Re-run failed jobs'") + origin badge **Manufactured from DOM** vs. **Declared by site (WebMCP)** (REQ-SCAN-6).
- **Unnameable controls:** never invent a label — "Unnamed control (icon only), near text 'Drafts'" (REQ-SCAN-3).

### Reference microcopy
**First-run / empty (Chat)** — three honest beats (what it does; private/on-device; best at one clear thing):
> **Tell this page what you want.**
> It reads the buttons, links, and fields on the page you're on and lets you ask for them in plain language. It runs on your device — this page and what you ask stay here.
> Best at one clear thing at a time: *"turn off marketing emails," "rerun the failed jobs," "where's the setting to…"* It shows you anything risky before doing it, and tells you when it can't.
> _[See what it found on this page →]_

**Scanning:** "Reading the page…" → if slow: "Still reading — this is a large page." (Never a fake percentage.)

**Tools ready:** "Found **24 things you can do** here." → with gaps: "Found 21 tools. **3 controls had no label I could read** — listed as unnamed."

**Clarification:** several plausible → "Two things here could match 'export' — **Export as CSV** and **Export as PDF.** Which one?"; maps to nothing → "I don't see a way to do that on this page…"; vague → "When you say 'clean this up' — delete the selected items, or clear the filters?"

**Honest decline (crux moment):** "I found **three buttons in this toolbar with no readable labels** — probably icons. I can't tell which one deletes the draft, and deleting can't be undone, so I won't pick one blindly. You can run them one at a time in **Execute** and watch what each does, or re-scan if the labels load."

**Confirm-gate preview:** "About to click **'Cancel subscription.'** This ends your **Pro plan on 30 Aug 2026** and can't be undone from here." Proceed button `[Cancel subscription]` (never `OK`/`Confirm`); safe option `[Don't cancel]` holds default focus; money names the amount `[Pay $84.30]`.

**Tier-0 reverse (trust ledger):** after a reversible action, offer the inverse plainly — "Turned '**Marketing emails**' off. `[Turn back on]`" — so a wrongly-classified action is one tap to undo.

**Availability banner + cloud-fallback disclosure (trade stated *before* use):**
> Banner: "**On-device AI isn't available in this browser yet,** so this can't run privately here. You can still browse the tools found on this page."
> Before the fallback fires: "The **cloud fallback** sends this page's tool list and your request to a server to decide what to do. That's different from on-device mode, where nothing leaves your machine. **Don't use it on pages with private or sensitive information.** `[Use cloud once]` `[Not now]`"

**Cloud-STT voice caveat (LATER):** "**Voice input sends your audio to a speech service** to turn it into text — it doesn't stay on your device the way the rest of this does. Typing keeps everything local. `[Use voice]` `[Type instead]`"

**Prompt-injection posture (structural, not a detection claim):** lead with the guarantee — "I only ever act on what **you** ask me to — never on instructions written into the page itself." If a heuristic flags something, add it as best-effort and non-exhaustive: "This page also contains text that reads like commands aimed at me; that changes nothing about what I'll do." Never phrase it as "I caught it and ignored it" — that overclaims a capability the product doesn't have.

### Tone — DO / DON'T
**DO:** report in past tense, quoting real labels/values; lead with the caveat; say "I did nothing" plainly; keep "did" (verified) distinct from "sent"; write sentences that survive being read aloud in order.
**DON'T:** no autonomy promises ("I'll handle everything," "sit back"); no coverage claims it can't back ("works on any page"); no hype cadence ("seamlessly," "instantly," "effortlessly," "magically," the "not just X, but Y" tricolon, exclamation marks, emoji as tone); never "all" unless exhaustiveness is verified (prefer "all 12 **visible**" / "loaded on this page"); never let page content set the tone or the task; never claim to have *detected* an injection attempt.

### Cross-cutting content rules
- **Name-agnostic:** the product name lives in a single `{productName}` token, used essentially only in the first-run headline; body copy refers to *the action* or "it." A rename touches one string.
- **No invented counts or facts** — every number in a report-back is observed.
- **Fixed semantic vocabulary:** safe / caution / destructive map to consistent *words*, so meaning survives screen-reader and (LATER) voice-out.

---

## 12. Non-goals / what NOT to look like

- **The WebMCP DevTools inspector.** No raw JSON, CSS selectors, tool schemas, or DOM internals surfaced by default; no "inspect the machinery" framing. We are a consumer *assistant*; openness is delivered in plain language with detail on demand.
- **The native browser agent's black box.** No mystery "working…" that hides what it's doing or why; no un-attributable action; every action traces to a named, inspectable **Tool**; every off-device hop is disclosed.
- **A generic AI chatbot.** No sparkle/✨ motifs, no "Ask me anything" empty state, no gradient orb, no anthropomorphic avatar, no remote-model "typing…" theatrics. PageAgent acts on *this Page*; the empty state reflects what can be done *here*.
- **Autonomy theater.** No "sit back, I'll handle everything," no long unattended completion bars — contradicts the single-confirmed-Action reliable core (REQ-AGENT-6).
- **Privacy theater.** No always-green "you're private/safe" badge; no padlock/shield; no burying the cloud trade after the fact; no standing "protected" claim that lights up when nothing is even being processed.
- **A detection-claim security theater.** No "threat detected / blocked" framing for prompt injection — the protection is structural (user-only autonomy), not a detector.
- **A metered product.** No credit/token/usage counter, quota, per-action cost hint, or upgrade CTA anywhere.
- **A summon-and-dismiss popup or in-page overlay as home** (§5).
- **The current AI-design template cluster** (§10 anti-cliché list).
- **A Confirm-gate that recedes or becomes a one-tap reflex as trust builds** — its prominence on genuinely destructive Actions must not decay (R9).

---

## 13. Open design decisions for the human owner

These are unresolved and must not be silently closed by the design step. They are surfaced separately in this deliverable's decision list. Items D1–D7 were surfaced by this brief's own analysis; D8–D14 are owner-level product/policy calls (from `docs/06-risks-and-open-questions.md`) where the brief takes a **working position** so the design step can proceed — each is a recommendation pending owner sign-off, *not* a closed decision.

**Design decisions surfaced by this brief**
1. **Side-panel width.** The ~320–400px column vs. the Tools list (with source + risk badges), the truthful Confirm-gate preview, and a dense 50–100-Tool page. Pressure-test at the narrow end before locking; this is the trigger to revisit the form factor (§5, §14).
2. **Non-sighted Confirm-gate anchor.** What is the verifiable equivalent of the sighted "locate-on-page highlight" for a blind SR user, given locate-and-highlight is a load-bearing confidence signal (§8)?
3. **Color-blind / greyscale validation of the palette.** Halide-brand vs. Verdant-safe, and Offshore vs. both, under protanopia/deuteranopia and greyscale; tune to AA (AAA for body where reachable) in both themes (§10).
4. **Atkinson Hyperlegible: default vs. opt-in.** Weigh the flagship-persona benefit of default-on against the inlined side-panel font payload (§10).
5. **Default global summon keybinding.** The open-and-focus capability is settled; the specific default binding is not (§9).
6. **Processing-locus semantics for mixed turns.** For the LATER voice path (reasoning on-device, audio off-device for STT): a **compound** signal (reasoning-locus + always-on audio-egress marker) vs. **most-exposed-path with a "what left" label.** Either must suppress the private resting affordance whenever audio leaves (§4, §10).
7. **Residual risk of mis-classified Tier-0 reversibility.** The confidence bar + conservative bias on high-stakes origins + one-tap reverse mitigate a *confidently wrong* reversibility call but don't eliminate it (undo history is LATER). Owner sets the acceptable posture and threshold (§8).

**Owner-level policy calls (brief's working position noted; ratification required)**
8. **Consent & auto-execution posture (R10).** What does the user consent to, and when — per site / per session / per action-class / once globally — and does it differ for read-only vs. state-changing actions? *Working position:* Tier-0 reversible actions execute without a gate; a scan-time micro-disclosure covers "what I read here," and per-site trust (LATER) is the durable consent surface. Ratify the model and how "PageAgent may read and act on this page" is surfaced.
9. **What defines "destructive / hard-to-undo," and who decides** — heuristics, the user, per-site settings, or a mix? *Working position:* the reversibility ladder (§8) plus the reversibility-confidence bar. Ratify.
10. **Whether a hard-stop list exists, and its membership.** *Working position (recommendation):* the Tier-2 class — pay/send money, delete account, sign out, irreversible send — can never be silenced by any trust setting (§8). Ratify the list and the un-configurable floor.
11. **Low-confidence-scan behavior** — degrade, warn, or decline to offer tools it isn't sure about? *Working position:* list tools honestly with confidence signals, but decline to *act* on ambiguous destructive candidates and route to Execute (§8, §11). Ratify the threshold and posture.
12. **Stance on sites that forbid / resist automation (R8).** Proceed as user-agent, warn, or refrain; per-site configurable? Where is the product's own line between assistive operation and disallowed automation, and how is it communicated? *Not resolved by this brief* — needs an owner decision that will shape onboarding and per-site copy.
13. **Which persona wins when needs conflict (R6 open question).** The brief names the **accessibility user** as the lead persona whose needs govern conflicts (§3). Confirm this ordering, since it drives many trade-offs (target sizes, motion, live-region altitude).
14. **Form-factor home and IA (§5–6).** The brief takes the Chrome side-panel home and the five-surface IA as the committed build target. Ratify as the committed direction (the width caveat in D1 is the one dimension explicitly left open).

*Program-level owner questions in `docs/06` that bound the design's honesty claims but are not design decisions — MVP target sites (R1), the stated reliability boundary, the "safe track record" threshold, what is retained locally, and how accessibility impact is measured — are noted here so the design step does not assume answers to them.*

---

## 14. Suggested deliverables for the design step

**Artifacts (each in light AND dark; annotate contrast and target-size compliance):**
1. **Side-panel shell** with the persistent header (Page identity + freshness + processing-locus indicator), tab bar, and context-pinned footer — the reusable frame every other screen sits in.
2. **The processing-locus indicator** in all three states (with the quiet-dormant resting treatment, *not* an affirmative "protected" claim) + the On-device→Off-device transition, plus the compound reasoning-locus + audio-egress treatment for the LATER voice mixed turn — the product's most important non-chat element.
3. **Chat hero** in its key states: empty/page-aware; mid Intent-loop (acting + Stop, with the reduced-motion static variant); and the certainty-ladder report-backs (Done / Sent-unconfirmed / Couldn't / Didn't).
4. **The three signature scenarios** as full Chat flows: "rerun the failed jobs" (CI/ops), "turn off all marketing emails" (Tier 0 + observed result + one-tap reverse in the ledger), "where do I turn off two-factor?" (read-only wayfinding).
5. **Confirm-gate: Tier 1 ("Cancel subscription") and Tier 2 ("Pay $500" / "Sign out of Chase")** — inline-in-transcript, verifiable preview, safe-default focus, verb-restating buttons, Tier-2 value re-acknowledgment (keyboard/switch/SR-operable, no timed gesture); plus the unsure-posture variant and the forced-colors rendering.
6. **The crux honesty moment** (icon-only toolbar → route to Execute) and the general fail-safe/honest-decline state.
7. **Tools surface** on a sparse page and a dense 50–100+ page (search/filter), with spec-cards showing Action-type badge, source badge, risk badge, Run affordance, and the one-tap details expansion; plus the mixed-provenance fusion view.
8. **Execute single-Tool run** including a value field routing through the Confirm-gate.
9. **Scan / Gen** scan-in-progress (Halide read-line), result summary with coverage caveats, element→Tool inspection, and scan-failed states.
10. **Availability banner + cloud-fallback opt-in** in the Offshore treatment; the transcript provenance / prompt-injection treatment (structural guarantee, not a detection claim).
11. **Accessibility specimen sheet:** `:focus-visible` across all control types on light/dark/forced-colors; the roving-tabindex Tools list; a screen-reader-optimized report-back annotated with live-region roles/altitude.
12. **LATER states, clearly watermarked:** Voice mic + cloud-STT caveat + audio-egress marker + spoken Confirm-gate; Profiles with the un-silenceable hard-stop floor.

**Foundations to deliver alongside the screens:**
- The full **palette** (both themes) as tokens, with the three separate color jobs (brand / semantic safety / locus) documented, the light `--brand-ink` and dark `--brand` small-text/link ratios both annotated against 7:1, and color-blind-simulation results attached.
- The **type system** (Hanken Grotesk / IBM Plex Sans / IBM Plex Mono + Atkinson Hyperlegible mode) as inlined subsetted woff2, with the lean weight set noted for the side-panel payload budget (REQ-PERF).
- The **state-glyph icon set** (Local node, outbound aperture, Confirm-gate checkpoint, Action-type ticks).
- The **motion spec** (scan sweep, execute actuation, gate settle, locus flip) with reduced-motion equivalents.

**Side-panel width / responsive note (must be honored in every artifact):** design to a **~320–400px** column. Prove that the Tools list (with source + risk badges), the truthful Confirm-gate preview, and the dense 50–100-Tool page all remain legible at the narrow end. Everything reflows with **zero horizontal scroll at 200% zoom and large OS text**; use relative units, never fixed-px text containers. If the narrow column genuinely cannot carry the Confirm-gate preview and dense Tools legibly, that is the trigger to revisit the form factor (§5, §13-D1) — flag it rather than shrinking type below the accessibility floor.
