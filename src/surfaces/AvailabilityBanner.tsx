// The AVAILABILITY banner (Plan Step 5.7, issue #43).
//
// A PERSISTENT, non-dismissable region shown when the on-device model can't run. It is
// honest twice over: it names WHY (the caller's `reason`) and it draws the capability
// line — what still works WITHOUT the model (browse the tools found on the page, run
// one, inspect the scan) versus what does not (Chat). It never oversells: no padlock or
// shield, no always-green "protected" badge, no quota/upgrade CTA, no "contacting
// server" spinner.
//
// When a cloud fallback is offered it appears as a DISTINCT Offshore material
// (leaves-device): the outbound-aperture glyph, --offshore hue, a dashed border with a
// solid "ticked" left edge, and a tinted fill — deliberately a different material from
// the on-device resting state, so the two can never be confused. The trade is STATED
// BEFORE USE: revealing it is what the disclosure does, and the exact
// page-data-leaves-the-machine cost sits ABOVE the opt-in. Nothing leaves the device
// until the deliberate [Use cloud once] click; [Not now] tucks the offer away again and
// the banner itself stays.
//
// Presentational only: depends on the frozen AvailabilityProps contract. Class names are
// `pab-*` (PageAgent-Availability-Banner) so they never collide with `.pa-*` (panel),
// `.pak-*` (primitives), `.pcg-*` (gate), `.pal-*` (locus), `.pac-*` or `.pah-*`.

import { useId, useRef, useState } from 'react';
import type { AvailabilityProps } from './contracts';
import { Button } from '../components/primitives';
import { OutboundApertureIcon } from '../components/icons';
import './availability.css';

/* The trade, stated in full BEFORE the opt-in is reachable — never paraphrased down. */
const CLOUD_TRADE =
  "The cloud fallback sends this page's tool list and your request to a server to " +
  'decide what to do — different from on-device mode, where nothing leaves your ' +
  "machine. Don't use it on pages with private or sensitive information.";

export function AvailabilityBanner({ reason, cloudOffered, onUseCloudOnce }: AvailabilityProps) {
  const titleId = useId();
  const panelId = useId();
  const rootRef = useRef<HTMLElement>(null);
  // The trade panel is disclosed on purpose; the [Use cloud once] opt-in only exists
  // once the trade is on screen, so the cost is always read before the button appears.
  const [open, setOpen] = useState(false);

  // [Not now] collapses the offer and returns focus to the (always-mounted) disclosure
  // toggle, so keyboard focus is never dropped when the panel is hidden.
  function decline() {
    setOpen(false);
    rootRef.current?.querySelector<HTMLElement>('.pab__toggle')?.focus();
  }

  return (
    <section ref={rootRef} className="pab" aria-labelledby={titleId}>
      <p className="pab__title" id={titleId}>
        {reason}
      </p>
      <p className="pab__body">
        You can still browse the tools found on this page, run one, and inspect the scan.{' '}
        <strong className="pab__body-strong">Chat needs the on-device model.</strong>
      </p>

      {cloudOffered ? (
        <div className="pab__offshore">
          <div className="pab__offshore-head">
            <OutboundApertureIcon size={18} className="pab__aperture" />
            <span className="pab__offshore-title">Cloud fallback — runs off your device</span>
          </div>

          <Button
            variant="ghost"
            className="pab__toggle"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Hide what it sends' : 'Show what it sends'}
          </Button>

          <div id={panelId} className="pab__panel" hidden={!open}>
            {/* Trade stated BEFORE use — the cost sits above the opt-in, never after it. */}
            <p className="pab__trade">{CLOUD_TRADE}</p>
            <div className="pab__actions">
              <Button variant="ghost" className="pab__use" onClick={onUseCloudOnce}>
                <OutboundApertureIcon size={18} className="pab__use-aperture" />
                Use cloud once
              </Button>
              <Button variant="ghost" className="pab__decline" onClick={decline}>
                Not now
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
