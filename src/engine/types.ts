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

/**
 * Element re-resolution outcome (Spike B). A BOOLEAN would be a lie: the reorder
 * case produced WRONG-NODE hits, so "found" must distinguish a verified match from
 * an ambiguous or stale one. not-found + ambiguous both map to a "couldn't" report;
 * ambiguous is a first-class DECLINE for destructive actions (locate-or-decline).
 */
export type ReResolution =
  | { kind: 'resolved-verified'; toolId: string }
  | { kind: 'not-found' }
  | { kind: 'ambiguous'; matches: number }
  | { kind: 'stale' };

/** Certainty ladder — what a report-back is allowed to claim (Plan §11). */
export type Certainty = 'done' | 'sent-unconfirmed' | 'couldnt' | 'didnt';

/** A one-tap inverse offered for a reversible (Tier-0) action (trust ledger). */
export interface Reverse {
  label: string;
}

export type LocusState = 'on-device' | 'off-device' | 'unavailable';
