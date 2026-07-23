// The stub↔engine seam (Plan Step 3.0) — the two-scope linchpin.
//
// BOTH the Scope-A stub (fixtures) and the Scope-B real engine implement EnginePort.
// It is intentionally shaped around what the real engine can deliver, NOT fixtures:
// every long call is async and takes an AbortSignal (Stop); scans may be partial or
// fail; running an intent EMITS transcript turns step-by-step (an async generator)
// so the UI can render progress and abort mid-flight; outcomes ride the certainty
// ladder incl. an honest decline. Swapping the stub for the real engine must require
// NO change to any Scope-A component — they depend on this interface only.

import type { CapabilityState } from '../lib/capabilities';
import type { Certainty, PageInfo, Reverse, ScanResult, Tool } from './types';

/** A single transcript turn the Chat renders. */
export type TurnKind = 'user' | 'agent' | 'report' | 'clarify' | 'page-quote';

export interface Turn {
  id: string;
  kind: TurnKind;
  text: string;
  /** report: which certainty-ladder rung this claim sits on. */
  certainty?: Certainty;
  /** report: one-tap inverse for a reversible (Tier-0) action. */
  reverse?: Reverse;
  /** clarify: choice-chip labels drawn from the page's own words. */
  choices?: string[];
  /** true when this turn used a path that left the device (per-turn cloud label). */
  offDevice?: boolean;
}

export interface EnginePort {
  /** Passive capability read (never downloads). */
  capability(): Promise<CapabilityState>;
  /** Identity of the page the current tool-set belongs to. */
  page(): PageInfo;
  /** (Re)scan the page. Abortable; may return partial or failed. */
  scan(signal?: AbortSignal): Promise<ScanResult>;
  /** The current generated tool-set (browsable by the user; Tools surface). */
  tools(): Tool[];
  /**
   * Run the user's plain-language intent. Yields transcript turns as it progresses
   * — the capped intent-loop's steps in the real engine, scripted turns in the stub.
   * Honors `signal`: on abort it stops at the next safe point and stops yielding.
   */
  runIntent(text: string, signal: AbortSignal): AsyncIterable<Turn>;
}
