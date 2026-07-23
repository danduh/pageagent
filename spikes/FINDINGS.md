# Spike findings

Record results here after running the probes. These findings gate the Step 3.0
`EnginePort` contract and the Phase 7 bridge topology.

## Spike A — `LanguageModel` in the MV3 side-panel document (#5)

- **Date / Chrome version:** _(fill in)_
- **Hardware / Nano downloaded?** _(fill in)_
- **Origin-trial token present?** _(fill in)_
- **`typeof LanguageModel` in the side-panel document:** _(fill in)_
- **`LanguageModel.availability()` result:** _(fill in)_
- **`LanguageModel.create()` succeeded in the side panel?** _(yes / no + error)_

**Verdict:** _(Does the agent brain live in the side panel? If NO — which host:
offscreen document or content script — and what does that change for the Step 7.2
bridge, the Step 9.2 loop location, and the Stop/abort channel?)_

## Spike B — element-handle re-resolution across an SPA re-render (#6)

- **Date / Chrome version:** _(fill in)_
- **`document.modelContext` readable from MAIN world?** _(fill in)_
- **Re-resolution after re-render — which strategies hit the intended node:**
  - [ ] live object reference (`WeakRef`)
  - [ ] `id` selector
  - [ ] CSS path
  - [ ] accessible-name / text match
  - [ ] DOM index / position

**Verdict:** _(Which strategy — or combination — is reliable enough to underpin the
liveness-recheck + locate-or-decline guarantee? If none is reliable on its own,
record this as a first-class risk before freezing the Step 3.0 interface.)_
