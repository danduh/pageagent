# Contributing to PageAgent

PageAgent is built **issue-first**: every deliverable is a GitHub issue, and every
change lands through a pull request that links back to its issue(s). This keeps the
step-by-step plan (`docs/IMPLEMENTATION-PLAN.md`) and the actual work in lockstep.

## The workflow

1. **One deliverable = one issue.** Each step in the implementation plan is a
   self-contained, demoable deliverable with acceptance criteria — and gets its own
   issue. Larger groupings (a whole phase / milestone) get an **epic** issue that
   checklists its child issues (see #7).
2. **Branch per unit of work.** Branch off `main`:
   - `feat/<short-slug>` — a new capability or surface
   - `fix/<short-slug>` — a bug fix
   - `docs/<short-slug>` — docs only
   - `chore/<short-slug>` — tooling/infra/housekeeping
   - `spike/<short-slug>` — throwaway investigation
3. **Open a PR that links its issues.** Put `Closes #NN` (or `Part of #NN` when the
   issue isn't fully done) in the PR description. Add the same labels the issue
   carries. Keep PRs scoped to a phase or a small set of related steps.
4. **Commits** follow a light [Conventional Commits](https://www.conventionalcommits.org/)
   style: `type(scope): summary` — e.g. `feat(sidepanel): static Phase 0 shell`,
   `chore(build): standalone workspace`, `docs: contributing guide`.

### Definition of done for a step
The issue's acceptance checklist is all ticked, the PR links the issue, CI is green
(once CI exists, Phase 1), and — for UI/safety/a11y work — the accessibility floor is
not regressed (WCAG 2.2 AA; see `docs/DESIGN-BRIEF.md` §9).

## Labels

Kept deliberately small — we're not an enterprise.

| Label | Use for |
|-------|---------|
| `feature` | New capability or user-facing surface |
| `bug` | Something is broken |
| `design` | Design system / visual / UX (sourced from Claude Design) |
| `docs` | Documentation |
| `infra` | Build, tooling, CI, packaging, scaffolding |
| `ui` | A front-end surface or component |
| `safety` | Trust & safety-critical work (Confirm-gate, execution) |
| `a11y` | Accessibility (the flagship) |
| `engine` | Scan / tool-gen / on-device intent-loop |
| `spike` | Throwaway derisking investigation |
| `epic` | A phase / milestone tracking issue |
| `blocked` | Blocked on a dependency or decision |

Apply as many as genuinely fit (e.g. a Confirm-gate PR is often `safety` + `ui` + `a11y`).

## Development setup

**Prerequisites:** Node ≥ 20.19, npm ≥ 10, Google Chrome ≥ 114.

```bash
npm install
npm run typecheck
```

Task runner is npm (this is a **standalone** project — no Nx root is materialized;
`project.json` mirrors the npm scripts for a future Nx root). `build` (Vite + CRXJS +
React) and `typecheck` are live; `dev` runs `vite build --watch`. `lint` and `test`
remain placeholders until the ESLint + `jsx-a11y` / Vitest + axe harness lands (issue #14).

### Build & load the extension

```bash
npm run build      # or: npm run dev  (rebuild on save)
```

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select the **`dist/`** folder (produced by the build).
3. Click the toolbar icon (or press **Cmd/Ctrl + Shift + Y**) to open the side panel.

Reload the extension in `chrome://extensions` after each rebuild — MV3's strict CSP
forbids the eval-based Vite dev server inside the panel, so `npm run dev` is a
watch-rebuild loop, not live HMR (Step 1.2).

### Run the derisking spikes

See [`spikes/README.md`](spikes/README.md). Record results in `spikes/FINDINGS.md`
(they gate the engine architecture).

## Refreshing the design from Claude Design

The design lives in a Claude Design project and is mirrored into `docs/design/`:

- **Project:** `71d2e494-f661-4ab9-b39c-fbc308de50cb`
- **File:** `PageAgent.dc.html` (+ `support.js`, the `<x-dc>` preview runtime)

It is pulled via the **claude_design MCP / `DesignSync`** tool, which authenticates
through your claude.ai login (`/design-login` for sessions without one). Re-pull with
`DesignSync get_file` when the design changes; reconcile against the implementation in
the Phase 6.5 true-up. `docs/DESIGN-BRIEF.md` is the written brief; the `.dc.html` is
the visual source of truth.

## Repository layout

```
pageagent/
├─ src/                # TypeScript + React source
│  ├─ sidepanel/       # the side-panel React app (index.html, main.tsx, App.tsx, styles.css)
│  ├─ background/      # MV3 service worker
│  ├─ content/         # content script (isolated) + main-world island
│  └─ lib/             # shared modules (capabilities preflight, …)
├─ public/icons/       # extension icons (copied into dist/)
├─ dist/               # build output — load THIS unpacked (git-ignored)
├─ spikes/             # throwaway derisking probes (Phase 0)
├─ docs/               # inception (00–07), DESIGN-BRIEF.md, IMPLEMENTATION-PLAN.md
│  └─ design/          # imported PageAgent.dc.html (Claude Design) — visual source of truth
├─ manifest.config.ts  # MV3 manifest (CRXJS defineManifest)
├─ vite.config.ts      # Vite + React + CRXJS build
├─ package.json        # standalone workspace + npm task runner
└─ project.json        # Nx project descriptor (inert until an Nx root exists)
```
