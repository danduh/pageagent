# PageAgent — Users & Use-Cases

**Purpose:** Define who PageAgent is for and what jobs they hire it to do, through concrete personas and narrated scenarios — honest about what works reliably today versus what is aspirational.

See also: `00-brief.md` (thesis and positioning), `01-product-definition.md` (surfaces, glossary, MVP boundary).

---

## How to read this doc

Every scenario below is anchored to the frozen glossary: a **Scan** discovers actionable elements on the **Page**; each is packaged as a **Tool** (one tool = one **Action**); the **Agent / Intent-loop** picks and runs tools; a **Confirm-gate** intercepts destructive actions. Scenarios are tagged with a candid reliability read — **Reliable today**, **Works with caveats**, or **Aspirational (Later)** — because overselling the on-device agent is the fastest way to lose trust. The MVP boundary (typed Chat, single confirmed actions, confirm-gate, Tools/Execute/Scan-Gen surfaces, cloud fallback banner) versus Later features (voice, embeddings retrieval, Profiles, macros, `.well-known/mcp` fusion, multi-tab) is defined in `01-product-definition.md`; tags here point at that line.

---

## Target users (personas)

### 1. The accessibility user — operates the web by voice and chat

**Who:** Someone with a motor impairment (limited or no precise pointer control) or a vision impairment who relies on assistive tech. They already use screen readers, switch access, or voice control, and they hit walls daily on sites that were never built for those tools.

**Pain:** The web assumes a mouse and a sighted, dexterous user. Icon-only buttons with no label, custom widgets that screen readers can't parse, tiny click targets, and multi-step flows that are exhausting to traverse one tab-stop at a time. Existing OS voice control operates the *cursor* ("click the button at position X"), not the *intent* ("pay my electric bill").

**Job-to-be-done:** "Let me tell any website what I want in plain language and have it done, without me having to see the layout or land a precise click." This is PageAgent's flagship impact: intent-level operation of arbitrary sites, not pixel-level operation of a pointer.

**Honest note:** Voice input is a **Later** capability, and STT in Chrome today is cloud-backed (audio leaves the device) — a real caveat for a privacy-led product that must be disclosed to this user, not buried. Typed chat serves this persona in the MVP; voice is the flagship that follows.

---

### 2. The power user — automates repetitive web chores

**Who:** A heavy web user who does the same fiddly sequences over and over — reconciling expenses, triaging a queue, filling the same forms across similar sites, bulk-actioning items in an admin console.

**Pain:** These flows are too bespoke for a dedicated tool and too frequent to enjoy doing by hand. Browser macro recorders break the moment the DOM shifts; RPA tools are heavyweight and IT-gated.

**Job-to-be-done:** "Let me describe the chore once and have the agent carry it out on the live page, and eventually let me save and replay the good ones." Single confirmed actions serve them now; recorded macros / replayable flows are the **Later** payoff.

---

### 3. The ops / on-call engineer — drives dashboards and consoles

**Who:** An SRE, DevOps, or platform engineer living in CI/CD dashboards, cloud consoles, and internal admin tools — often mid-incident, often on a phone or a cramped laptop.

**Pain:** Consoles bury the one button that matters (rerun failed jobs, scale a service, acknowledge an alert) under dense, deeply nested UI. During an incident, hunting for it costs minutes that matter. These are authenticated, high-privilege sessions — exactly the sessions you cannot hand to a cloud agent.

**Job-to-be-done:** "On this dashboard I'm already logged into, let me say 'rerun the failed jobs in this pipeline' and have it happen — locally, without shipping my authenticated session anywhere." This persona is the sharpest proof of the on-device thesis: the value *is* that the page and the session never leave the machine.

---

### 4. The everyday non-technical user — just wants the outcome

**Who:** A mainstream user who finds most websites mildly hostile — cookie walls, buried settings, confusing checkout flows, unsubscribe links hidden three menus deep.

**Pain:** They know *what* they want ("turn off marketing emails", "change my delivery address", "find the cancel button") but not *where* the site put it. They give up, or they call support.

**Job-to-be-done:** "Tell me the outcome I want and get me there, on whatever site I'm on." The win is turning "where is that setting?" into a sentence. Reliability on messy consumer sites is the honest risk here (see Risks); PageAgent must degrade gracefully — offer the tool it *did* find, not pretend it found the one it didn't.

---

### 5. The developer / builder — probes and adopts the agentic web (secondary)

**Who:** A web developer curious about WebMCP, or one who is adding real `document.modelContext` tools to their own site and wants to see how an agent consumes them.

**Pain:** WebMCP has a chicken-and-egg problem — almost no sites expose tools, so there's nothing to test an agent against, so no one builds tools. Devtool-flavored inspectors exist (the reference "WebMCP DevTools" extension) but they're built for tinkering, not for showing a consumer-grade assistant experience.

**Job-to-be-done:** "Let me see what tools my page exposes (or would expose if scanned), drive them from a chat, and confirm the agent picks the right ones." This persona validates the **`.well-known/mcp` fusion** direction: PageAgent prefers a site's *real* tools when present and falls back to DOM-scan when not, so a developer's investment in real tools is immediately rewarded. Secondary because PageAgent is positioned as a mainstream assistant, not a devtool — but this user is the bridge to the native agentic web arriving.

---

## Use-case scenarios

Each scenario: **user says X on page Y → agent does Z**, with a reliability read.

### UC-1 — Rerun failed CI jobs (ops; the signature demo) · *Works with caveats*
On an Azure DevOps pipeline run page they're already authenticated into, the engineer types: *"Rerun the failed jobs."* Scan has already turned the page's controls into tools (`click_rerun_failed_jobs`, `click_cancel_run`, `view_logs_stage_2`, …). The intent-loop maps the request to `click_rerun_failed_jobs` and executes the click on the live page, then reports "Rerun triggered." Works well when the button exists and is labeled; the caveat is that "rerun failed" is sometimes a menu-behind-a-menu, which pushes it toward the multi-step reliability problem (see UC-8). The point it proves: this ran against a logged-in, high-privilege console with nothing leaving the machine.

### UC-2 — Unsubscribe from marketing email (everyday) · *Reliable today*
On an account-settings page, the user types: *"Turn off all marketing emails."* Scan found several toggles and a save button. The agent identifies the marketing/promotional toggle, flips it, clicks save, and confirms. A clean single-action-plus-save case — the sweet spot for on-device intent→tool routing when the controls are clearly labeled.

### UC-3 — Fill and submit a search (power / everyday) · *Reliable today*
On a job board, the user types: *"Search for remote React roles posted this week."* Scan exposed `fill_search`, `select_date_filter`, `toggle_remote`, `click_search`. The agent fills the query, sets the remote filter and date filter, and clicks search. Filling inputs and choosing from selects are among the most reliable actions; the risk is only that a filter the user asked for doesn't exist as a control — in which case the honest behavior is to do what it can and say what it couldn't.

### UC-4 — Cancel a subscription — destructive, motivates the Confirm-gate (everyday) · *Reliable today (by design)*
On a billing page, the user types: *"Cancel my subscription."* Scan tagged `click_cancel_subscription` as destructive/hard-to-undo. The agent does **not** just click. The **Confirm-gate** fires: PageAgent shows a preview — "About to click *Cancel subscription*. This ends your plan at the end of the billing period and may not be reversible." — and waits for explicit approval. Only on approval does it execute. This scenario exists to make the safety layer concrete: auto-executing in authenticated sessions is a live danger surface (sign-out, pay, delete, send), and the gate is the non-negotiable answer. The reliability here is *social*, not just technical: the win is that it refused to act blindly.

### UC-5 — Operate a site entirely by voice (accessibility flagship) · *Aspirational (Later)*
A user with limited hand mobility opens their utility provider's site and speaks: *"Pay the balance due on my account."* PageAgent transcribes (voice in), the agent maps to `click_pay_balance`, the Confirm-gate previews the payment amount and target aloud (voice out) — "Pay $84.30 to City Power, due July 30. Say yes to confirm." — and executes on approval. This is the transformative case: operating a site nobody designed for accessibility, by intent, hands-free. Tagged aspirational because voice is a **Later** feature and today's STT is cloud-backed (audio leaves the device — disclosed, not hidden) and there is no on-device AI TTS (SpeechSynthesis uses OS voices, quality varies). The confirm-gate matters doubly here, because a mis-heard command must never silently move money.

### UC-6 — "Where is the setting to…" wayfinding (everyday / accessibility) · *Reliable today*
On a dense settings page, the user types: *"Where do I turn off two-factor prompts on trusted devices?"* Rather than acting, the agent uses the tool list as a map and answers: "There's a control labeled *Trust this device for 30 days* under Security — want me to toggle it?" This is a read-only, guidance-first use of the same scan: turning "I can't find it" into a plain answer, with an optional action. Low-risk and high-value for both non-technical and vision-impaired users.

### UC-7 — Bulk queue triage (power user) · *Works with caveats*
In a support-ticket admin console, the user types: *"Assign all unassigned tickets in this view to me."* Scan exposed a per-row `assign_to_me` tool for each visible ticket. The agent iterates the visible rows, each as a single confirmed action, reporting progress. The caveat is real and instructive: the list is **virtualized** — rows off-screen don't exist in the DOM yet, so "all" honestly means "all currently rendered," and the agent must say so rather than imply completeness. This scenario previews both the DOM-reliability risk and why recorded macros (Later) need re-scanning between chunks.

### UC-8 — Multi-step checkout — exposes the re-scan challenge (power / everyday) · *Works with caveats*
On a shopping cart, the user types: *"Check out with my saved address and default card."* Step 1: agent clicks `proceed_to_checkout`. **The page navigates and re-renders** — the old tools are stale. PageAgent **re-scans**, finds `select_saved_address` and `select_default_card`, applies them, and reaches the final `place_order` button — which the Confirm-gate intercepts (destructive: spends money) for explicit approval. This is the honest centerpiece of the multi-step story: **tools must be re-scanned between steps because the DOM changes underneath the agent**, and Nano's long-horizon planning is weak, so PageAgent leans on short, re-checked, single-confirmed hops rather than one big autonomous plan. Long fully-autonomous chains are *not* reliable today; this stepwise, re-scanning, confirm-gated shape is what makes even a modest chain usable.

### UC-9 — Icon-only / unlabeled controls (any persona) · *Works with caveats — the crux*
On an app whose toolbar is nothing but icons (a gear, a trash can, a paper-plane), the user types: *"Delete this draft."* Scan has to infer meaning from sparse signals (aria-labels if present, tooltips, adjacent text, position). When labels exist, `click_delete_draft` is found and — being destructive — routed through the Confirm-gate. When they don't, PageAgent must be honest: "I found three unlabeled buttons here and can't tell which deletes — want to use **Execute** to run them one at a time?" This is the single hardest reliability case (icon-only, shadow DOM, canvas, dynamic re-render) and the product's honesty about it — offering the manual **Execute** surface rather than guessing on a destructive action — is the difference between trustworthy and dangerous.

### UC-10 — Manual single-tool run via Execute (power / developer) · *Reliable today*
The user opens the **Tools** surface, sees the generated tool list for the page, and runs `click_export_csv` directly from **Execute** — no chat, no intent-loop. This serves the power user who knows exactly which tool they want and the developer inspecting what scan produced. It's also the safety-valve for UC-9: when the agent is unsure, the human drives one tool at a time.

### UC-11 — Reuse a trusted tool-set on a familiar site (power / ops) · *Aspirational (Later)*
Returning to their CI dashboard, the user finds their previously saved **Profile** for that site already loaded — the same trusted tool-set, with per-site trust settings (e.g. "logs and reruns don't need a gate; cancel-run always does"). They type *"rerun failed jobs"* and it just works, fast, with their chosen safety posture. Tagged Later: **Profiles** (saved tool-sets + per-site trust/allowlist) are post-MVP. It shows where per-site trust replaces re-scanning-from-scratch and lets frequent users tune the confirm-gate to their own risk tolerance.

### UC-12 — Site with real WebMCP tools — fusion (developer) · *Aspirational (Later)*
A developer visits their own site, which now exposes real `document.modelContext` tools. PageAgent detects them and **prefers the site's real tools over DOM-scanned ones**, falling back to scan only for actions the site didn't expose. The developer types a request and watches the agent call the first-party tool. This is the **`.well-known/mcp` fusion** direction: PageAgent works on any page today by manufacturing tools, and gets *better and more reliable* as sites adopt WebMCP — turning the incumbent-risk and chicken-and-egg problems into a migration path rather than a threat.

---

## What works well vs. not yet (summary)

**Works well today:** single, clearly-labeled actions (click a named button, fill an input, choose from a select); read-only wayfinding over the scanned tool list; the confirm-gate on destructive actions; manual single-tool runs via Execute; typed chat intent→tool routing when tools are few and well-labeled.

**Works with caveats:** icon-only / unlabeled controls (inference is lossy — the crux risk); virtualized / infinite lists ("all" means "all rendered"); short multi-step flows that require re-scanning between steps because the DOM changes; many-similar-tools situations where Nano's routing accuracy degrades (the motivation for embeddings-based retrieval, Later).

**Not yet / aspirational (Later):** voice in/out (and today's cloud-backed STT caveat); long fully-autonomous multi-step chains; saved Profiles and per-site trust; recorded/replayable macros; `.well-known/mcp` fusion; cross-page / multi-tab tasks; undo beyond the confirm-gate.

The through-line: PageAgent is trustworthy precisely where it is honest — it does the reliable thing confidently, gates the dangerous thing, and *says so* when a page defeats it rather than guessing.
