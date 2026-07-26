import { describe, it, expect } from 'vitest';
import { classifyAction, classifyTier } from './classifier';

describe('classifyTier — destructive coverage (declared-tool evasion)', () => {
  it('gates money movement even with interposed words (Tier 2)', () => {
    expect(classifyTier('send all money')).toBe(2); // sendAllMoney
    expect(classifyTier('transfer my funds')).toBe(2);
    expect(classifyTier('withdraw the balance')).toBe(2);
    expect(classifyTier('pay')).toBe(2);
  });

  it('gates account destruction even with interposed words (Tier 2)', () => {
    expect(classifyTier('close user account')).toBe(2); // closeUserAccount
    expect(classifyTier('deactivate account')).toBe(2);
    expect(classifyTier('delete the account')).toBe(2);
    expect(classifyTier('reset account')).toBe(2);
    expect(classifyTier('sign out')).toBe(2);
  });

  it('gates clearly-destructive verbs (Tier 1+)', () => {
    for (const s of [
      'deactivate widget',
      'revoke all sessions',
      'terminate subscription',
      'wipe all data',
      'erase logs',
      'purge cache',
      'destroy record',
    ]) {
      expect(classifyTier(s)).toBeGreaterThanOrEqual(1);
    }
  });

  it('does NOT over-gate benign toggles (friction stays scarce)', () => {
    expect(classifyTier('dark mode')).toBe(0);
    expect(classifyTier('disable dark mode')).toBe(0); // "disable" alone is not gated
    expect(classifyTier('reset the search filter')).toBe(0); // "reset" alone is not gated
    expect(classifyTier('marketing emails')).toBe(0);
    expect(classifyTier('save preferences')).toBe(0);
  });

  it('preserves prior tiers', () => {
    expect(classifyTier('cancel subscription')).toBe(1);
    expect(classifyTier('sign out')).toBe(2);
    expect(classifyTier('pay $500')).toBe(2);
  });
});

describe('classifyAction — action-type + origin + reversibility bar (Step 8.3)', () => {
  const HIGH = 'https://secure.mybank.example'; // matches the built-in high-stakes signal ("bank")

  it('maps the curated sample to the expected tiers', () => {
    expect(classifyAction({ label: 'Marketing emails', actionType: 'click' }).tier).toBe(0); // toggle
    expect(classifyAction({ label: 'Search', actionType: 'type' }).tier).toBe(0); // search
    expect(classifyAction({ label: 'Cancel subscription', actionType: 'click' }).tier).toBe(1);
    expect(classifyAction({ label: 'Delete draft', actionType: 'click' }).tier).toBe(1);
    expect(classifyAction({ label: 'Pay $500', actionType: 'click' }).tier).toBe(2);
    expect(classifyAction({ label: 'Sign out', actionType: 'click' }).tier).toBe(2);
  });

  it('a low-consequence settings toggle stays Tier 0 (friction stays scarce)', () => {
    expect(classifyAction({ label: 'Dark mode', actionType: 'click' }).tier).toBe(0);
    expect(classifyAction({ label: 'Marketing emails', actionType: 'click' }).tier).toBe(0);
  });

  it('a high-stakes origin ESCALATES an ambiguous/consequential control to a gate', () => {
    // "Confirm" / "Continue" are not keyword-destructive, so on a normal origin they flow…
    expect(classifyAction({ label: 'Confirm', actionType: 'click' }).tier).toBe(0);
    expect(classifyAction({ label: 'Continue', actionType: 'click' }).tier).toBe(0);
    // …but on a high-stakes origin the same ambiguous click escalates to Tier 1.
    expect(classifyAction({ label: 'Confirm', actionType: 'click', origin: HIGH }).tier).toBe(1);
    expect(classifyAction({ label: 'Change limit', actionType: 'click', origin: HIGH }).tier).toBe(1);
  });

  it('does NOT over-gate a benign control or reversible typing on a high-stakes origin', () => {
    expect(classifyAction({ label: 'Dark mode', actionType: 'click', origin: HIGH }).tier).toBe(0);
    expect(classifyAction({ label: 'Search transactions', actionType: 'type', origin: HIGH }).tier).toBe(0);
  });

  it('an unlabeled control gates (can’t verify the target)', () => {
    expect(classifyAction({ label: '', actionType: 'click', unlabeled: true }).tier).toBe(1);
  });

  it('the Tier-2 hard-stop set is un-configurable — no option can lower it', () => {
    const permissive = { reversibilityBar: 0, highStakesOrigins: [] };
    expect(classifyAction({ label: 'pay', actionType: 'click' }, permissive).tier).toBe(2);
    expect(classifyAction({ label: 'delete the account', actionType: 'click' }, permissive).tier).toBe(2);
    expect(classifyAction({ label: 'sign out', actionType: 'click' }, permissive).tier).toBe(2);
    // A giant bar can't touch it either.
    expect(classifyAction({ label: 'send all money' }, { reversibilityBar: 100 }).tier).toBe(2);
  });

  it('the reversibility bar is a configurable parameter', () => {
    // Default bar: a plain click on a high-stakes origin stays Tier 0 (confidence above the bar)…
    expect(classifyAction({ label: 'View details', actionType: 'click', origin: HIGH }).tier).toBe(0);
    // …a stricter bar escalates it (below the raised threshold now).
    expect(
      classifyAction({ label: 'View details', actionType: 'click', origin: HIGH }, { reversibilityBar: 0.7 }).tier
    ).toBe(1);
  });

  it('owner-supplied high-stakes origins extend the built-in signal', () => {
    // A neutral origin does not escalate an ambiguous control…
    expect(classifyAction({ label: 'Confirm', actionType: 'click', origin: 'https://acme-internal.example' }).tier).toBe(0);
    // …until the owner marks it high-stakes.
    expect(
      classifyAction(
        { label: 'Confirm', actionType: 'click', origin: 'https://acme-internal.example' },
        { highStakesOrigins: ['acme-internal'] }
      ).tier
    ).toBe(1);
  });

  it('reports a reversibility confidence and the reasons that set the tier', () => {
    const pay = classifyAction({ label: 'Pay now', actionType: 'click' });
    expect(pay.tier).toBe(2);
    expect(pay.confidence).toBe(0);
    const gated = classifyAction({ label: 'Confirm', actionType: 'click', origin: HIGH });
    expect(gated.reasons.join(' ')).toMatch(/high-stakes origin/);
  });
});

describe('classifier — widened destructive coverage (review fixes)', () => {
  it('gates money movement that the literal "pay"/"$" check missed (Tier 2)', () => {
    for (const label of [
      'Make payment',
      'Complete payment',
      'Confirm payment',
      'Complete purchase',
      'Place order',
      'Send 500 USD',
      'Withdraw 200 EUR',
      'Send €5,000',
      'Cash out',
      'Empty my balance',
      'Remit funds',
      'Drain wallet',
      'wire 5000 dollars',
    ]) {
      expect(classifyTier(label)).toBe(2);
    }
  });

  it('gates irreversible bulk deletes (Empty Trash / Clear data) — Tier 1+', () => {
    for (const label of ['Empty Trash', 'Empty Bin', 'Clear all data', 'Clear history', 'Delete forever']) {
      expect(classifyTier(label)).toBeGreaterThanOrEqual(1);
    }
  });

  it('gates account destruction in NOUN form, not only verb form (Tier 2)', () => {
    expect(classifyTier('Account deletion')).toBe(2);
    expect(classifyTier('Account closure')).toBe(2);
    expect(classifyTier('acct removal')).toBe(2);
  });

  it('catches sign-out / log-out synonyms and odd spacing (Tier 2)', () => {
    for (const label of ['log off', 'sign off', 'sign-out', 'sign me out', 'LOG  OUT']) {
      expect(classifyTier(label)).toBe(2);
    }
  });

  it('catches run-together / concatenated hard-stop names (Tier 2)', () => {
    // A site-declared tool whose name can't be split into words still trips the hard-stop.
    expect(classifyTier('deleteaccount')).toBe(2);
    expect(classifyTier('sendmoney')).toBe(2);
    expect(classifyTier('signout')).toBe(2);
    expect(classifyTier('cashout')).toBe(2);
  });

  it('sees through odd characters: full-width and look-alike letters (Tier 2 / gate)', () => {
    expect(classifyTier('Pay ＄500')).toBe(2); // full-width dollar sign, folded to $
    expect(classifyTier('ⅾelete account')).toBe(2); // "ⅾ" is a compatibility d
    expect(classifyTier('dеlete draft')).toBeGreaterThanOrEqual(1); // Cyrillic "е"
  });

  it('gates the common purchase / bid / withdraw actions the first pass missed', () => {
    expect(classifyTier('Buy now')).toBe(2);
    expect(classifyTier('Buy')).toBe(2);
    expect(classifyTier('Order now')).toBe(2);
    expect(classifyTier('Proceed to checkout')).toBe(2);
    expect(classifyTier('Place bid')).toBe(2);
    expect(classifyTier('Donate')).toBe(2);
    expect(classifyTier('Withdraw')).toBeGreaterThanOrEqual(1); // "Withdraw money" → Tier 2
  });

  it('does NOT over-gate benign look-alikes of the risky words (still Tier 0)', () => {
    for (const label of [
      'Payment history',
      'Payment methods',
      'Order history',
      'Track order',
      'View invoice',
      'Clear filter',
      'Clear search',
      'Add to cart',
      // These broke the first widening pass — separators fused, or a money word sat alone.
      'Analog output', // "analog"+"output" must NOT fuse into "logout"
      'Cash outflow', // read-only accounting label, not "cash out"
      'Cash balance', // "cash" is a noun here, not a spend verb
      'Log scale off', // a settings toggle, not a sign-out
      'Disclose account information', // "disclose" is not "close"
      '500 tokens', // an API-usage amount, not money
      '$5 off', // a price/promo, not a spend action
      'Save $20', // a discount label
      'Transfer to team', // hand off a task, not move money
      'Sign in', // the opposite of sign out
    ]) {
      expect(classifyTier(label)).toBe(0);
    }
  });
});
