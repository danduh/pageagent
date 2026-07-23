// The persistent Header surface (Plan Step 3.2, issue #32).
//
// A compact, always-visible band with three regions: page identity (this page's
// favicon + origin + title), the freshness state-machine (with an always-reachable
// re-Scan control), and the processing-locus indicator. When the intent-loop is
// acting, an acting indicator + an always-visible Stop control appear.
//
// Presentational only: it depends on the frozen HeaderProps contract and nothing
// else, so the stub↔engine seam stays behind App. Meaning is always carried in
// TEXT — never by color or icon alone — and every control clears a 44×44 target.

import type { HeaderProps } from './contracts';
import type { FreshnessState } from '../engine/types';
import { RescanIcon, StopIcon } from '../components/icons';
import { Button } from '../components/primitives';
import { ProcessingLocus } from './ProcessingLocus';
import './header.css';

/* Freshness copy — the state is always spelled out; color/prominence only reinforce
 * it. Deliberately calm: "failed" does not borrow the halt signal. */
const FRESHNESS_TEXT: Record<FreshnessState, string> = {
  fresh: 'Up to date',
  aging: 'May be out of date',
  stale: 'Tools may be out of date',
  scanning: 'Scanning this page…',
  failed: 'Couldn’t finish the scan',
};

/* The re-Scan control is present in EVERY freshness state; only its wording and
 * prominence change. Stale proactively offers "Scan this page". */
const RESCAN_LABEL: Record<FreshnessState, string> = {
  fresh: 'Rescan',
  aging: 'Rescan',
  stale: 'Scan this page',
  scanning: 'Rescan',
  failed: 'Scan again',
};

export function Header({ page, freshness, locus, acting, onRescan, onStop }: HeaderProps) {
  return (
    <header className="pah">
      {/* Region 1 (identity) + Region 3 (locus) share the top bar. */}
      <div className="pah__bar">
        <div className="pah__identity">
          <span className="pah__favicon" aria-hidden="true" />
          <span className="pah__page">
            <span className="pah__vh">Current page: </span>
            <span className="pah__title">{page.title}</span>
            <span className="pah__origin">{page.origin}</span>
          </span>
        </div>

        <ProcessingLocus locus={locus} />
      </div>

      {/* Region 2 (freshness) — the status is a persistent polite live region so the
          scanning transition (and every other) is announced. */}
      <div className="pah__bar pah__bar--freshness">
        <p className={`pah__freshness pah__freshness--${freshness}`} role="status">
          <span className="pah__freshness-dot" aria-hidden="true" />
          <span className="pah__freshness-text">{FRESHNESS_TEXT[freshness]}</span>
        </p>
        <Button
          variant={freshness === 'stale' ? 'primary' : 'ghost'}
          className="pah__rescan"
          onClick={onRescan}
        >
          <RescanIcon size={18} />
          {RESCAN_LABEL[freshness]}
        </Button>
      </div>

      {/* Acting indicator + always-visible Stop (StopIcon, visually distinct). The
          pulse reads as local thinking — never a "contacting server" spinner. */}
      {acting ? (
        <div className="pah__bar pah__bar--acting">
          <span className="pah__pulse" aria-hidden="true" />
          <span className="pah__acting-label">Working on this page</span>
          <Button variant="firm" className="pah__stop" onClick={onStop}>
            <StopIcon size={18} />
            Stop
          </Button>
        </div>
      ) : null}
    </header>
  );
}
