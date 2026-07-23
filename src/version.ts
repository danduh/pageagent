// Seed TypeScript module so `npm run typecheck` has something real to check in
// Phase 0. The typed domain contracts (Page, Scan, Action, Tool, EnginePort…)
// arrive in Phase 3 (see docs/IMPLEMENTATION-PLAN.md, Step 3.0).

export const PAGEAGENT_VERSION = '0.0.1' as const;

/** Which build/runtime capability tier the panel is operating under. */
export type CapabilityVerdict = 'on-device' | 'degraded' | 'unavailable';
