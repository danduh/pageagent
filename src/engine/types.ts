// Domain types shared by the Scope-A stub and the Scope-B engine. Shaped from the
// engine's REAL behavior (Phase-0 spikes), not from fixture convenience:
//  - scans can be partial or fail;
//  - element re-resolution is a FOUR-outcome union, never a boolean (Spike B);
//  - execution reports on the certainty ladder incl. an honest "didn't" (decline).

export type ActionType = 'click' | 'type' | 'choose' | 'follow-link';

/** Where a tool came from: the site's own WebMCP tools vs. DOM-manufactured. */
export type ToolSource = 'declared' | 'manufactured';

/** Reversibility ladder tier (Plan §8). */
export type RiskTier = 0 | 1 | 2;

export interface Tool {
  /** Machine identifier, e.g. `click_rerun_failed_jobs`. */
  id: string;
  /** Plain-language label, e.g. "Rerun failed jobs". */
  name: string;
  description: string;
  actionType: ActionType;
  source: ToolSource;
  risk: RiskTier;
  /** Honest provenance in the page's own words, e.g. `button "Re-run failed jobs"`. */
  provenance: string;
  /** True when no accessible name could be read (REQ-SCAN-3) — never invent one. */
  unlabeled?: boolean;
  /** Present for type/choose tools; the value the user supplies. */
  valueLabel?: string;
  /**
   * Declared (site) tools only: a compact description of the tool's named arguments (fields +
   * types + enums) so the on-device loop fills them correctly, e.g. `name (one of: marketing,
   * security), enabled (true/false)`. Absent for DOM tools (which take a single args.value).
   */
  argSchema?: string;
}

export interface PageInfo {
  origin: string;
  title: string;
}

export type FreshnessState = 'fresh' | 'aging' | 'stale' | 'scanning' | 'failed';

export interface Coverage {
  detected: number;
  fromElements: number;
  /** Controls with no readable label — surfaced honestly, never dropped silently. */
  unlabeled: number;
  /** Regions we cannot reliably cover (shadow/virtualized/canvas/…), named honestly. */
  uncovered: string[];
}

export type ScanResult =
  | { status: 'ok'; tools: Tool[]; coverage: Coverage }
  | { status: 'partial'; tools: Tool[]; coverage: Coverage; note: string }
  | { status: 'failed'; reason: string };

/** Certainty ladder — what a report-back is allowed to claim (Plan §11). */
export type Certainty = 'done' | 'sent-unconfirmed' | 'couldnt' | 'didnt';

/** A one-tap inverse offered for a reversible (Tier-0) action (trust ledger). */
export interface Reverse {
  label: string;
}

export type LocusState = 'on-device' | 'off-device' | 'unavailable';

/**
 * The truthful preview a Confirm-gate shows before a Tier-1/2 action (Plan §8).
 * Specific and verifiable — names the concrete action, target, and verbatim value —
 * never a vague summary. If `locatable` is false the gate DECLINES rather than
 * proceeding (locate-or-decline). Tier-0 actions never produce a GatePreview.
 */
export interface GatePreview {
  tier: 1 | 2;
  /** Action verb in glossary terms. */
  verb: ActionType;
  /** The manufactured tool name (machine id shown for inspection). */
  toolName: string;
  /** The on-page label/location, e.g. `the "Cancel subscription" button in Billing`. */
  targetLabel: string;
  /** Verbatim value for type/choose actions — quoted, never paraphrased. */
  value?: string;
  /** Plain consequence + reversibility class. */
  consequence: string;
  /** User provenance, e.g. `Because you asked: "cancel my subscription."` */
  provenance: string;
  /** Tier-2 only: the concrete value to actively re-acknowledge (amount/recipient). */
  reacknowledge?: string;
  /** Verb-restating proceed label, e.g. "Cancel subscription", "Pay $84.30". */
  proceedLabel: string;
  /** Safe action label (holds default focus), e.g. "Don't cancel". */
  cancelLabel: string;
  /** False → the element couldn't be located; the gate must decline, not proceed. */
  locatable: boolean;
  /** Unsure-posture: "I'm not certain this can be undone, so I'm checking." */
  unsure?: boolean;
}
