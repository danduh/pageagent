import { describe, it, expect } from 'vitest';
import { scanDom } from './scanner';
import { reResolve } from './resolve';
import type { ElementFingerprint } from '../engine/scan-types';

function container(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

/** Scan and return the fingerprint of the first element whose name matches. */
function fpFor(root: HTMLElement, name: string): ElementFingerprint {
  const res = scanDom(root);
  const el = res.elements.find((e) => e.name === name);
  if (!el) throw new Error(`no scanned element named ${name}`);
  return el.fingerprint;
}

describe('reResolve — happy path', () => {
  it('resolves a uniquely-named control', () => {
    const root = container('<button>Rerun failed jobs</button><button>Cancel run</button>');
    const fp = fpFor(root, 'Cancel run');
    const r = reResolve(fp, root);
    expect(r.kind).toBe('resolved-verified');
    if (r.kind === 'resolved-verified') expect(r.analyzed.name).toBe('Cancel run');
  });

  it('resolves by NAME across a reorder — never by position (the Spike-B danger)', () => {
    const root = container('<button>Rerun</button><button>Cancel</button><button>Logs</button>');
    const fp = fpFor(root, 'Cancel'); // ordinal 0 within its group, position 1
    // Reorder: move Cancel to the end. A positional resolver would now hit the wrong node.
    const cancel = Array.from(root.querySelectorAll('button')).find((b) => b.textContent === 'Cancel')!;
    root.appendChild(cancel);
    const r = reResolve(fp, root);
    expect(r.kind).toBe('resolved-verified');
    if (r.kind === 'resolved-verified') {
      expect(r.analyzed.name).toBe('Cancel');
      expect(r.analyzed.el.textContent).toBe('Cancel');
    }
  });
});

describe('reResolve — declines', () => {
  it('not-found when the control is gone', () => {
    const root = container('<button>Rerun failed jobs</button>');
    const fp = fpFor(root, 'Rerun failed jobs');
    root.innerHTML = '<button>Something else</button>';
    expect(reResolve(fp, root).kind).toBe('not-found');
  });

  it('AMBIGUOUS when only position could distinguish identical controls', () => {
    const root = container('<button>Retry</button><button>Retry</button><button>Retry</button>');
    const fp = fpFor(root, 'Retry');
    const r = reResolve(fp, root);
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') expect(r.matches).toBe(3);
  });

  it('not-found when the control became visibility:hidden (not a live target)', () => {
    const root = container('<button>Save</button>');
    const fp = fpFor(root, 'Save');
    root.querySelector('button')!.setAttribute('style', 'visibility:hidden');
    expect(reResolve(fp, root).kind).toBe('not-found');
  });
});

describe('reResolve — disambiguation is stable-id ONLY (position never picks an actor)', () => {
  it('uses a stable id to pick among identical names', () => {
    const root = container('<button id="btn-primary">Retry</button><button>Retry</button>');
    const fp = fpFor(root, 'Retry'); // first one → stableId 'btn-primary'
    const r = reResolve(fp, root);
    expect(r.kind).toBe('resolved-verified');
    if (r.kind === 'resolved-verified') expect(r.analyzed.stableId).toBe('btn-primary');
  });

  it('DECLINES when only a nearby label (positional) distinguishes identical controls', () => {
    // A single shared label preceding twins encodes "which is first" — that reorders, so we
    // must NOT act on it. Two identical "Retry" with distinct nearby labels but no id → ambiguous.
    const root = container(
      '<div><span>Jobs</span><button>Retry</button></div><div><span>Builds</span><button>Retry</button></div>'
    );
    const res = scanDom(root);
    const jobsRetry = res.elements.find((e) => e.name === 'Retry' && e.nearbyText === 'Jobs')!;
    expect(reResolve(jobsRetry.fingerprint, root).kind).toBe('ambiguous');
  });
});

describe('reResolve — a lone match must be CONFIRMED, not assumed', () => {
  it('declines when the sole remaining match has a DIFFERENT stable id (control was replaced)', () => {
    const root = container('<button id="delA">Delete</button>');
    const fp = fpFor(root, 'Delete'); // stableId 'delA'
    root.innerHTML = '<button id="delZ">Delete</button>'; // a different Delete now
    expect(reResolve(fp, root).kind).toBe('not-found');
  });

  it('declines when the sole remaining match has a DIFFERENT nearby label', () => {
    const root = container('<span>Item A</span><button>Delete</button>');
    const fp = fpFor(root, 'Delete'); // nearbyText 'Item A'
    root.innerHTML = '<span>Item Z</span><button>Delete</button>';
    expect(reResolve(fp, root).kind).toBe('not-found');
  });
});
