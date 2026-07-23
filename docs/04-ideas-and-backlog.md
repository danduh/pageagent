# PageAgent — Ideas & Backlog

**Purpose:** A parking lot of future/optional ideas for PageAgent — a bank to draw from, not a committed plan. Nothing here is scheduled, sized, or promised. Everything below sits *outside* the MVP boundary set in `01-product-definition.md`; the thesis and framing it must stay honest to are in `00-brief.md`.

---

## How to read this

This is the idea bank. Each entry states the **idea** (what it would do, at product level), the **value** (why it would matter), and the **honest catch** (the real reason it isn't in the MVP, or the real risk if we shipped it). Items are grouped by conviction, not by sequence:

- **Strong next** — ideas we already believe in; the most likely sources of the next committed work once MVP lands.
- **Maybe** — plausible, valuable, but unproven or contingent on something else.
- **Wild** — speculative, high-ceiling, high-risk; here to stretch the vision, not to build soon.

Grouping is about conviction and clarity of value, never about order or timeline. Promotion out of this backlog is a separate decision, made elsewhere — not implied by appearing here.

---

## Strong next

### Embeddings-based tool retrieval
- **Idea:** Instead of handing the on-device model every tool a page produces, semantically match the user's request against the tool-set and surface only the most relevant handful to reason over.
- **Value:** Directly attacks PageAgent's sharpest scaling failure — a busy page can manufacture 50–100+ tools, which blows past the small model's usable context and tanks selection accuracy. Retrieval keeps the choice small and sharp, which is the difference between "picks the right button" and "guesses." This is arguably the single biggest reliability lever after the MVP.
- **Honest catch:** The enabling capability (on-device embeddings) is early-access/experimental right now, so it can't be a baseline dependency yet. It also adds a step that can itself be wrong — retrieval that drops the *right* tool is worse than showing too many. Needs a graceful path for when embeddings aren't available.

### Voice — the accessibility flagship
- **Idea:** Let the user speak their intent and hear PageAgent respond and narrate what it's doing — operate any website hands-free, eyes-free.
- **Value:** This is the emotional and moral core of the product. Talking or listening your way through a website that was never built to be accessible is genuinely transformative for motor- and vision-impaired users, and it's a daily convenience for everyone else. It's the feature that best expresses *why PageAgent should exist.*
- **Honest catch:** The reality is messier than the pitch. Speech-to-text in the browser today routes audio to the cloud — that quietly breaks the on-device privacy promise the moment the user is on an authenticated page, which is exactly where it matters most. Text-to-speech uses OS voices that are local but uneven in quality, and there is no on-device AI voice yet. Voice must ship with these caveats stated plainly, not glossed over.

### Confirm-before-run preview — the "Gatekeeper"
- **Idea:** Evolve the MVP's confirm-gate into a fuller safety layer: a clear preview of *what is about to happen* before any action runs, sharper treatment of destructive or irreversible actions (sign out, pay, delete, send), and per-action approval that a nervous user can trust.
- **Value:** Auto-operating someone's *logged-in* sessions is a live hazard, not a hypothetical. A trustworthy preview-and-approve step is what makes the whole product safe enough to actually use on a bank or work tool. Safety is a feature, and here it's load-bearing.
- **Honest catch:** Judging which actions are "destructive" from the DOM alone is unreliable — a harmless-looking button can do something drastic, and an alarming-looking one can be trivial. Over-gating trains users to click through every prompt (defeating the point); under-gating lets real damage through. Getting the calibration right is genuinely hard and never fully solved.

### Per-site trust & Profiles
- **Idea:** Let a user save a page's tool-set as a trusted Profile with per-site preferences — which actions are pre-approved, which always need the Gatekeeper, what the assistant is allowed to do on this site at all.
- **Value:** Turns PageAgent from "re-decide everything every visit" into "it knows how I use *this* site." Fewer prompts on sites you trust, firmer guardrails on sites you don't. It's how trust accrues over time instead of resetting each session.
- **Honest catch:** A saved tool-set is a snapshot of a page that keeps changing — sites redesign, buttons move, a trusted tool can silently come to mean something else. Stale trust is its own safety hazard, so Profiles need a credible story for staying honest as pages drift. Trust that outlives the page it was granted for is dangerous.

---

## Maybe

### `.well-known/mcp` fusion
- **Idea:** When a site actually exposes its own real `document.modelContext` tools, prefer those; fall back to DOM-scanned tools only where it doesn't. PageAgent gets *better* as the agentic web arrives, instead of being obsoleted by it.
- **Value:** This is the strategic hedge baked into the thesis (see `00-brief.md`): DOM-scan is the bootstrap for today's web, first-party tools are the destination. Fusion lets PageAgent ride the transition rather than bet against it, and gives site owners a reason to cooperate rather than compete.
- **Honest catch:** Almost no site exposes these tools today, so the payoff is mostly future-tense — hard to justify building ahead of demand. It also raises a real trust question: a site's *own* declared tools are not automatically more trustworthy than what we'd derive ourselves, and reconciling first-party and scanned tools without confusing the user is fiddly.

### Recorded macros / replayable named flows
- **Idea:** Let a user capture a sequence they do often ("file my weekly expense," "clear failed jobs") as a named, replayable flow they can trigger by name or voice.
- **Value:** Converts PageAgent from a per-request assistant into a personal automation tool. This is the power-user's reason to keep it installed, and it compounds the single-action reliability of the MVP into something that saves real time.
- **Honest catch:** Replay is exactly where the messy web fights back — the page changes between the recording and the replay, so a naive playback breaks the moment a button moves or a step needs re-planning. Honest macros have to re-scan and adapt at each step, not blindly repeat, which is meaningfully harder than "record and play." Multi-step reliability is a known weak spot (see `00-brief.md`).

### Cross-page / multi-tab tasks
- **Idea:** Let a task span more than one page or tab — start somewhere, follow a link, continue the intent on the next page, or coordinate across tabs.
- **Value:** Real tasks rarely live on one page. Unlocking cross-page flows is what separates "operate this screen" from "get this thing done."
- **Honest catch:** Every hard problem in the product compounds here. The small on-device model's planning is weakest over long chains, the DOM re-scans on every navigation, and the safety surface multiplies across contexts. This is high-value and high-risk in equal measure — easy to demo, hard to make trustworthy.

### Undo beyond confirm-gating
- **Idea:** Where a site supports it, offer to reverse an action after the fact — not just gate before it.
- **Value:** Confirm-gates prevent mistakes; undo *recovers* from them. Together they'd make PageAgent feel forgiving, which lowers the stakes of every action and makes users bolder about using it.
- **Honest catch:** Most web actions simply can't be undone — a sent message is sent, a payment is paid. Undo would be genuinely available only in narrow cases, and promising it broadly would be a dangerous lie. Better framed as a bonus where a site happens to support it than as a guarantee.

### Ambiguity / clarification prompts
- **Idea:** When the user's intent maps to more than one plausible tool, have PageAgent ask a short clarifying question instead of guessing.
- **Value:** A cheap, honest hedge against the small model's quality ceiling on tool selection. "Did you mean *cancel order* or *cancel subscription*?" beats silently doing the wrong one, especially when the wrong one is destructive.
- **Honest catch:** Over-asking is its own failure — an assistant that interrogates you before every click is exhausting and feels less capable, not more. The bar for *when* clarification is worth interrupting for is subtle and easy to get wrong in the annoying direction.

---

## Wild

### Read-the-page understanding, not just actioning it
- **Idea:** Beyond operating controls, let PageAgent answer questions *about* the current page's content — summarize, extract, compare what's on screen — using the same on-device brain.
- **Value:** Fuses "understand this page" with "act on this page" into one assistant, privately. It's a natural extension of being the thing you talk to about the page in front of you, and it leans on capabilities this repo already showcases.
- **Honest catch:** Scope creep with a capital S — it broadens PageAgent from an *actuator* into a general page assistant, which dilutes the sharp thesis and invites comparison with every summarizer already out there. Tempting, but it can blur what PageAgent *is.*

### Adaptive tool naming that learns from the user
- **Idea:** Let the plain-language names and descriptions of generated tools improve over time based on how a given user actually refers to things ("the rerun button" → the tool they mean).
- **Value:** The quality of tool *labels* is what makes the small model's intent-matching work at all. Personalized labeling could meaningfully lift accuracy on the exact sites a user visits most, turning a generic scan into a tailored vocabulary.
- **Honest catch:** Learning per-user vocabulary quietly is both a privacy question and a correctness question — a mis-learned association could route intent to the *wrong* action confidently. High ceiling, but it's exactly the kind of silent, compounding error that erodes trust.

### Shared / portable Profiles
- **Idea:** Let people export and share a curated Profile for a tricky site — a hand-tuned, trusted tool-set someone else can import.
- **Value:** Community-authored Profiles could carry PageAgent past the sites where automatic scanning struggles, and turn accessibility wins into something one expert user can gift to many. It's a route to reliability that doesn't depend solely on the scanner improving.
- **Honest catch:** Importing someone else's tool-set means importing their trust decisions and their assumptions about a page — a supply-chain-style risk aimed squarely at authenticated sessions. Sharing "what to click on your bank" is a genuinely fraught thing to make easy, and would demand serious safeguards.

### Proactive suggestions
- **Idea:** Have PageAgent notice, unprompted, that the current page affords a common task and offer to help ("Looks like you're filling a form — want me to complete it?").
- **Value:** Shifts PageAgent from reactive tool to anticipatory copilot, and could surface its usefulness to people who'd never think to open a chat and ask.
- **Honest catch:** Unprompted assistance on authenticated pages is a trust and creepiness minefield, and being wrong about intent is far more intrusive when *you* started the conversation. Easy to make people feel watched rather than helped. Handle only with extreme restraint, if ever.

### On-device voice, when it exists
- **Idea:** The moment a genuine on-device speech-to-text (and higher-quality local text-to-speech) capability ships in the browser, adopt it so the *entire* voice loop stays on the machine.
- **Value:** This is what would let the accessibility flagship finally keep the on-device privacy promise end-to-end — no audio leaving the device even for the users and sessions where it matters most. It closes the one honest hole in the voice story.
- **Honest catch:** Pure dependency on capability that doesn't exist yet — nothing to build until the platform ships it. Listed here so the intent is on record, not because it's actionable.

---

*This document is a backlog, not a roadmap. Presence here confers no commitment, priority, or sequence. Promotion of any item into committed work is decided separately. For what PageAgent is and does today, see `01-product-definition.md`; for the thesis and honest risks these ideas inherit, see `00-brief.md`.*
