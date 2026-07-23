# PageAgent — Competitive Landscape & Differentiation

**Purpose:** Map the field PageAgent enters — the tools and agents that already act on web pages — and state clearly where PageAgent differs, where its durable wedge is, and where it honestly does *not* win. This is a landscape read, not a go-to-market plan. See `00-brief.md` for the pitch, `01-product-definition.md` for scope and glossary, and `06` for the honest risks.

## How to read this map

Everyone here is chasing the same prize: an assistant that *does things on web pages for you*, not just talks about them. What separates them is four questions, and PageAgent's position falls out of the answers:

- **Where does the intelligence run** — on the user's machine, or in someone's cloud?
- **Where do the page's actions come from** — does the site have to expose them, does a human script them in advance, or are they manufactured from the live page automatically?
- **Who is it for** — a developer at a console, or a mainstream user (including users who rely on assistive tech)?
- **Can it be trusted inside a logged-in session** — bank, work tools, email — or not?

PageAgent's answers: **on-device**, **manufactured from any page's DOM**, **mainstream/accessibility-first**, **built for authenticated sessions**. No one else in the field currently answers all four the same way.

## The reference product: "WebMCP DevTools" extension

**What it does.** The extension that most directly inspired PageAgent. It scans a page, injects the page's actions as WebMCP tools (`document.modelContext`), and offers a chat that can execute them. It proves the core mechanic PageAgent is built on: you do *not* have to wait for a site to adopt WebMCP — you can manufacture the tool surface from the page as it exists.

**Who it is for.** Developers. It is a *devtool* — a way to inspect, generate, and poke at WebMCP tools on a page, sitting in the same mental space as the browser's own DevTools. The framing, the surfaces, and the audience all assume someone technical who wants to see and drive the machinery.

**Where PageAgent differs.** PageAgent takes the same core mechanic and builds the **consumer assistant** on top of it. The difference is not a bigger feature list; it is a different product:

- **Audience.** A mainstream user (and, as flagship, an accessibility user) — not a developer inspecting tool JSON.
- **Posture.** An *assistant* you talk to, not an inspector you operate. The DOM-to-tools machinery is deliberately behind the scenes; the surface is a conversation.
- **Safety as a product feature, not an afterthought.** Because the audience is running this on their real, logged-in pages, PageAgent leads with the confirm-gate, action preview, and per-site trust (see `01`/`06`). A devtool assumes the operator knows what a "click sign-out" tool will do; a consumer assistant cannot.
- **Retrieval and voice.** Embeddings-based tool retrieval and voice/accessibility (both future scope in `01`) are what a mainstream assistant needs and a devtool does not.

PageAgent's relationship to this reference is *"same mechanic, opposite end of the product spectrum."* It validates that the mechanic works; PageAgent is the mainstream, private, safety-first, accessibility-led version of the idea.

## The looming incumbent: the browser-maker's own agent

**What it is.** Chrome's own built-in agent (Gemini-in-Chrome, and Project-Mariner-style "the browser does tasks for you" agents). A browser vendor is uniquely positioned here: it owns the rendering engine, the DOM, the profile, the sessions, and the update channel. It can see and drive any page without an extension, and it can ship to everyone by default.

**Why it is the real risk.** This is the single most serious competitive threat (see risk R6 in `06`). If the browser ships a capable agent that operates pages natively, the obvious question is "why install an extension?" A vendor agent can be deeper (privileged page access), broader (every user, no install), and better-resourced.

**Where PageAgent differs — and why the wedge holds anyway.**

- **On-device vs cloud.** The vendor's flagship agents are, today, substantially **cloud-backed** — the page and the user's intent go to the vendor's servers. PageAgent's whole thesis is the opposite: the brain runs **on the user's machine**, so authenticated pages never leave it. For the highest-value tasks (money, health, work, mail), "runs locally, sends nothing" is a categorically different trust proposition than "trust the browser vendor's cloud."
- **Open and hackable vs closed and default.** A vendor agent is a black box shipped on the vendor's schedule and shaped by the vendor's incentives (which include the vendor's ad, search, and data businesses). PageAgent is an open, inspectable tool the user controls — the tools it manufactures are visible (the **Tools** surface), runnable one at a time (**Execute**), and re-scannable (**Scan/Gen**).
- **Works where the native agent won't.** Vendor agents tend to be conservative exactly where it matters — they may refuse, throttle, or wall off sensitive sites, regions, or account types, and they roll out slowly and unevenly. PageAgent's manufacture-from-DOM approach works on *any* page the user can already see, including the ones a cautious vendor agent declines.
- **Accessibility focus.** A general vendor agent optimizes for the median user. PageAgent's flagship is operating any site by chat/voice for motor- and vision-impaired users — a focus a broad horizontal agent is unlikely to center.

Honest note: if the vendor's agent goes on-device *and* open *and* accessibility-first, the wedge narrows. The durable part of the wedge is the combination — on-device **plus** open **plus** working-where-native-won't **plus** accessibility — not any single attribute.

## Page-automation & RPA-style tools; other agent extensions

**What they do.** A broad category: browser-automation extensions and RPA ("robotic process automation") tools that let a user record or script a sequence of page actions and replay them (click here, type there, submit). Some newer "agent" extensions layer an LLM on top to pick actions. They are genuinely good at *repeating a known flow*.

**Where PageAgent differs.**

- **Manufactured, not pre-scripted.** Classic RPA requires a human to author the flow in advance and breaks when the page changes. PageAgent manufactures the tool surface from the **live** page each time and re-scans between steps (see the intent-loop in `01`), so it adapts to the page as it is now rather than as it was when someone recorded it.
- **Intent, not instructions.** RPA executes a fixed script; PageAgent maps a *natural-language intent* to the right action(s) via the on-device model. The user says what they want, not which buttons to press.
- **Assistant, not builder.** RPA tools are authoring environments for people who will invest in building a flow. PageAgent is a talk-to-it assistant for the page in front of you, with no authoring step required.
- **Recorded macros as *future* scope, done PageAgent's way.** PageAgent's roadmap does include recorded/replayable flows (see `01` "Later") — but as a convenience layered on top of the manufacture-and-adapt core, not as the primary mechanic.

Where the lines blur: LLM-driven agent extensions are converging toward "understand intent, act on the page," which is PageAgent's space. The differentiators there collapse back to the same wedge — **on-device privacy over authenticated sessions**, **safety-gating built for consumers**, and **accessibility** — rather than the automation mechanic itself.

## Cloud AI browser agents

**What they do.** Standalone agents and services (agentic browsers, "operator"-style products, and remote agents that drive a browser for you) that take a goal and act across web pages in a cloud-hosted or cloud-brained session. They are often the most *capable* at long, multi-step tasks because they run large models and can plan deeply.

**Where PageAgent differs.**

- **The authenticated-session wall.** This is the decisive line. To act on a page behind your login, a cloud agent needs that page — and often your session — in its cloud. Handing a logged-in bank, health portal, work dashboard, or inbox plus your intent to a third-party cloud is a privacy/security non-starter for exactly the tasks people most want done. PageAgent operates those pages **locally**, so nothing leaves the machine.
- **Free and ambient vs metered.** Cloud agents carry a per-action cloud cost, so they are used deliberately, for set-piece tasks. On-device makes PageAgent free and instant enough to sit on *every* page, ambiently — the assistant is just *there* on whatever you're looking at.
- **Reach vs depth.** Cloud agents win on depth (see below). PageAgent trades some depth for the ability to run everywhere, privately, now.

Honest note: on raw capability for a complex, multi-step, low-sensitivity task on a public site, a cloud agent with a frontier model will often outperform PageAgent's on-device model. PageAgent is not trying to win that contest; it is winning a *different* one — the private, authenticated, ambient, universal one.

## The durable wedge

Strip away the feature comparisons and PageAgent's defensible position is a specific stack that no single competitor currently holds all of:

- **On-device privacy over authenticated sessions.** The page and the user's intent never leave the machine — the only acceptable posture for operating bank, health, work, and mail pages. This is the wedge's core.
- **Free and ambient.** No per-action cost means the assistant can live on *every* page, always available, not reserved for deliberate set-piece tasks.
- **Open and hackable.** The manufactured tools are visible, runnable, and re-scannable by the user; the assistant is inspectable and user-controlled, not a vendor black box.
- **Works where native won't.** Manufacture-from-DOM runs on any page the user can already see — including sites, regions, and account types a cautious vendor or cloud agent declines — and it *improves* as real sites adopt `document.modelContext` (the "fusion" direction in `00`/`01`).
- **Accessibility-first.** Operating any website by chat and voice is a genuine capability change for motor- and vision-impaired users — a flagship focus a horizontal agent won't center.

The wedge is the **combination**. Any one attribute can be matched; the four together, aimed at authenticated real-world use, is the position.

## Where we do *not* win (honest)

- **Deep multi-step, autonomous tasks.** A cloud frontier-model agent will out-plan PageAgent's on-device model on long, complex chains. PageAgent's reliable core is single, confirmed actions (see `06`); long unattended autonomy is not the claim.
- **Raw model quality.** On the hardest intent→tool decisions among many similar tools, a large cloud model beats an on-device small one. Embeddings-based retrieval (future scope) narrows this, but the ceiling is real.
- **If the browser vendor absorbs the idea.** If Chrome's native agent goes on-device, open, and accessibility-focused, the wedge narrows sharply. "Why an extension?" is a fair question, and part of the answer depends on the vendor *not* doing all of this first.
- **Truly voice-private today.** Voice input in the browser is currently cloud-backed (audio leaves the machine), and there is no on-device AI text-to-speech (see the capability reality in `00`/`07`). Until on-device speech lands, the voice flagship carries a caveat we state rather than hide.
- **The messy web itself.** Reading arbitrary real-world pages into reliable tools is the crux risk (`06`), and it will not always work. A competitor with privileged engine-level access (the browser vendor) has an inherent advantage at reading the page. PageAgent's edge is what it does *with* the page once read — not a claim to read every page better than the engine that renders it.
