// Element re-resolution (Steps 8.2/8.4/8.5, Spike B). Given a fingerprint captured at
// scan time, find the SAME control in the CURRENT DOM and verify it — or decline. This
// underpins the pre-execute liveness re-check and the Confirm-gate's locate-or-decline
// guarantee, so it is deliberately conservative:
//
//   • candidates are matched by role + accessible-name + tag + input-type (the merit-
//     based survivors from Spike B), and only VISIBLE ones count as live targets;
//   • ties are broken ONLY by a stable id or nearby-text — NEVER by position/ordinal,
//     because a reorder makes position point at the wrong control (the dangerous Spike-B
//     failure). If only position could tell them apart ⇒ AMBIGUOUS ⇒ decline;
//   • 0 matches ⇒ not-found. Both not-found and ambiguous are honest declines — we never
//     fall back to a positional guess that acts.

import type { ElementFingerprint } from '../engine/scan-types';
import { analyzeActionable, walkDom, type Analyzed } from './scanner';

export type Resolution =
  | { kind: 'resolved-verified'; analyzed: Analyzed }
  | { kind: 'not-found' }
  | { kind: 'ambiguous'; matches: number };

function sameKind(a: Analyzed, fp: ElementFingerprint): boolean {
  return (
    a.role === fp.role &&
    a.name === fp.name &&
    a.tag === fp.tag &&
    (a.inputType ?? '') === (fp.inputType ?? '')
  );
}

/** Re-resolve a stored fingerprint to a single live, verified element — or decline. */
export function reResolve(
  fp: ElementFingerprint,
  root: Document | ShadowRoot | Element = document
): Resolution {
  const candidates: Analyzed[] = [];
  walkDom(root, {}, (el) => {
    const a = analyzeActionable(el);
    // Only VISIBLE controls are live action targets; role+name+tag+type must match.
    if (a && a.visible && sameKind(a, fp)) candidates.push(a);
  });

  if (candidates.length === 0) return { kind: 'not-found' };

  if (candidates.length === 1) {
    // Even a lone match must be CONFIRMED, not assumed: a present-but-different stable id
    // or nearby label means a DIFFERENT control replaced the scan-time target (e.g. a list
    // re-rendered down to one remaining row). Decline rather than act on the wrong node.
    const only = candidates[0];
    if (fp.stableId && only.stableId && only.stableId !== fp.stableId) return { kind: 'not-found' };
    if (fp.nearbyText && only.nearbyText && only.nearbyText !== fp.nearbyText) return { kind: 'not-found' };
    return { kind: 'resolved-verified', analyzed: only };
  }

  // More than one identical-looking control. Only a STABLE ID is genuinely per-control, so
  // it is the ONLY signal allowed to pick the acting control. `nearbyText` is NOT used to
  // disambiguate here: a single label shared by several controls encodes "which one is
  // first", a positional identity that reorders (Spike B / review finding). If a stable id
  // can't uniquely resolve, DECLINE as ambiguous — locate-or-decline over a wrong guess.
  if (fp.stableId) {
    const byId = candidates.filter((c) => c.stableId === fp.stableId);
    if (byId.length === 1) return { kind: 'resolved-verified', analyzed: byId[0] };
  }
  return { kind: 'ambiguous', matches: candidates.length };
}

/** A truthful on-page label for a resolved control (for the gate preview / highlight). */
export function liveLabel(a: Analyzed): string {
  if (a.name) return a.name;
  const near = a.nearbyText ? ` near "${a.nearbyText}"` : '';
  return `an unlabeled ${a.role}${near}`;
}
