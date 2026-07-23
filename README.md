# PageAgent

> **Turn any web page into something you can talk to.** A Chrome extension that scans the current page, auto-generates WebMCP tools from its buttons/inputs/links, and lets Chrome's built-in on-device LLM act on the page through a chat (and voice) assistant — privately, on your machine.

*(“PageAgent” is a provisional codename — see the naming options in [`docs/00-brief.md`](docs/00-brief.md).)*

---

## Status: IN DEVELOPMENT — Phase 1 (build system)

Implementation follows [`docs/IMPLEMENTATION-PLAN.md`](docs/IMPLEMENTATION-PLAN.md) (one ordered
roadmap; **Scope A** = a faithful, accessible side-panel UI on mock data, **Scope B** = the real
on-device engine). Work is tracked in GitHub issues under the
[epic #7](https://github.com/danduh/pageagent/issues/7); see [`CONTRIBUTING.md`](CONTRIBUTING.md)
for how we work.

**Phase 0** (done) stood up the loadable side-panel shell, summon shortcut, standalone workspace,
imported design, and two derisking spikes (run on Chrome 152 — see [`spikes/FINDINGS.md`](spikes/FINDINGS.md)).
**Phase 1** (in progress) turns the shell into a bundled **React + TypeScript** MV3 build (Vite +
CRXJS) with an on-device capability preflight. The engine, real surfaces, and safety layer follow.

## Quickstart

```bash
npm install
npm run build      # or: npm run dev  (rebuild on save)
```

Then load it in Chrome:

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select the **`dist/`** folder
3. Click the toolbar icon or press **Cmd/Ctrl + Shift + Y** to open the panel

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full dev setup, the spikes, and how the
design is refreshed from Claude Design.

## What's here

| Path | What it is |
|------|-----------|
| [`docs/`](docs/) | Product inception (00–07), the [design brief](docs/DESIGN-BRIEF.md), and the [implementation plan](docs/IMPLEMENTATION-PLAN.md) |
| [`docs/design/`](docs/design/) | `PageAgent.dc.html` imported from Claude Design — the visual source of truth |
| [`src/`](src/) | React + TypeScript source — side panel, service worker, content/main-world scripts, shared lib |
| `dist/` | Build output — load **this** unpacked (git-ignored) |
| [`public/icons/`](public/icons/) | Extension icons (copied into the build) |
| [`spikes/`](spikes/) | Throwaway derisking probes (Prompt-API-in-side-panel; element-handle re-resolution) |

### The product docs (read in order)

| Doc | What it answers |
|-----|-----------------|
| [`00-brief.md`](docs/00-brief.md) | The one-page pitch: what it is, why now, who it's for |
| [`01-product-definition.md`](docs/01-product-definition.md) | Scope, core concepts & terminology, the surfaces, what's in/out |
| [`02-requirements.md`](docs/02-requirements.md) | Product-level functional & non-functional requirements (REQ-IDs) |
| [`03-users-and-use-cases.md`](docs/03-users-and-use-cases.md) | Personas, jobs-to-be-done, concrete scenarios |
| [`04-ideas-and-backlog.md`](docs/04-ideas-and-backlog.md) | The idea bank / parking lot for later |
| [`05-competitive-landscape.md`](docs/05-competitive-landscape.md) | Reference products & our differentiation |
| [`06-risks-and-open-questions.md`](docs/06-risks-and-open-questions.md) | The honest hard parts + what to resolve before planning |
| [`07-capabilities-reference.md`](docs/07-capabilities-reference.md) | The Chrome built-in AI palette this relies on, and its reality |
| [`DESIGN-BRIEF.md`](docs/DESIGN-BRIEF.md) | The design description handed to Claude Design |
| [`IMPLEMENTATION-PLAN.md`](docs/IMPLEMENTATION-PLAN.md) | Step-by-step build plan; each step a deliverable |

## Contributing

Issue-first, PR-linked, lightly labeled. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before
opening a PR.

## Relationship to the rest of the repo

PageAgent is the natural fusion of work already in this monorepo:
- **`/webmcp` demo** — a page *exposing* its own `document.modelContext` tools.
- **`feat/mcp-client`** — an in-browser MCP *client* + built-in-LLM agent loop that *consumes* a remote MCP server.

PageAgent is the mirror/superset: it **manufactures** a WebMCP tool surface from *any* page's DOM and drives it with that same agent loop — so the agentic web works on sites that haven't adopted WebMCP yet.
