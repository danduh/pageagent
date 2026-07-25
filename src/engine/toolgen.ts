// Tool generation (Step 7.4): a pure `ScannedElement[] → Tool[]` mapping producing
// the SAME Tool shape the Scope-A surfaces already render (`types.ts`), so real scan
// output flows into the Tools/Chat/Execute surfaces with no component change.
//
// Honesty rules (REQ-SCAN-3): an unnameable control is represented HONESTLY — a
// position-based name, an explicit "no accessible name" provenance — never given an
// invented label and never dropped. First-pass risk reuses the safety classifier's
// keyword tiers over the tool name; Step 8.3 supersedes it with action-type + origin +
// a reversibility-confidence bar behind the same `risk` field.

import type { ScannedElement } from './scan-types';
import type { ActionType, Tool } from './types';
import { classifyTier } from '../safety/classifier';

const VERB: Record<ActionType, string> = {
  click: 'click',
  type: 'type',
  choose: 'choose',
  'follow-link': 'open',
};

const DESCRIBE: Record<ActionType, (label: string) => string> = {
  click: (l) => `Activates ${l}.`,
  type: (l) => `Types a value into ${l}.`,
  choose: (l) => `Chooses an option in ${l}.`,
  'follow-link': (l) => `Follows ${l}.`,
};

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

function toolName(el: ScannedElement): string {
  if (!el.unlabeled) return el.name;
  const near = el.nearbyText ? ` near "${el.nearbyText}"` : '';
  return `Unnamed ${el.role} (no label)${near}`;
}

function provenance(el: ScannedElement): string {
  if (el.unlabeled) {
    const typePart = el.inputType ? `[type=${el.inputType}]` : '';
    const near = el.nearbyText ? `, near "${el.nearbyText}"` : '';
    return `${el.tag}${typePart} with no accessible name${near}`;
  }
  return `${el.role} "${el.name}"`;
}

function valueLabel(el: ScannedElement): string | undefined {
  if (el.actionType === 'type') return 'text to type';
  if (el.actionType === 'choose') return 'option to choose';
  return undefined;
}

/** Pure: generate the browsable Tool set from scanned elements. Deterministic order. */
export function generateTools(elements: ScannedElement[]): Tool[] {
  const usedIds = new Set<string>();

  return elements.map((el) => {
    const name = toolName(el);
    const base = `${VERB[el.actionType]}_${el.unlabeled ? el.handleId.replace(/-/g, '_') : slug(el.name) || el.handleId.replace(/-/g, '_')}`;
    let id = base;
    for (let n = 2; usedIds.has(id); n += 1) id = `${base}_${n}`;
    usedIds.add(id);

    const label = el.unlabeled ? `this ${el.role}` : `"${el.name}"`;

    // First-pass risk from the control's OWN words (el.name, not the synthesized
    // display name — which embeds nearby text like "Delete" and would contaminate the
    // signal). An unlabeled control can't be located reliably, so it gates (Tier 1) and
    // the gate then declines (locate-or-decline). Step 8.3 refines with origin + a
    // reversibility-confidence bar.
    const risk: Tool['risk'] = el.unlabeled ? 1 : classifyTier(el.name);

    const tool: Tool = {
      id,
      name,
      description: DESCRIBE[el.actionType](label),
      actionType: el.actionType,
      source: 'manufactured',
      risk,
      provenance: provenance(el),
    };
    if (el.unlabeled) tool.unlabeled = true;
    const vl = valueLabel(el);
    if (vl) tool.valueLabel = vl;
    return tool;
  });
}
