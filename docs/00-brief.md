# PageAgent — Product Brief

**Purpose:** The one-page pitch for PageAgent — what it is, the problem it solves, why now, and who it's for. Executive-readable. See `01-product-definition.md` for the scope and glossary.

## Elevator pitch

**PageAgent turns any web page into something you can talk to.** It scans the page you're on, manufactures a set of actions from its buttons, links, and inputs, and lets Chrome's built-in on-device AI operate the page for you through a chat — typed or spoken. No integration required from the website. No sending your logged-in bank, inbox, or work tools to a cloud service. It runs privately, on your machine, on pages that exist today.

## The problem

The "agentic web" — where AI assistants act on your behalf inside real websites — has a chicken-and-egg problem. The emerging standard for a page to expose actions to an agent (WebMCP / `document.modelContext`) requires **the website** to adopt it. Almost none have. So the agentic web is stuck waiting for millions of sites to add support that isn't there yet.

Meanwhile, the assistants that *can* act on the web today are cloud agents. To operate a page, they need to see it — including pages behind your login. Handing a cloud service your authenticated banking session, your work dashboards, and your email, along with your intent, is a privacy and security non-starter for the exact tasks people most want help with.

## The idea

PageAgent breaks the deadlock by **manufacturing the agent's tools from the page itself.** Instead of waiting for a site to declare its actions, PageAgent reads the live DOM, detects what's actionable, and generates a tool for each — auto-named and described from the page (`click_rerun_failed_jobs`, `fill_search`, `click_sign_out`). Chrome's built-in on-device model then maps what you say to the right tool, performs the action on the page, and reports back — looping when a task needs more than one step.

The result: the agentic web works on **any page, today**, and gets *better* as real sites adopt the standard — PageAgent will prefer a site's own declared tools when they exist and fall back to scanning when they don't.

## Why now

- **The building blocks just landed in the browser.** Chrome now ships an on-device LLM (Prompt API / Gemini Nano), on-device embeddings, the WebMCP tool-registration surface, and speech I/O. For the first time, an agent brain and a tool surface can live entirely on the user's machine.
- **The standard is arriving but the content isn't.** WebMCP is a moving target sites haven't adopted. Manufacturing tools from the DOM is the bridge that makes the standard useful *before* the web catches up.
- **On-device changed the economics.** Local means private, free, and instant — so an assistant can run on *every* page, including authenticated ones, without a per-action cloud cost or a privacy trade.

## The on-device unlock (this is the whole point, not a nicety)

The tasks with the most value are inside your logged-in sessions: move money, triage email, operate an internal tool, change a setting. Those are precisely the tasks you cannot responsibly route through a cloud agent. PageAgent's on-device brain means the page and your intent **never leave your machine**. That's not a feature bullet — it's what makes an assistant on authenticated pages acceptable at all. It's also what makes it free to run everywhere and fast enough to feel instant.

## Who it's for

- **Accessibility users (flagship).** Operate any website by chat or voice — transformative for motor- and vision-impaired users who can't easily use a mouse or read dense UI.
- **Everyday users.** Do a thing on a page without hunting for the button — "unsubscribe from all of these," "download my last invoice."
- **Power users & automators.** Chain and replay routine site actions; save per-site tool sets.
- **Privacy-conscious users.** People who want an assistant on their bank, health, and work pages but will never send those to the cloud.

## Reach & impact thesis

PageAgent is **universal** — it targets no single site and no single user segment; it works wherever the web works. Its clearest, hardest-to-ignore impact is **accessibility**: a chat-and-voice way to drive any website is a genuine capability change for people the web underserves today. Beyond that, it's the **on-ramp to the agentic web** — the thing that makes agents useful on real pages now, and that improves automatically as the standard spreads. The durable edge over a browser-maker's own agent is being **on-device (private), open, and working where the native agent won't.**

## Honest hard parts (see `03`/`06` for detail)

Reading messy real-world pages into reliable tools is the crux and it will not always work. Auto-executing actions in a logged-in session is a live safety surface that demands confirm-before-run, previews, and undo. And the on-device model is strong at picking one tool but weak at long autonomous plans — so single, confirmed actions are the reliable core; long unattended chains are not. We lead with these, not around them.

## Naming

Working codename: **PageAgent** (descriptive, provisional). Alternatives to consider:

- **Sesame** — "open sesame"; evokes unlocking any page by voice. Warm, memorable, accessibility-friendly.
- **PagePilot** — a co-pilot for the page you're on. Clear, mainstream, slightly generic.
- **Handle** — you "handle" a page by talking to it; also a nod to giving users a handle on hard-to-use sites.
- **Converse** — foregrounds the talk-to-any-page interaction and the voice/accessibility angle.

The codename **PageAgent** is used consistently across all docs until a name is chosen.
