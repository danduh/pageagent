// The executor (Steps 8.4/8.5/9.1). Performs ONE action against a re-resolved, verified
// live element — or DECLINES (locate-or-decline). Every path is fail-safe: it re-resolves
// at act-time (a fresh liveness re-check, not the scan-time snapshot), refuses to act on
// not-found / ambiguous / hidden / disabled, and OBSERVES the page before/after so the
// report-back can only claim "Done" when a concrete change was actually seen (Step 9.1 /
// the certainty ladder). `dryRun` re-resolves + verifies + highlights WITHOUT acting — the
// gate's locate-or-decline preflight.

import type { ActionType } from '../engine/types';
import type { ElementFingerprint, ExecOutcome, ObservedChange } from '../engine/scan-types';
import { liveLabel, reResolve } from './resolve';

export interface ExecuteParams {
  fingerprint: ElementFingerprint;
  actionType: ActionType;
  value?: string;
  dryRun?: boolean;
  root?: Document | ShadowRoot | Element;
}

/** A compact snapshot of everything observable about a control + the page URL. */
function snapshot(el: Element): string {
  const parts: string[] = [];
  const withValue = el as unknown as { value?: unknown; checked?: unknown };
  if (typeof withValue.checked === 'boolean') parts.push(`checked=${withValue.checked}`);
  const ariaChecked = el.getAttribute('aria-checked');
  if (ariaChecked) parts.push(`aria-checked=${ariaChecked}`);
  const ariaPressed = el.getAttribute('aria-pressed');
  if (ariaPressed) parts.push(`aria-pressed=${ariaPressed}`);
  if (typeof withValue.value === 'string') parts.push(`value=${withValue.value}`);
  const href = typeof location !== 'undefined' ? location.href : '';
  return `${parts.join(' ')} @ ${href}`;
}

function currentUrl(): string {
  return typeof location !== 'undefined' ? location.href : '';
}

function isOn(el: Element): boolean | null {
  const withChecked = el as unknown as { checked?: unknown };
  if (typeof withChecked.checked === 'boolean') return withChecked.checked;
  const ariaChecked = el.getAttribute('aria-checked');
  if (ariaChecked === 'true' || ariaChecked === 'false') return ariaChecked === 'true';
  const ariaPressed = el.getAttribute('aria-pressed');
  if (ariaPressed === 'true' || ariaPressed === 'false') return ariaPressed === 'true';
  return null;
}

function highlight(el: Element): void {
  const h = el as unknown as { style?: { outline?: string; outlineOffset?: string } };
  if (!h.style) return;
  const prevOutline = h.style.outline ?? '';
  const prevOffset = h.style.outlineOffset ?? '';
  h.style.outline = '2px solid #0F9C8E';
  h.style.outlineOffset = '2px';
  if (typeof setTimeout === 'function') {
    setTimeout(() => {
      h.style!.outline = prevOutline;
      h.style!.outlineOffset = prevOffset;
    }, 2000);
  }
}

/** Perform the DOM action. Returns whether a value/selection was applied for observation. */
function act(el: Element, actionType: ActionType, value: string | undefined): void {
  const anyEl = el as unknown as {
    value?: string;
    checked?: boolean;
    click?: () => void;
    dispatchEvent?: (e: Event) => boolean;
    scrollIntoView?: (opts?: unknown) => void;
  };
  anyEl.scrollIntoView?.({ block: 'center' });

  switch (actionType) {
    case 'type': {
      if (typeof anyEl.value === 'string') {
        anyEl.value = value ?? '';
        anyEl.dispatchEvent?.(new Event('input', { bubbles: true }));
        anyEl.dispatchEvent?.(new Event('change', { bubbles: true }));
      }
      return;
    }
    case 'choose': {
      if (typeof anyEl.value === 'string' && value != null) {
        anyEl.value = value;
        anyEl.dispatchEvent?.(new Event('change', { bubbles: true }));
      } else {
        anyEl.click?.();
      }
      return;
    }
    case 'click':
    case 'follow-link': {
      anyEl.click?.();
      return;
    }
  }
}

function describeChange(
  el: Element,
  before: string,
  after: string,
  urlBefore: string,
  urlAfter: string,
  actionType: ActionType,
  value: string | undefined
): ObservedChange {
  if (urlBefore !== urlAfter) {
    return { summary: `the page navigated to ${urlAfter}.`, verified: true, urlChanged: true };
  }
  if (actionType === 'type') {
    const withValue = el as unknown as { value?: unknown };
    const got = typeof withValue.value === 'string' ? withValue.value : '';
    const applied = got === (value ?? '');
    // "Done" requires an OBSERVED change — not just that the final value equals the target.
    // A field that already held the value is a no-op, not a success (review finding).
    if (applied && before !== after) return { summary: `the field now shows "${got}".`, verified: true };
    if (applied) return { summary: `the field already showed "${got}", so nothing changed.`, verified: false };
    return { summary: `I typed the value, but the field didn't take it.`, verified: false };
  }
  const on = isOn(el);
  if (on !== null && before !== after) {
    return { summary: `it's now ${on ? 'on' : 'off'}.`, verified: true };
  }
  if (before !== after) {
    return { summary: `the control's state changed after the click.`, verified: true };
  }
  return {
    summary: `I clicked it, but I can't see a change from here — check the page.`,
    verified: false,
  };
}

/** Re-resolve + verify + (unless dryRun) act + observe. Never acts on an unverified node. */
export function executeAction(params: ExecuteParams): ExecOutcome {
  const { fingerprint, actionType, value, dryRun, root } = params;
  const res = reResolve(fingerprint, root ?? (typeof document !== 'undefined' ? document : undefined!));

  if (res.kind === 'not-found') return { kind: 'declined', reason: 'not-found' };
  if (res.kind === 'ambiguous') {
    return { kind: 'declined', reason: 'ambiguous', detail: `${res.matches} matching controls` };
  }

  const { analyzed } = res;
  // Liveness re-check at act-time (the resolver already filtered to visible controls).
  if (!analyzed.enabled) return { kind: 'declined', reason: 'disabled' };
  if (!analyzed.el.isConnected) return { kind: 'declined', reason: 'stale' };

  highlight(analyzed.el);

  if (dryRun) return { kind: 'located', label: liveLabel(analyzed) };

  const before = snapshot(analyzed.el);
  const urlBefore = currentUrl();
  act(analyzed.el, actionType, value);
  const after = snapshot(analyzed.el);
  const urlAfter = currentUrl();

  const observed = describeChange(analyzed.el, before, after, urlBefore, urlAfter, actionType, value);
  return { kind: 'executed', observed };
}
