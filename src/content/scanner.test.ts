import { describe, it, expect } from 'vitest';
import { scanDom, looksStableId } from './scanner';

function container(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

describe('scanDom — actionable detection', () => {
  it('detects buttons, links, text inputs, and selects with correct action types', () => {
    const root = container(`
      <button>Rerun failed jobs</button>
      <a href="/logs">View logs</a>
      <input type="text" aria-label="Search jobs" />
      <select aria-label="Branch"><option>main</option></select>
      <textarea aria-label="Notes"></textarea>
      <div>not actionable</div>
    `);
    const res = scanDom(root);
    const byName = Object.fromEntries(res.elements.map((e) => [e.name, e]));
    expect(res.elements).toHaveLength(5);
    expect(byName['Rerun failed jobs'].actionType).toBe('click');
    expect(byName['View logs'].actionType).toBe('follow-link');
    expect(byName['Search jobs'].actionType).toBe('type');
    expect(byName['Branch'].actionType).toBe('choose');
    expect(byName['Notes'].actionType).toBe('type');
  });

  it('detects role-based controls (role=button, checkbox, tab)', () => {
    const root = container(`
      <div role="button">Save</div>
      <div role="checkbox" aria-label="Wrap lines"></div>
      <div role="tab">First</div>
    `);
    const res = scanDom(root);
    expect(res.elements.map((e) => e.actionType).sort()).toEqual(['click', 'click', 'click']);
  });

  it('treats an a with no href as non-actionable', () => {
    const res = scanDom(container('<a>Just text</a>'));
    expect(res.elements).toHaveLength(0);
  });
});

describe('scanDom — honest unlabeled + coverage', () => {
  it('marks an icon-only control unlabeled with nearby text, never invents a name', () => {
    const root = container('<span>Delete</span><button><svg></svg></button>');
    const res = scanDom(root);
    const btn = res.elements.find((e) => e.tag === 'button')!;
    expect(btn.unlabeled).toBe(true);
    expect(btn.name).toBe('');
    expect(btn.nearbyText).toBe('Delete');
    expect(res.coverage.unlabeled).toBe(1);
  });

  it('reports coverage counts honestly', () => {
    const root = container('<button>A</button><button>B</button><span>x</span>');
    const res = scanDom(root);
    expect(res.coverage.detected).toBe(2);
    expect(res.coverage.fromElements).toBeGreaterThanOrEqual(3);
    expect(res.coverage.unlabeled).toBe(0);
  });

  it('names canvas and iframe regions as uncovered (partial), not silently dropped', () => {
    const root = container('<button>Go</button><canvas></canvas><iframe></iframe>');
    const res = scanDom(root);
    expect(res.status).toBe('partial');
    expect(res.coverage.uncovered.join(' ')).toMatch(/canvas/i);
    expect(res.coverage.uncovered.join(' ')).toMatch(/frame/i);
  });
});

describe('scanDom — shadow DOM, visibility, enabled', () => {
  it('crosses OPEN shadow roots', () => {
    const root = container('<div id="host"></div>');
    const host = root.querySelector('#host')!;
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<button>Inside shadow</button>';
    const res = scanDom(root);
    expect(res.elements.map((e) => e.name)).toContain('Inside shadow');
  });

  it('skips hidden / aria-hidden / display:none subtrees', () => {
    const root = container(`
      <button hidden>Hidden attr</button>
      <div aria-hidden="true"><button>In aria-hidden</button></div>
      <button style="display:none">Display none</button>
      <button>Visible</button>
    `);
    const res = scanDom(root);
    expect(res.elements.map((e) => e.name)).toEqual(['Visible']);
  });

  it('records disabled state', () => {
    const root = container('<button disabled>Off</button><button aria-disabled="true">Aria off</button>');
    const res = scanDom(root);
    expect(res.elements.every((e) => e.enabled === false)).toBe(true);
  });
});

describe('scanDom — fingerprint', () => {
  it('assigns ordinals within a role+name group and keeps stable ids only', () => {
    const root = container(`
      <button id="btn-rerun">Retry</button>
      <button id=":r0:">Retry</button>
      <button id="save1234">Retry</button>
    `);
    const res = scanDom(root);
    const retries = res.elements.filter((e) => e.name === 'Retry');
    expect(retries.map((e) => e.fingerprint.ordinal)).toEqual([0, 1, 2]);
    expect(retries[0].fingerprint.stableId).toBe('btn-rerun');
    expect(retries[1].fingerprint.stableId).toBeUndefined(); // React useId
    expect(retries[2].fingerprint.stableId).toBeUndefined(); // long digit run
  });
});

describe('scanDom — abort + budget', () => {
  it('returns partial with a note when aborted', () => {
    const root = container(
      Array.from({ length: 1200 }, (_, i) => `<button>B${i}</button>`).join('')
    );
    const res = scanDom(root, { shouldAbort: () => true });
    expect(res.status).toBe('partial');
    expect(res.note).toMatch(/stopped/i);
  });

  it('stops at the element budget on a huge tree', () => {
    const root = container(Array.from({ length: 50 }, (_, i) => `<button>B${i}</button>`).join(''));
    const res = scanDom(root, { maxElements: 10 });
    expect(res.status).toBe('partial');
    expect(res.coverage.uncovered.join(' ')).toMatch(/budget/i);
  });
});

describe('looksStableId', () => {
  it('accepts author ids and rejects framework-generated ones', () => {
    expect(looksStableId('btn-rerun')).toBe('btn-rerun');
    expect(looksStableId('cancelSubscription')).toBe('cancelSubscription');
    expect(looksStableId(':r0:')).toBeUndefined();
    expect(looksStableId('radix-42')).toBeUndefined();
    expect(looksStableId('item-12345')).toBeUndefined();
    expect(looksStableId('1234')).toBeUndefined();
    expect(looksStableId(null)).toBeUndefined();
  });
});
