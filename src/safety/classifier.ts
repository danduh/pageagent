// Reversibility classifier + Confirm-gate preview builder (Plan §8, Step 4.4).
//
// MOCK for Scope A — the real engine (Step 8.3) replaces classifyTier behind the same
// signature: keyword + action-type + origin sensitivity + a reversibility-confidence
// bar, biased conservative on authenticated/high-stakes origins. The un-configurable
// Tier-2 hard-stop class (pay/send money, sign out, delete/close account, irreversible
// send) can never be silenced by any trust setting.

import type { GatePreview, RiskTier, Tool } from '../engine/types';

const TIER2: RegExp[] = [
  /\bpay\b/,
  /\bsend (money|payment)\b/,
  /\btransfer\b/,
  /\$\s?\d/,
  /\bsign\s?out\b/,
  /\blog\s?out\b/,
  /delete (my |the )?account/,
  /close (my |the )?account/,
];

const TIER1: RegExp[] = [
  /\bcancel\b/,
  /\bdelete\b/,
  /\bremove\b/,
  /\bdiscard\b/,
  /\bsubmit\b/,
  /\bunsubscribe\b/,
];

/** Mock reversibility tier for a request. Tier 0 flows; Tier 1 gates; Tier 2 hard-stops. */
export function classifyTier(text: string): RiskTier {
  const t = text.toLowerCase();
  if (TIER2.some((r) => r.test(t))) return 2;
  if (TIER1.some((r) => r.test(t))) return 1;
  return 0;
}

/** Build a truthful, verifiable preview for a Tier-1/2 action (mock, from the request). */
export function buildGatePreview(text: string, tier: 1 | 2): GatePreview {
  const t = text.toLowerCase();
  const provenance = `Because you asked: "${text.trim()}"`;

  if (
    tier === 2 &&
    (/\bpay\b/.test(t) || /\$\s?\d/.test(t) || /send (money|payment)|transfer/.test(t))
  ) {
    return {
      tier: 2,
      verb: 'click',
      toolName: 'click_pay_now',
      targetLabel: 'the "Pay" button in Checkout',
      value: '$500.00 to Jordan Rivera',
      consequence: 'This sends $500.00 now and can’t be undone from here.',
      provenance,
      reacknowledge: '$500.00',
      proceedLabel: 'Pay $500.00',
      cancelLabel: 'Don’t pay',
      locatable: true,
    };
  }

  if (tier === 2 && /sign\s?out|log\s?out/.test(t)) {
    return {
      tier: 2,
      verb: 'click',
      toolName: 'click_sign_out',
      targetLabel: 'the "Sign out" item in the account menu',
      consequence: 'You’ll be signed out of Chase and need your password to get back in.',
      provenance,
      reacknowledge: 'Chase',
      proceedLabel: 'Sign out',
      cancelLabel: 'Stay signed in',
      locatable: true,
    };
  }

  // Tier-1 default — the "cancel subscription" centrepiece.
  return {
    tier: 1,
    verb: 'click',
    toolName: 'click_cancel_subscription',
    targetLabel: 'the "Cancel subscription" button in Billing',
    consequence: 'This ends your Pro plan on 30 Aug 2026 and can’t be undone from here.',
    provenance,
    proceedLabel: 'Cancel subscription',
    cancelLabel: 'Don’t cancel',
    locatable: true,
  };
}

/**
 * Build a Confirm-gate preview for running one tool by hand (Execute, Step 5.5).
 * An unlabeled tool can't be located reliably, so the gate DECLINES rather than
 * proceeding (locate-or-decline). Only called for risk >= 1 tools.
 */
export function previewForTool(tool: Tool, value?: string): GatePreview {
  const tier: 1 | 2 = tool.risk === 2 ? 2 : 1;
  const hasValue = Boolean(value && value.trim().length > 0);
  return {
    tier,
    verb: tool.actionType,
    toolName: tool.id,
    targetLabel: `"${tool.name}" (${tool.provenance})`,
    value: hasValue ? value : undefined,
    consequence:
      tier === 2
        ? 'This is a high-consequence action and can’t be undone from here.'
        : 'This may be hard to undo.',
    provenance: `Because you ran "${tool.name}" from the Tools list.`,
    reacknowledge: tier === 2 ? tool.name : undefined,
    proceedLabel: tool.name,
    cancelLabel: 'Don’t run it',
    locatable: !tool.unlabeled,
  };
}
