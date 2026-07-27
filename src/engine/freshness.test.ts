import { describe, it, expect } from 'vitest';
import { FRESH, nextFreshness, type FreshnessView } from './freshness';

describe('nextFreshness — the staleness state machine (Step 8.2)', () => {
  it('a completed scan is Fresh and runnable', () => {
    const v = nextFreshness({ state: 'stale', toolsStale: true }, { kind: 'scanned' });
    expect(v).toEqual({ state: 'fresh', toolsStale: false });
  });

  it('a scan in progress shows Scanning and clears staleness', () => {
    expect(nextFreshness({ state: 'stale', toolsStale: true }, { kind: 'scanning' })).toEqual({
      state: 'scanning',
      toolsStale: false,
    });
  });

  it('a DOM mutation past threshold flips to Stale and blocks running', () => {
    const v = nextFreshness(FRESH, { kind: 'mutation' });
    expect(v.state).toBe('stale');
    expect(v.toolsStale).toBe(true);
    expect(v.reason).toMatch(/changed/);
  });

  it('an SPA route change flips to Stale', () => {
    expect(nextFreshness(FRESH, { kind: 'navigation' }).state).toBe('stale');
  });

  it('a failed scan leaves the tools unverified (stale), not runnable', () => {
    const v = nextFreshness(FRESH, { kind: 'scan-failed' });
    expect(v.state).toBe('failed');
    expect(v.toolsStale).toBe(true);
  });

  it('staleness is sticky and keeps the FIRST reason until a scan clears it', () => {
    const s1 = nextFreshness(FRESH, { kind: 'mutation' });
    const s2 = nextFreshness(s1, { kind: 'navigation' }); // a later, different drift signal
    expect(s2.state).toBe('stale');
    expect(s2.reason).toBe(s1.reason); // first reason ("the page changed") is preserved
    // …only a scan clears it.
    expect(nextFreshness(s2, { kind: 'scanned' })).toEqual({ state: 'fresh', toolsStale: false });
  });

  it('a page change during an in-flight scan does not clobber the Scanning state', () => {
    const scanning: FreshnessView = { state: 'scanning', toolsStale: false };
    expect(nextFreshness(scanning, { kind: 'mutation' })).toEqual(scanning);
  });
});
