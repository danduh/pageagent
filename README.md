# PageAgent

> **Turn any web page into something you can talk to.** A Chrome extension that scans the current page, auto-generates WebMCP tools from its buttons/inputs/links, and lets Chrome's built-in on-device LLM act on the page through a chat (and voice) assistant — privately, on your machine.

*(“PageAgent” is a provisional codename — see the naming options in the brief.)*

---

## Status: PRE-DEVELOPMENT — documentation only

This workspace is the **home for the PageAgent Chrome extension**, but **no code exists yet**. Right now it holds the product foundation needed to *start* the development process: brief, definition, requirements, users, ideas, competitive landscape, risks, and a capabilities reference.

There is deliberately **no implementation, no architecture/HLD, and no build/sprint plan** here yet — those come after this foundation is reviewed. The Nx build scaffold (manifest, `src/`, bundler config, targets) is added when implementation begins.

## Start here → [`docs/`](./docs/)

See [`docs/README.md`](./docs/README.md) for the full index. In short:

| Doc | What it answers |
|-----|-----------------|
| `00-brief.md` | The one-page pitch: what it is, why now, who it's for |
| `01-product-definition.md` | Scope, core concepts & terminology, the surfaces, what's in/out |
| `02-requirements.md` | Product-level functional & non-functional requirements |
| `03-users-and-use-cases.md` | Personas, jobs-to-be-done, concrete scenarios |
| `04-ideas-and-backlog.md` | The idea bank / parking lot for later |
| `05-competitive-landscape.md` | Reference products & our differentiation |
| `06-risks-and-open-questions.md` | The honest hard parts + what to resolve before planning |
| `07-capabilities-reference.md` | The Chrome built-in AI palette this relies on, and its reality |

## Relationship to the rest of the repo

PageAgent is the natural fusion of work already in this monorepo:
- **`/webmcp` demo** (in `chat/`) — a page *exposing* its own `document.modelContext` tools.
- **`feat/mcp-client`** (in `chat/`) — an in-browser MCP *client* + built-in-LLM agent loop that *consumes* a remote MCP server.

PageAgent is the mirror/superset: it **manufactures** a WebMCP tool surface from *any* page's DOM and drives it with that same agent loop — so the agentic web works on sites that haven't adopted WebMCP yet.
