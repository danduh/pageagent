// Freshness / staleness state machine (Step 8.2). A PURE reducer so the transitions are
// unit-testable and identical for the stub (gallery) and the live engine. It answers two
// questions the surfaces need: what does the header say (FreshnessState), and may the agent
// still act on the current tool-set (`toolsStale`)?
//
// The tool-set is scanned ONCE and then the live page drifts: the DOM mutates, an SPA
// changes route, or the user switches tabs — at which point a Tool whose element no longer
// resolves must NOT fire. The re-resolver already declines at act-time (Step 8.5); this makes
// the staleness PROACTIVE and VISIBLE (header flips to Stale, running is guarded) instead of
// only being caught at the moment of dispatch.

import type { FreshnessState } from './types';

// This reducer owns the STICKY drift (mutation / navigation) + the scan lifecycle. Being on a
// different tab than the tools is transient (you can switch back), so App tracks it separately
// and combines it with this view — it is not fed through here.
export type FreshnessSignal =
  | { kind: 'scanning' } // a (re)scan started
  | { kind: 'scanned' } // a scan completed successfully → the tool-set is current
  | { kind: 'scan-failed' } // a scan could not complete
  | { kind: 'mutation' } // the DOM changed past the threshold since the scan
  | { kind: 'navigation' }; // the URL / SPA route changed since the scan

/** The full freshness view the surfaces render + gate on. */
export interface FreshnessView {
  state: FreshnessState;
  /** true → the tool-set may no longer map to the live page; guard running before a re-scan. */
  toolsStale: boolean;
  /** Short, plain reason for the header/report when stale (e.g. "the page changed"). */
  reason?: string;
}

export const FRESH: FreshnessView = { state: 'fresh', toolsStale: false };

const STALE_REASON: Record<'mutation' | 'navigation', string> = {
  mutation: 'the page changed since I scanned',
  navigation: 'the page moved to a different view since I scanned',
};

/**
 * Next freshness view given the current one and a signal. Drift staleness is STICKY: once the
 * tool-set is stale it stays stale (and keeps the FIRST reason) until a scan clears it — a
 * later, weaker signal never downgrades it or overwrites why it went stale.
 */
export function nextFreshness(current: FreshnessView, signal: FreshnessSignal): FreshnessView {
  switch (signal.kind) {
    case 'scanning':
      return { state: 'scanning', toolsStale: false };
    case 'scanned':
      return { state: 'fresh', toolsStale: false };
    case 'scan-failed':
      // A failed scan leaves the old tool-set unverified → treat it as stale, not runnable.
      return { state: 'failed', toolsStale: true, reason: 'the last scan did not finish' };
    case 'mutation':
    case 'navigation': {
      // Don't clobber an in-flight scan's state, and keep the first stale reason if already stale.
      if (current.state === 'scanning') return current;
      return {
        state: 'stale',
        toolsStale: true,
        reason: current.toolsStale ? current.reason : STALE_REASON[signal.kind],
      };
    }
    default: {
      signal satisfies never;
      return current;
    }
  }
}
