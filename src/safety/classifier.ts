// Reversibility classifier + Confirm-gate preview builder (Plan §8, Step 8.3).
//
// The REAL classifier: it tiers each Action from keyword signals + Action-type + origin
// sensitivity + a reversibility-confidence bar, and enforces an UN-CONFIGURABLE Tier-2
// hard-stop class (pay/send money, sign out, delete/close account, irreversible send) that
// no trust setting or option can silence. Deterministic + pure + unit-tested — Nano is weak
// here, so it is NEVER model-alone. The keyword tiers are an unchangeable FLOOR; Action-type
// + origin only ESCALATE (never downgrade), so a high-stakes origin biases conservative
// while normal-origin behaviour — and every existing tier — is unchanged.

import type { ActionType, GatePreview, RiskTier, Tool } from '../engine/types';

// --- Un-configurable Tier-2 hard-stop set (membership = D10) ------------------
// Money movement + account destruction + sign-out. Patterns tolerate INTERPOSED words
// (`[\s\S]{0,N}?`) so an evasive site-declared name like `sendAllMoney` / `closeUserAccount`
// (humanized to "send all money" / "close user account") still trips the hard-stop — the
// site controls the name, so the check must not depend on the exact verb it chose. The word
// lists are deliberately WIDE: for money + account destruction, over-asking is the safe
// direction. Membership must not hinge on a single literal verb/noun (review finding).
const TIER2: RegExp[] = [
  // Money movement — bare pay/buy/donate, a spending verb next to a money noun/amount, cash-out.
  // A currency amount ONLY counts next to a spending verb (so a bare price like "$5 off" or a
  // read-only "Cash balance" is NOT money movement — review finding).
  /\bpay\b/,
  /\bbuy\b/,
  /\bdonate\b/,
  /\bcash\s?out\b/,
  /\b(order|checkout|pay|buy)\s+now\b/,
  /\bproceed\b[\s\S]{0,10}?\b(pay|payment|checkout|purchase)\b/,
  /\bempty\b[\s\S]{0,10}?\bbalance\b/,
  /\b(make|complete|confirm|submit|place|review|send|transfer|wire|withdraw|move|deposit|pay|process|authoriz|approv|schedul|remit|drain)\w*[\s\S]{0,20}?(\b(money|payment|payments|transfer|transaction|funds?|balance|crypto|bitcoin|wallet|savings|invoice|order|purchase|checkout|withdrawal|deposit|bid|bids)\b|[$£€]\s?\d|\b\d[\d,.]*\s?(usd|eur|gbp|cad|aud|dollars?|euros?|btc|eth)\b)/,
  // Sign-out / log-out / sign-off — tolerant of hyphen or run-together; the interposed-word
  // form is "out" only, so a settings label like "Log scale off" is not read as a sign-out.
  /\b(sign|log)[\s\-_]*?(out|off)\b/,
  /\b(sign|log)\s+\w+\s+out\b/,
  // Account destruction — verb→account and account→noun-form, both orders, incl. 'acct'.
  /\b(close|delet|deactivat|terminat|deprovision|suspend|remov|reset|disable|cancel|wipe|eras|purg)\w*\b[\s\S]{0,25}?\b(account|acct)\b/,
  /\b(account|acct)\b[\s\S]{0,25}?\b(deletion|removal|termination|closure|deactivation|cancellation|deprovision\w*)\b/,
];

// Run-together / all-caps declared names that humanize() can't split into words (e.g.
// "DELETEACCOUNT", "sendMoney" → "sendmoney"). Only applied to SINGLE-token labels (no
// whitespace) so stripping separators can never fuse two innocent words — "Analog output"
// stays untouched while "signout" is caught by the word-boundary patterns above (review finding).
const TIER2_SQUISHED: RegExp[] = [
  /(delet|remov|close|deactivat|terminat)\w*account/,
  /account(deletion|removal|closure|termination|deactivation)/,
  /(send|transfer|wire|withdraw|pay|move|deposit|remit|drain)(money|funds?|cash|balance|payment)/,
  /emptybalance/,
];

// Clearly-destructive verbs → gate (Tier 1). A FLOOR: never downgraded by any signal.
const TIER1: RegExp[] = [
  /\bcancel\b/,
  /\bdelete\b/,
  /\bremove\b/,
  /\bdiscard\b/,
  /\bsubmit\b/,
  /\bunsubscribe\b/,
  /\bdeactivate\b/,
  /\brevoke\b/,
  /\bterminate\b/,
  /\bdestroy\b/,
  /\bwithdraw\b/, // money-out; "withdraw money" escalates to Tier 2 via the pattern above
  /\b(wipe|erase|purge)\b/,
  // Noun forms of the destructive verbs above.
  /\b(deletion|removal|termination|deactivation|cancellation)\b/,
  // Irreversible bulk clears / empties — but NOT benign "clear filter/search/form".
  /\bempty\b[\s\S]{0,15}?\b(trash|bin|recycle|folder|inbox|mailbox)\b/,
  /\bclear\b[\s\S]{0,15}?\b(history|data|records|messages|inbox|logs?|everything)\b/,
  /\bdelete\b[\s\S]{0,15}?\b(forever|permanently|all|everything)\b/,
  /\bpermanently\b/,
];

// Ambiguous / possibly-consequential verbs. On a HIGH-STAKES origin these lower an Action's
// reversibility confidence enough to escalate it to a gate; on a normal origin they do NOT
// re-tier — benign verbs (save/reset/disable/toggle/off/search) are deliberately excluded so
// friction stays scarce.
const MILD_RISK =
  /\b(confirm|continue|proceed|submit|apply|authorize|approve|grant|verify|send|transfer|withdraw|deposit|move|pay|buy|purchase|order|checkout|place|subscribe|upgrade|downgrade|renew|schedule|book|change|update|modify|replace|link|connect|add|create|activate|enable|publish|post|share)\b/;

// Heuristic high-stakes origin signal (best-effort — NEVER the sole safety mechanism; the
// Tier-2 hard-stop set is origin-independent). SUBSTRING match, not word-anchored: hostnames
// embed these words ("mybank", "bankofx", "onlinebilling"), and a rare false positive only
// adds a confirm to an ambiguous control — the safe direction ("bias conservative"). Terms
// prone to collisions (chase→purchase, citi→citizen, wire→wireless, exchange→stackexchange)
// are deliberately omitted; owner-extendable via ClassifierOptions.highStakesOrigins.
const HIGH_STAKES_ORIGIN =
  /(bank|finance|financial|payment|paypal|venmo|coinbase|binance|checkout|billing|invoice|mortgage|lending|brokerage|investing|investment|crypto|blockchain|fintech|insurance|pension|treasury|remittance|payroll|wellsfargo)/;

/** Base reversibility confidence by Action-type: typing / choosing / navigating are easy to
 *  undo; a click's effect is unknown, so it sits lower. Owner-tunable via the constants. */
const BASE_CONFIDENCE: Record<ActionType, number> = {
  type: 0.9,
  choose: 0.85,
  'follow-link': 0.8,
  click: 0.75,
};
const NO_ACTION_TYPE_CONFIDENCE = 0.7;
const MILD_RISK_PENALTY = 0.35;
const DEFAULT_REVERSIBILITY_BAR = 0.5; // D7 — owner-tunable via ClassifierOptions.
const HIGH_STAKES_MARGIN = 0.2;

/** The signals the classifier reads for one Action. */
export interface ActionSignal {
  /** The control's plain label / tool name (page-derived). */
  label: string;
  /** click | type | choose | follow-link — modulates base reversibility confidence. */
  actionType?: ActionType;
  /** The frame/page origin the control belongs to — drives the high-stakes bias. */
  origin?: string;
  /** True when no accessible name could be read — can't assess the target → gate. */
  unlabeled?: boolean;
}

/** Owner-tunable knobs. None can lower a Tier-2 hard-stop (that set is un-configurable). */
export interface ClassifierOptions {
  /** Reversibility-confidence bar (D7): a high-stakes control below this gates. Default 0.5. */
  reversibilityBar?: number;
  /** Extra origin substrings to treat as high-stakes (in addition to the built-in signal). */
  highStakesOrigins?: string[];
}

export interface Classification {
  tier: RiskTier;
  /** Estimated reversibility confidence ∈ [0,1]; drives the high-stakes escalation. */
  confidence: number;
  /** The signals that set the tier — for tests + inspection, never fed to the model. */
  reasons: string[];
}

// A small set of Latin look-alike characters (Cyrillic / Greek) an evasive label might use to
// dodge the keyword checks (e.g. "dеlete" with a Cyrillic "е"). NFKC (below) already folds
// full-width + compatibility forms like "＄" and "ⅾ"; this covers the confusable letters NFKC
// leaves alone. Best-effort — the classifier is one layer, never the only safety mechanism.
const HOMOGLYPHS: Record<string, string> = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x', ѕ: 's', і: 'i', ј: 'j', ԁ: 'd', к: 'k',
  ο: 'o', ρ: 'p', ν: 'v', α: 'a', ϲ: 'c',
};

/** Fold a page-derived label to a comparable form: NFKC (full-width / compatibility) +
 *  lowercase + confusable look-alikes → ASCII, so odd spellings can't slip past the checks. */
function normalizeLabel(s: string): string {
  const nfkc = s.normalize('NFKC').toLowerCase();
  let out = '';
  for (const ch of nfkc) out += HOMOGLYPHS[ch] ?? ch;
  return out;
}

function keywordTier(label: string, squished: string): RiskTier {
  if (TIER2.some((r) => r.test(label))) return 2;
  // The run-together check runs ONLY for a single-token label (squished is '' otherwise), so
  // stripping separators can never fuse two adjacent innocent words into a hard-stop substring.
  if (squished && TIER2_SQUISHED.some((r) => r.test(squished))) return 2;
  if (TIER1.some((r) => r.test(label))) return 1;
  return 0;
}

function isHighStakes(origin: string | undefined, extra: string[] | undefined): boolean {
  if (!origin) return false;
  const o = origin.toLowerCase();
  if (HIGH_STAKES_ORIGIN.test(o)) return true;
  return (extra ?? []).some((s) => s && o.includes(s.toLowerCase()));
}

/**
 * Classify one Action. The keyword tiers are an unchangeable FLOOR — Tier-2 is fully
 * un-configurable (no option lowers it). Action-type + origin only ESCALATE: on a
 * high-stakes origin an ambiguous, low-reversibility control is raised to a gate
 * (conservative bias); on a normal origin the tier is exactly the keyword floor.
 */
export function classifyAction(signal: ActionSignal, opts: ClassifierOptions = {}): Classification {
  const label = normalizeLabel(signal.label);
  // Only build the run-together form for a SINGLE-token label; a multi-word label ('' here) is
  // handled by the word-boundary patterns, avoiding cross-word fusion false positives.
  const squished = /\s/.test(label) ? '' : label.replace(/[^a-z0-9]+/g, '');
  const reasons: string[] = [];

  const floor = keywordTier(label, squished);
  if (floor === 2) return { tier: 2, confidence: 0, reasons: ['tier-2 hard-stop (un-configurable)'] };

  const base = signal.actionType ? BASE_CONFIDENCE[signal.actionType] : NO_ACTION_TYPE_CONFIDENCE;
  const mild = MILD_RISK.test(label);
  const confidence = Math.max(0, Math.min(1, base - (mild ? MILD_RISK_PENALTY : 0)));

  let tier: RiskTier = floor;
  if (floor === 1) reasons.push('destructive keyword → gate');
  // Can't verify an unlabeled control → gate (locate-or-decline handles the act itself).
  if (signal.unlabeled && tier < 1) {
    tier = 1;
    reasons.push('unlabeled — cannot verify target → gate');
  }

  if (isHighStakes(signal.origin, opts.highStakesOrigins)) {
    reasons.push('high-stakes origin');
    if (mild) reasons.push('ambiguous/consequential verb');
    const bar = (opts.reversibilityBar ?? DEFAULT_REVERSIBILITY_BAR) + HIGH_STAKES_MARGIN;
    if (tier < 1 && confidence < bar) {
      tier = 1;
      reasons.push('low reversibility on a high-stakes origin → gate');
    }
  }

  return { tier, confidence, reasons };
}

/** Reversibility tier for a plain request/label (backward-compatible string API). Tier 0
 *  flows; Tier 1 gates; Tier 2 hard-stops. Delegates to classifyAction with no origin/type,
 *  so it is exactly the keyword floor. */
export function classifyTier(text: string, opts?: ClassifierOptions): RiskTier {
  return classifyAction({ label: text }, opts).tier;
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
