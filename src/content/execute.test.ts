import { describe, it, expect } from 'vitest';
import { scanDom } from './scanner';
import { executeAction } from './execute';
import type { ScannedElement } from '../engine/scan-types';

function container(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

function firstScanned(root: HTMLElement): ScannedElement {
  const res = scanDom(root);
  if (res.elements.length === 0) throw new Error('nothing scanned');
  return res.elements[0];
}

describe('executeAction — acts + observes', () => {
  it('clicks a checkbox and verifies it is now on', () => {
    const root = container('<input type="checkbox" aria-label="Wrap lines" />');
    const el = firstScanned(root);
    const out = executeAction({ fingerprint: el.fingerprint, actionType: el.actionType, root });
    expect(out.kind).toBe('executed');
    if (out.kind === 'executed') {
      expect(out.observed.verified).toBe(true);
      expect(out.observed.summary).toMatch(/now on/i);
    }
    expect(root.querySelector('input')!.checked).toBe(true);
  });

  it('types a value and verifies the field holds it', () => {
    const root = container('<input type="text" aria-label="Search jobs" />');
    const el = firstScanned(root);
    const out = executeAction({ fingerprint: el.fingerprint, actionType: el.actionType, value: 'failed', root });
    expect(out.kind).toBe('executed');
    if (out.kind === 'executed') {
      expect(out.observed.verified).toBe(true);
      expect(out.observed.summary).toContain('failed');
    }
    expect(root.querySelector('input')!.value).toBe('failed');
  });

  it('does NOT claim Done for a generic click with no observable effect', () => {
    const root = container('<button>Submit form</button>');
    const el = firstScanned(root);
    const out = executeAction({ fingerprint: el.fingerprint, actionType: el.actionType, root });
    expect(out.kind).toBe('executed');
    if (out.kind === 'executed') expect(out.observed.verified).toBe(false);
  });

  it('does NOT claim Done for a no-op type (the field already held the value)', () => {
    const root = container('<input type="text" aria-label="Email" value="a@b.com" />');
    const el = firstScanned(root);
    const out = executeAction({ fingerprint: el.fingerprint, actionType: el.actionType, value: 'a@b.com', root });
    expect(out.kind).toBe('executed');
    if (out.kind === 'executed') {
      expect(out.observed.verified).toBe(false);
      expect(out.observed.summary).toMatch(/already showed/i);
    }
  });
});

describe('executeAction — dry-run (gate preflight)', () => {
  it('locates + verifies WITHOUT acting', () => {
    const root = container('<input type="checkbox" aria-label="Marketing emails" />');
    const el = firstScanned(root);
    const out = executeAction({ fingerprint: el.fingerprint, actionType: el.actionType, dryRun: true, root });
    expect(out.kind).toBe('located');
    if (out.kind === 'located') expect(out.label).toBe('Marketing emails');
    expect(root.querySelector('input')!.checked).toBe(false); // untouched
  });
});

describe('executeAction — locate-or-decline', () => {
  it('declines not-found when the control is gone', () => {
    const root = container('<button>Rerun failed jobs</button>');
    const el = firstScanned(root);
    root.innerHTML = '<button>Different</button>';
    const out = executeAction({ fingerprint: el.fingerprint, actionType: el.actionType, root });
    expect(out).toEqual({ kind: 'declined', reason: 'not-found' });
  });

  it('declines (ambiguous) rather than guess among identical controls', () => {
    const root = container('<button>Retry</button><button>Retry</button>');
    const el = firstScanned(root);
    const out = executeAction({ fingerprint: el.fingerprint, actionType: el.actionType, root });
    expect(out.kind).toBe('declined');
    if (out.kind === 'declined') expect(out.reason).toBe('ambiguous');
  });

  it('declines a disabled control instead of clicking it', () => {
    const root = container('<button disabled>Pay now</button>');
    const el = firstScanned(root);
    const out = executeAction({ fingerprint: el.fingerprint, actionType: el.actionType, root });
    expect(out).toEqual({ kind: 'declined', reason: 'disabled' });
  });
});
