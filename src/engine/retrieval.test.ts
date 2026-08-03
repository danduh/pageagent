import { describe, it, expect } from 'vitest';
import type { Tool } from './types';
import { MAX_TOOLS_FOR_MODEL, tokenize, scoreTool, selectToolsForRequest } from './retrieval';

function tool(partial: Partial<Tool> & Pick<Tool, 'id' | 'name'>): Tool {
  return {
    description: '',
    actionType: 'click',
    source: 'manufactured',
    risk: 0,
    provenance: `click "${partial.name}"`,
    ...partial,
  };
}

/** Build N filler tools that share no words with the test requests (so a dense page can be
 *  forced without accidental matches). */
function filler(n: number): Tool[] {
  return Array.from({ length: n }, (_, i) => tool({ id: `filler_${i}`, name: `Widget ${i}` }));
}

describe('tokenize', () => {
  it('lowercases, splits on non-alphanumerics, and drops stop-words + 1-char tokens', () => {
    expect(tokenize('Turn OFF my marketing emails')).toEqual(['turn', 'off', 'marketing', 'emails']);
  });

  it('keeps action verbs (they are the signal, not noise)', () => {
    expect(tokenize('cancel the subscription')).toEqual(['cancel', 'subscription']);
    expect(tokenize('pay now')).toEqual(['pay', 'now']);
  });

  it('is order-independent — same tokens regardless of word order', () => {
    expect(tokenize('rerun failed jobs').sort()).toEqual(tokenize('jobs that failed, rerun').sort());
  });

  it('returns nothing for an all-stop-word / empty request', () => {
    expect(tokenize('the a to of')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('scoreTool', () => {
  const t = tool({ id: 'toggle_marketing', name: 'Marketing emails', description: 'newsletter opt-in' });

  it('counts DISTINCT matching request tokens across name + description + id', () => {
    expect(scoreTool(t, ['marketing', 'emails'])).toBe(2);
    expect(scoreTool(t, ['newsletter'])).toBe(1); // from description
    expect(scoreTool(t, ['toggle'])).toBe(1); // from id
  });

  it('is 0 when no token overlaps, and 0 for an empty token list', () => {
    expect(scoreTool(t, ['payment'])).toBe(0);
    expect(scoreTool(t, [])).toBe(0);
  });

  it('counts each DISTINCT request word once — a repeat does not inflate the score (review finding)', () => {
    expect(scoreTool(tool({ id: 'x', name: 'Export' }), ['export', 'export'])).toBe(1);
  });

  it('matches WHOLE WORDS, not substrings — a short token cannot match inside a longer word', () => {
    // "on" must NOT match inside "Notifications"/"Options" (the substring bug that tripped a
    // false "too many controls" hand-back — review finding).
    expect(scoreTool(tool({ id: 'toggle_notifications', name: 'Notifications' }), ['on'])).toBe(0);
    expect(scoreTool(tool({ id: 'options', name: 'Options' }), ['on'])).toBe(0);
    expect(scoreTool(tool({ id: 'toggle_notifications', name: 'Notifications' }), ['notifications'])).toBe(1);
  });
});

describe('selectToolsForRequest — small page passes through unchanged', () => {
  it('returns EVERY tool untouched when total ≤ cap (single-action reliability preserved)', () => {
    const tools = [
      tool({ id: 'a', name: 'Alpha' }),
      tool({ id: 'b', name: 'Bravo' }),
      tool({ id: 'c', name: 'Charlie' }),
    ];
    const sel = selectToolsForRequest(tools, 'anything at all', 24);
    expect(sel.passedThrough).toBe(true);
    expect(sel.tooMany).toBe(false);
    expect(sel.tools).toBe(tools); // same reference — genuinely unchanged
    expect(sel.matched).toBe(3);
    expect(sel.total).toBe(3);
  });

  it('passes through even with an empty request (browsing is unaffected by retrieval)', () => {
    const tools = [tool({ id: 'a', name: 'Alpha' })];
    const sel = selectToolsForRequest(tools, '', 24);
    expect(sel.passedThrough).toBe(true);
    expect(sel.tools).toEqual(tools);
  });
});

describe('selectToolsForRequest — dense page narrows by request', () => {
  it('keeps only tools with token overlap and drops the rest', () => {
    const target = tool({ id: 'toggle_marketing', name: 'Marketing emails' });
    const tools = [target, ...filler(30)];
    const sel = selectToolsForRequest(tools, 'turn off marketing emails', 24);
    expect(sel.passedThrough).toBe(false);
    expect(sel.tooMany).toBe(false);
    expect(sel.matched).toBe(1);
    expect(sel.tools).toEqual([target]);
    expect(sel.total).toBe(31);
  });

  it('ranks higher-overlap tools first; ties keep scan order', () => {
    const two = tool({ id: 'x1', name: 'Export account data' }); // matches export + account
    const one = tool({ id: 'x2', name: 'Export' }); // matches export only
    const oneB = tool({ id: 'x3', name: 'Account settings' }); // matches account only
    const tools = [one, oneB, two, ...filler(30)];
    const sel = selectToolsForRequest(tools, 'export account', 24);
    expect(sel.tools[0]).toBe(two); // score 2 first
    expect(sel.tools.slice(1)).toEqual([one, oneB]); // score 1, original order
  });

  it('matches regardless of word order in the request', () => {
    const target = tool({ id: 'rerun_failed', name: 'Rerun failed jobs' });
    const tools = [target, ...filler(30)];
    const a = selectToolsForRequest(tools, 'rerun failed jobs', 24);
    const b = selectToolsForRequest(tools, 'jobs that failed — rerun them', 24);
    expect(a.tools).toEqual([target]);
    expect(b.tools).toEqual([target]);
  });

  it('reports matched = 0 when nothing on a dense page matches the words', () => {
    const sel = selectToolsForRequest(filler(30), 'transfer bitcoin to jordan', 24);
    expect(sel.passedThrough).toBe(false);
    expect(sel.matched).toBe(0);
    expect(sel.tooMany).toBe(false);
    expect(sel.tools).toEqual([]);
  });

  it('does NOT falsely flag tooMany from a common short word — whole-word matching (review finding)', () => {
    // A busy settings page whose names mostly contain the letters "on". The old substring matcher
    // let the token "on" match all of them and refused the request; whole-word matching fixes it.
    const busy = [
      tool({ id: 'dark', name: 'Dark mode' }),
      ...[
        'Notifications', 'Options', 'Sessions', 'Permissions', 'Integrations', 'Transactions',
        'Connections', 'Regions', 'Locations', 'Subscriptions', 'Confirmations', 'Operations',
        'Selections', 'Reactions', 'Promotions', 'Donations', 'Mentions', 'Directions',
        'Conditions', 'Positions', 'Functions', 'Questions', 'Suggestions', 'Descriptions',
        'Reflections', 'Inspections',
      ].map((n, i) => tool({ id: `opt_${i}`, name: n })),
    ];
    const sel = selectToolsForRequest(busy, 'turn on dark mode', 24);
    expect(sel.total).toBeGreaterThan(24); // dense → narrowing runs
    expect(sel.matched).toBe(1);
    expect(sel.tooMany).toBe(false);
    expect(sel.tools).toEqual([busy[0]]); // only "Dark mode"
  });

  it('flags tooMany and caps the list when the relevant set still exceeds the cap', () => {
    // 30 tools all sharing the word "row" → all match a "select row" request.
    const rows = Array.from({ length: 30 }, (_, i) => tool({ id: `row_${i}`, name: `Select row ${i}` }));
    const sel = selectToolsForRequest(rows, 'select a row', 24);
    expect(sel.passedThrough).toBe(false);
    expect(sel.matched).toBe(30);
    expect(sel.tooMany).toBe(true);
    expect(sel.tools).toHaveLength(24); // capped, so the caller asks to narrow instead
  });
});

describe('selectToolsForRequest — invariants', () => {
  it('never mutates the input array', () => {
    const tools = [tool({ id: 'match_me', name: 'Match me' }), ...filler(30)];
    const snapshot = [...tools];
    selectToolsForRequest(tools, 'match', 24);
    expect(tools).toEqual(snapshot);
  });

  it('uses the exported default cap when none is passed', () => {
    const tools = filler(MAX_TOOLS_FOR_MODEL); // exactly at the cap → passes through
    const sel = selectToolsForRequest(tools, 'widget');
    expect(sel.passedThrough).toBe(true);
    expect(sel.tools).toHaveLength(MAX_TOOLS_FOR_MODEL);
  });
});
