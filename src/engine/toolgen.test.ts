import { describe, it, expect } from 'vitest';
import { generateTools } from './toolgen';
import type { ScannedElement } from './scan-types';

function scanned(partial: Partial<ScannedElement> & Pick<ScannedElement, 'actionType'>): ScannedElement {
  const name = partial.name ?? '';
  return {
    handleId: partial.handleId ?? 'el-0',
    actionType: partial.actionType,
    role: partial.role ?? 'button',
    name,
    unlabeled: partial.unlabeled ?? name === '',
    tag: partial.tag ?? 'button',
    inputType: partial.inputType,
    visible: partial.visible ?? true,
    enabled: partial.enabled ?? true,
    nearbyText: partial.nearbyText,
    fingerprint: partial.fingerprint ?? {
      role: partial.role ?? 'button',
      name,
      tag: partial.tag ?? 'button',
      ordinal: 0,
    },
  };
}

describe('generateTools — labeled controls', () => {
  it('produces the Tool shape the surfaces render', () => {
    const [tool] = generateTools([
      scanned({ actionType: 'click', name: 'Rerun failed jobs', role: 'button' }),
    ]);
    expect(tool).toMatchObject({
      id: 'click_rerun_failed_jobs',
      name: 'Rerun failed jobs',
      actionType: 'click',
      source: 'manufactured',
      risk: 0,
      provenance: 'button "Rerun failed jobs"',
    });
    expect(tool.description).toContain('Rerun failed jobs');
    expect(tool.unlabeled).toBeUndefined();
  });

  it('exposes a value label for type/choose, not for click/follow-link', () => {
    const tools = generateTools([
      scanned({ actionType: 'type', name: 'Search jobs', role: 'textbox', tag: 'input', inputType: 'text' }),
      scanned({ actionType: 'choose', name: 'Branch', role: 'combobox', tag: 'select' }),
      scanned({ actionType: 'click', name: 'Go', role: 'button' }),
      scanned({ actionType: 'follow-link', name: 'Logs', role: 'link', tag: 'a' }),
    ]);
    expect(tools[0].valueLabel).toBeTruthy();
    expect(tools[1].valueLabel).toBeTruthy();
    expect(tools[2].valueLabel).toBeUndefined();
    expect(tools[3].valueLabel).toBeUndefined();
    expect(tools[3].id).toBe('open_logs');
  });
});

describe('generateTools — first-pass risk from the control name', () => {
  it('tags destructive and hard-stop controls', () => {
    const tools = generateTools([
      scanned({ actionType: 'click', name: 'Save preferences', role: 'button' }),
      scanned({ actionType: 'click', name: 'Cancel subscription', role: 'button' }),
      scanned({ actionType: 'click', name: 'Sign out', role: 'button' }),
    ]);
    expect(tools[0].risk).toBe(0);
    expect(tools[1].risk).toBe(1);
    expect(tools[2].risk).toBe(2);
  });
});

describe('generateTools — honest unlabeled', () => {
  it('never invents a name, marks unlabeled, gates (risk>=1), states no accessible name', () => {
    const [tool] = generateTools([
      scanned({ actionType: 'click', name: '', unlabeled: true, role: 'button', tag: 'button', nearbyText: 'Delete' }),
    ]);
    expect(tool.unlabeled).toBe(true);
    // Honest name: "Unnamed <role> (no label) near '<nearby>'" — it uses the neighbour
    // only as locator CONTEXT ("near Delete"), never claiming the control IS "Delete".
    expect(tool.name).toMatch(/^Unnamed button \(no label\) near "Delete"$/);
    expect(tool.provenance).toMatch(/no accessible name/i);
    // Risk must NOT be derived from the neighbour's word — an unlabeled control gates
    // (Tier 1) purely because it can't be located (locate-or-decline), not because
    // "Delete" appears nearby.
    expect(tool.risk).toBe(1);
  });
});

describe('generateTools — id uniqueness', () => {
  it('disambiguates duplicate names deterministically', () => {
    const tools = generateTools([
      scanned({ actionType: 'click', name: 'Retry', handleId: 'el-0' }),
      scanned({ actionType: 'click', name: 'Retry', handleId: 'el-1' }),
      scanned({ actionType: 'click', name: 'Retry', handleId: 'el-2' }),
    ]);
    expect(new Set(tools.map((t) => t.id)).size).toBe(3);
    expect(tools.map((t) => t.id)).toEqual(['click_retry', 'click_retry_2', 'click_retry_3']);
  });
});
