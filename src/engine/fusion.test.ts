import { describe, it, expect } from 'vitest';
import { declaredToTool, describeArgs, interpretDeclaredResult, mergeTools, schemaParamNames } from './fusion';
import type { Tool } from './types';
import type { DeclaredToolDef } from './scan-types';

function manufactured(partial: Partial<Tool> & Pick<Tool, 'id' | 'name' | 'actionType'>): Tool {
  return { description: partial.name, source: 'manufactured', risk: 0, provenance: `x`, ...partial };
}

describe('declaredToTool', () => {
  it('maps a declared WebMCP tool to a source=declared Tool', () => {
    const d: DeclaredToolDef = {
      name: 'addIngredient',
      title: 'Add ingredient',
      description: 'Add an ingredient to the active recipe',
      origin: 'https://recipes.example',
      inputSchema: { type: 'object', properties: { name: {}, quantity: {}, unit: {} }, required: ['name'] },
    };
    const t = declaredToTool(d);
    expect(t).toMatchObject({
      id: 'addIngredient',
      name: 'Add ingredient',
      source: 'declared',
    });
    expect(t.provenance).toMatch(/recipes\.example/);
    expect(t.valueLabel).toBe('name, quantity, unit');
  });

  it('falls back to the name when title/description are empty, and tiers destructive names', () => {
    const t = declaredToTool({ name: 'removeIngredient', title: '', description: '' });
    expect(t.name).toBe('removeIngredient');
    expect(t.description).toBe('removeIngredient');
    expect(t.risk).toBe(1); // "remove" → gated
    expect(t.valueLabel).toBeUndefined(); // no params
  });

  it('gates evasive camelCase destructive declared names (site controls the name)', () => {
    expect(declaredToTool({ name: 'sendAllMoney' }).risk).toBe(2);
    expect(declaredToTool({ name: 'closeUserAccount' }).risk).toBe(2);
    expect(declaredToTool({ name: 'deactivateAccount' }).risk).toBe(2);
    expect(declaredToTool({ name: 'revokeAllSessions' }).risk).toBeGreaterThanOrEqual(1);
    expect(declaredToTool({ name: 'wipeAllData' }).risk).toBeGreaterThanOrEqual(1);
  });
});

describe('interpretDeclaredResult — never overclaims a site tool', () => {
  it('marks explicit failure returns unverified (not Done)', () => {
    expect(interpretDeclaredResult({ success: false, error: 'pending balance' }).verified).toBe(false);
    expect(interpretDeclaredResult(false).verified).toBe(false);
    expect(interpretDeclaredResult({ isError: true }).verified).toBe(false);
    expect(interpretDeclaredResult({ ok: false }).verified).toBe(false);
    expect(interpretDeclaredResult(null).verified).toBe(false);
  });

  it('marks a clean, non-failure return verified', () => {
    const o = interpretDeclaredResult({ recipes: ['a', 'b'] });
    expect(o.verified).toBe(true);
    expect(o.summary).toContain('recipes');
    expect(o.failed).toBeFalsy();
  });

  it('flags an explicit failure with `failed` and surfaces the site’s own error text', () => {
    const o = interpretDeclaredResult({ success: false, error: 'unknown preference: undefined' });
    expect(o.failed).toBe(true);
    expect(o.verified).toBe(false);
    expect(o.summary).toContain('unknown preference: undefined');
  });

  it('an explicit success wins over an `error` field (a search returning "no match" is not a failure)', () => {
    const o = interpretDeclaredResult({ success: true, results: [], error: 'no match' });
    expect(o.verified).toBe(true);
    expect(o.failed).toBeFalsy();
  });
});

describe('describeArgs — model-readable arg spec for a site tool', () => {
  it('lists named fields with enums and booleans, marking non-required as optional', () => {
    expect(
      describeArgs({
        type: 'object',
        properties: { name: { type: 'string', enum: ['marketing', 'security'] }, enabled: { type: 'boolean' } },
        required: ['name', 'enabled'],
      })
    ).toBe('name (one of: marketing, security), enabled (true/false)');
    expect(
      describeArgs({ type: 'object', properties: { name: { type: 'string' }, note: { type: 'string' } }, required: ['name'] })
    ).toBe('name (string), note (string) [optional]');
  });

  it('returns undefined when there are no properties', () => {
    expect(describeArgs({ type: 'object' })).toBeUndefined();
    expect(describeArgs(null)).toBeUndefined();
  });
});

describe('schemaParamNames', () => {
  it('lists top-level properties, empty otherwise', () => {
    expect(schemaParamNames({ type: 'object', properties: { a: {}, b: {} } })).toEqual(['a', 'b']);
    expect(schemaParamNames({ type: 'object', properties: {} })).toEqual([]);
    expect(schemaParamNames(undefined)).toEqual([]);
  });
});

describe('mergeTools — site-declared wins on overlap', () => {
  const dom = [
    manufactured({ id: 'click_add_ingredient', name: 'Add ingredient', actionType: 'click' }),
    manufactured({ id: 'click_print', name: 'Print', actionType: 'click' }),
  ];

  it('prefers the declared tool over a same-named manufactured one, declared listed first', () => {
    const merged = mergeTools(dom, [{ name: 'addIngredient', title: 'Add ingredient' }]);
    // The manufactured "Add ingredient" is dropped in favour of the site's own.
    expect(merged.filter((t) => t.name === 'Add ingredient')).toHaveLength(1);
    expect(merged[0].source).toBe('declared');
    expect(merged.find((t) => t.name === 'Add ingredient')!.source).toBe('declared');
    // Non-overlapping manufactured tools survive.
    expect(merged.some((t) => t.name === 'Print' && t.source === 'manufactured')).toBe(true);
  });

  it('a plain page (no declared tools) keeps all manufactured tools', () => {
    const merged = mergeTools(dom, []);
    expect(merged).toHaveLength(2);
    expect(merged.every((t) => t.source === 'manufactured')).toBe(true);
  });

  it('dedupes declared-vs-declared by id (malformed getTools snapshot)', () => {
    const merged = mergeTools([], [{ name: 'deleteThing' }, { name: 'deleteThing' }]);
    expect(merged.filter((t) => t.id === 'deleteThing')).toHaveLength(1);
  });
});
