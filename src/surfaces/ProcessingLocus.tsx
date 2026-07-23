// Processing-locus indicator (Plan Step 4.1, issue #34).
//
// A self-contained, truthful state machine naming WHERE the current turn's
// reasoning runs. Driven purely by injected props (LocusProps) — no engine
// coupling. Three honest states, coded REDUNDANTLY so meaning survives full
// greyscale AND forced-colors WITHOUT relying on hue:
//
//   • on-device   — QUIET dormant instrumentation: a lit Local-node at rest.
//                   No warning affordance, no padlock/shield, no standing
//                   "protected"/"secure" claim. Reads as an instrument at rest.
//   • unavailable — the same node, dimmed and struck with an "off-signal" mark,
//                   fully muted, and spelled out in words.
//   • off-device  — a DISTINCT MATERIAL: outbound-aperture glyph, Offshore hue,
//                   dashed/ticked bordered panel, tinted fill — and it NAMES
//                   what left. The on-device→off-device flip is the one place a
//                   slightly stronger, out-of-frame motion is reserved (with a
//                   reduced-motion static equivalent).
//
// audioEgress (LATER / voice): whenever ANY audio leaves the device, an always-on
// audio-egress marker lights up, SUPPRESSES the private resting affordance even
// while reasoning stays local, and names what left. (Compound signal vs.
// most-exposed-path is owner decision D6 — unresolved; this implements the
// compound signal: a reasoning-locus row plus the lit egress marker.)
//
// Meaning is ALWAYS carried in TEXT; every glyph is decorative (aria-hidden via
// the icon set's default). The indicator is a polite live region so the
// privacy-critical transitions (resting → leaves-device, audio egress on) are
// announced, never silent.

import { useEffect, useRef, useState } from 'react';
import type { LocusProps } from './contracts';
import type { LocusState } from '../engine/types';
import { LocalNodeIcon, OutboundApertureIcon } from '../components/icons';
import './processing-locus.css';

/* Resting/leaves-device copy — the state is always spelled out in words; hue and
 * material only reinforce it. No "protected"/"secure" claim anywhere. */
const LABEL: Record<LocusState, string> = {
  'on-device': 'On your device',
  unavailable: 'On-device AI unavailable',
  'off-device': 'Leaves your device',
};

/* On a mixed (audio-egress) turn the node row states only where the REASONING
 * ran — the egress marker carries the leaves-device truth. */
const REASONING_LABEL: Record<LocusState, string> = {
  'on-device': 'Reasoning on your device',
  unavailable: 'On-device AI unavailable',
  'off-device': 'Reasoning off your device',
};

/* Mixed-turn detail — derived from the reasoning locus so it never overclaims: it only
 * says reasoning "stayed on your device" when it actually did (never on an off-device turn). */
const MIXED_DETAIL: Record<LocusState, string> = {
  'on-device': 'Audio was sent for transcription; reasoning stayed on your device.',
  unavailable: 'Audio was sent for transcription.',
  'off-device': 'Both your audio and the reasoning left your device.',
};

export function ProcessingLocus({ locus, audioEgress = false }: LocusProps) {
  const previousLocus = useRef<LocusState>(locus);
  const [flipping, setFlipping] = useState(false);

  // The on-device → off-device flip is the ONE place a slightly stronger,
  // out-of-frame motion is reserved. Fire it only on that exact transition (never
  // on mount, never during a mixed audio-egress turn). prefers-reduced-motion
  // collapses the animation to its static end-state via the global tokens rule.
  useEffect(() => {
    const previous = previousLocus.current;
    previousLocus.current = locus;
    if (audioEgress || previous !== 'on-device' || locus !== 'off-device') {
      return;
    }
    setFlipping(true);
    const timer = window.setTimeout(() => setFlipping(false), 420);
    return () => window.clearTimeout(timer);
  }, [locus, audioEgress]);

  // Mixed turn: audio is leaving for transcription. The egress marker is always-on
  // and SUPPRESSES the private resting affordance even while reasoning stays local.
  if (audioEgress) {
    return (
      <div className="pal pal--mixed" role="status">
        <span className="pal__reasoning">
          <span className={`pal__node pal__node--${locus}`}>
            {locus === 'off-device' ? (
              <OutboundApertureIcon size={16} />
            ) : (
              <LocalNodeIcon size={16} />
            )}
          </span>
          <span className="pal__label">{REASONING_LABEL[locus]}</span>
        </span>
        <span className="pal__egress">
          <OutboundApertureIcon size={16} />
          <span className="pal__egress-label">Audio leaves your device</span>
        </span>
        <span className="pal__detail">{MIXED_DETAIL[locus]}</span>
      </div>
    );
  }

  // Off-device: a distinct material that reads as "different track", and names
  // exactly what left. Carries the reserved out-of-frame flip motion.
  if (locus === 'off-device') {
    return (
      <div className={`pal pal--off-device${flipping ? ' is-flipping' : ''}`} role="status">
        <span className="pal__aperture">
          <OutboundApertureIcon size={16} />
        </span>
        <span className="pal__body">
          <span className="pal__label">{LABEL['off-device']}</span>
          <span className="pal__detail">This page’s tools and your request go to a server.</span>
        </span>
        {/* Decorative out-of-frame motion trace — visible only during the flip. */}
        <span className="pal__trace" aria-hidden="true" />
      </div>
    );
  }

  // on-device (quiet resting) and unavailable (dimmed, struck) share the calm
  // inline node; they are told apart by node luminance, the off-signal material,
  // and — always — the label text.
  return (
    <div className={`pal pal--${locus}`} role="status">
      <span className={`pal__node pal__node--${locus}`}>
        <LocalNodeIcon size={16} />
      </span>
      <span className="pal__label">{LABEL[locus]}</span>
    </div>
  );
}
