// The Confirm-gate (Plan Steps 4.2 + 4.3, issue #35) — the load-bearing safety layer.
//
// Visually an inline transcript card; BEHAVIORALLY a focus-trapped modal:
//   role="alertdialog" + aria-modal so AT treats it as the hard interruption it is,
//   aria-labelledby (the gate title) + aria-describedby (the truthful preview body),
//   sitting on the reserved top layer (--pa-z-gate) behind a scrim.
//
// Anti-reflex contract (safety-critical — every rule is deliberate):
//   • On mount focus moves to the SAFE action (Cancel) — NEVER Approve.
//   • Tab / Shift+Tab are trapped and cycle within the dialog; Escape → onCancel.
//   • Enter can never confirm: buttons are plain type="button", there is NO <form>
//     and no default/submit button, and initial focus sits on Cancel — so a reflexive
//     Enter or Return activates the safe action, never Approve.
//   • LOCATE-OR-DECLINE: when preview.locatable === false the gate declines outright
//     ("I did nothing") with a single dismiss button — there is no Approve path at all.
//   • TIER 2 requires a VALUE RE-ACKNOWLEDGMENT (a real checkbox tied to the concrete
//     value) before Approve is even enabled. This is a COMPREHENSION act — no timer,
//     no countdown, no press-and-hold, no disabled-then-enabled-on-a-clock.
//   • UNSURE posture is a distinct uncertainty marker, not a louder red.
//
// Presentational only: it depends on the frozen ConfirmGateProps contract. Returning
// focus to the triggering context on close is the PARENT's job — this component only
// promises not to steal focus back.

import { useEffect, useId, useRef, useState } from 'react';
import type { ConfirmGateProps } from './contracts';
import type { ActionType } from '../engine/types';
import { Button } from '../components/primitives';
import { CheckpointIcon } from '../components/icons';
import './confirm-gate.css';

/* Plain-language lead-in for the action verb; the on-page target phrase completes it,
 * e.g. "Click" + "the \"Cancel subscription\" button in Billing". */
const VERB_LABEL: Record<ActionType, string> = {
  click: 'Click',
  type: 'Type into',
  choose: 'Choose in',
  'follow-link': 'Follow',
};

/* Everything focusable inside the trap. Approve, while disabled (Tier-2 pre-ack), is
 * NOT matched — so it stays out of the tab cycle until the re-acknowledgment enables it.
 * The set is re-queried on every Tab, so it tracks that dynamic change. */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmGate({ preview, onApprove, onCancel }: ConfirmGateProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const ackId = useId();
  const ackLabelId = useId();

  // The re-acknowledgment checkbox state — the SOLE Tier-2 lever. It is comprehension,
  // never time: nothing here is driven by a timer or a sustained gesture.
  const [acked, setAcked] = useState(false);

  // Move focus to the SAFE action once, on mount. Never Approve. (Run-once: we must not
  // yank focus back on later re-renders.)
  useEffect(() => {
    const safe = dialogRef.current?.querySelector<HTMLElement>('.pcg__safe');
    safe?.focus();
  }, []);

  // Focus trap + Escape. Attached natively (not as a JSX handler) so the dialog role
  // carries no static-interaction handler, and so it sees keys from any focused control.
  useEffect(() => {
    const root = dialogRef.current;
    if (!root) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !root) return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !root.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  // Locate-or-decline: an unlocatable target NEVER gates-and-proceeds.
  const decline = preview.locatable === false;
  const tier2 = preview.tier === 2 && !decline;
  const unsure = Boolean(preview.unsure) && !decline;

  // Tier-2 keeps Approve disabled until the concrete value is actively re-acknowledged.
  const requiresReack = tier2;
  const canApprove = !requiresReack || acked;
  const reackText = preview.reacknowledge ?? preview.proceedLabel;

  const title = decline
    ? 'I didn’t do that'
    : unsure
      ? 'Checking with you first'
      : tier2
        ? 'High-consequence — confirm carefully'
        : 'Confirm before I continue';

  const rootClass = [
    'pcg',
    decline && 'pcg--decline',
    tier2 && 'pcg--tier2',
    unsure && 'pcg--unsure',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="pcg-overlay">
      {/* Decorative dimming scrim — the reserved top layer sits above every surface. */}
      <div className="pcg-scrim" aria-hidden="true" />

      <div
        ref={dialogRef}
        className={rootClass}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        <div className="pcg__header">
          {/* The checkpoint barrier marks the gate — decorative, and deliberately never
              a padlock/shield. Meaning always rides in the title text beside it. */}
          {!decline ? <CheckpointIcon size={22} className="pcg__mark" /> : null}
          <p className="pcg__title" id={titleId}>
            {title}
          </p>
        </div>

        {/* Unsure posture: an uncertainty marker, visually distinct from confident
            destructive — a calm caution note, NOT a louder red. */}
        {unsure ? (
          <p className="pcg__unsure">
            <span className="pcg__unsure-tag">Not certain</span>
            I’m not certain this can be undone, so I’m checking first.
          </p>
        ) : null}

        <div className="pcg__body" id={bodyId}>
          {decline ? (
            <p className="pcg__consequence">
              I couldn’t find or verify that control on the page, so I did nothing.
            </p>
          ) : (
            <>
              {/* 1) the action verb (plain) + 2) the doubly-identified target: the
                  on-page label/location, then the machine tool-id shown for inspection. */}
              <p className="pcg__action">
                <span className="pcg__verb">{VERB_LABEL[preview.verb]}</span> {preview.targetLabel}
              </p>
              <p className="pcg__toolname">
                <span className="pcg__vh">Tool identifier: </span>
                <code className="pcg__toolname-code">{preview.toolName}</code>
              </p>

              {/* 3) the VERBATIM value — quoted (quotes are CSS-decorative so the read
                  value stays exact) and set in a distinct mono/filament block, so it can
                  never be mistaken for the gate’s own prose. */}
              {preview.value ? (
                <div className="pcg__value">
                  <span className="pcg__value-label">Exact value</span>
                  <code className="pcg__value-text">{preview.value}</code>
                </div>
              ) : null}

              {/* 4) the plain consequence + reversibility class. */}
              <p className="pcg__consequence">{preview.consequence}</p>
            </>
          )}

          {/* 5) provenance — the "Because you asked…" line; the anti-injection tell. */}
          {preview.provenance ? <p className="pcg__provenance">{preview.provenance}</p> : null}
        </div>

        {/* Tier-2 value re-acknowledgment — a real, keyboard/switch/SR-operable checkbox
            tied to the concrete value. Approve stays disabled until it is satisfied. No
            timer, no press-and-hold, no disabled-then-enabled-on-a-clock. */}
        {requiresReack ? (
          <div className="pcg__ack">
            <input
              id={ackId}
              type="checkbox"
              className="pcg__ack-box"
              checked={acked}
              onChange={(event) => setAcked(event.target.checked)}
            />
            <label id={ackLabelId} htmlFor={ackId} className="pcg__ack-label">
              I confirm: <span className="pcg__ack-value">{reackText}</span>
            </label>
          </div>
        ) : null}

        <div className="pcg__footer">
          {decline ? (
            // Locate-or-decline: a single dismiss control, no Approve path whatsoever.
            <Button variant="ghost" className="pcg__btn pcg__safe" onClick={onCancel}>
              Close
            </Button>
          ) : (
            <>
              {/* SAFE action holds default focus. Ghost weight, verbatim cancel label. */}
              <Button variant="ghost" className="pcg__btn pcg__safe" onClick={onCancel}>
                {preview.cancelLabel}
              </Button>
              {/* The deliberate, secondary action — verb-restating proceed. Halt accent
                  is reserved for Tier 2; Tier 1 is a firm, neutral commitment. */}
              <Button
                variant={tier2 ? 'destructive' : 'firm'}
                className="pcg__btn"
                disabled={!canApprove}
                aria-describedby={requiresReack ? ackLabelId : undefined}
                onClick={() => {
                  if (canApprove) onApprove();
                }}
              >
                {preview.proceedLabel}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
