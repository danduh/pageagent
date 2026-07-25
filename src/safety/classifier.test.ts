import { describe, it, expect } from 'vitest';
import { classifyTier } from './classifier';

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
