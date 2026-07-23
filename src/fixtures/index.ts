// Mock data behind the EnginePort stub (Plan Step 3.1). One typed module feeds every
// Phase-3 screen; no network. Copy is the §11 "steady operator" voice — never lorem.

import type { Coverage, PageInfo, Tool } from '../engine/types';
import type { Turn } from '../engine/port';

export const PAGES: Record<string, PageInfo> = {
  ci: { origin: 'ci.internal.example', title: 'Pipeline #1482' },
  settings: { origin: 'account.example.com', title: 'Email preferences' },
};

function tool(partial: Partial<Tool> & Pick<Tool, 'id' | 'name' | 'actionType'>): Tool {
  return {
    description: partial.name,
    source: 'manufactured',
    risk: 0,
    provenance: `${partial.actionType} "${partial.name}"`,
    ...partial,
  };
}

/** A sparse page — a handful of clearly-labelled tools. */
export const SPARSE_TOOLS: Tool[] = [
  tool({ id: 'click_rerun_failed_jobs', name: 'Rerun failed jobs', actionType: 'click', risk: 1 }),
  tool({ id: 'click_cancel_run', name: 'Cancel run', actionType: 'click', risk: 1 }),
  tool({ id: 'follow_view_logs', name: 'View logs', actionType: 'follow-link' }),
  tool({ id: 'fill_search', name: 'Search jobs', actionType: 'type', valueLabel: 'search text' }),
  tool({ id: 'choose_branch', name: 'Choose branch', actionType: 'choose', valueLabel: 'branch' }),
];

/** A dense page — 60 tools, incl. declared/manufactured mix and honest unlabeled ones. */
export const DENSE_TOOLS: Tool[] = Array.from({ length: 60 }, (_, i) => {
  const types = ['click', 'type', 'choose', 'follow-link'] as const;
  const actionType = types[i % 4];
  if (i % 11 === 10) {
    return tool({
      id: `unlabeled_${i}`,
      name: `Unnamed control (icon only), item ${i}`,
      actionType: 'click',
      unlabeled: true,
      provenance: 'button with no accessible name',
    });
  }
  return tool({
    id: `${actionType.replace('-', '_')}_item_${i}`,
    name: `Row ${i} ${actionType === 'follow-link' ? 'open' : actionType}`,
    actionType,
    source: i % 5 === 0 ? 'declared' : 'manufactured',
    risk: i % 9 === 0 ? 1 : 0,
    valueLabel: actionType === 'type' || actionType === 'choose' ? 'value' : undefined,
  });
});

export interface Scenario {
  id: string;
  /** Matches a user request (lowercased). */
  match: (text: string) => boolean;
  /** Agent-side turns emitted in order (the UI adds the user turn first). */
  turns: Omit<Turn, 'id'>[];
}

/** Signature Chat scenarios — one per certainty-ladder rung + clarify. */
export const SCENARIOS: Scenario[] = [
  {
    id: 'rerun',
    match: (t) => t.includes('rerun') || t.includes('re-run') || t.includes('failed job'),
    turns: [
      { kind: 'agent', text: 'There are 3 failed jobs in this pipeline. Re-run all 3?' },
      {
        kind: 'report',
        certainty: 'sent-unconfirmed',
        text: 'I clicked "Rerun failed jobs." I can’t confirm the page reacted — check the run status.',
      },
    ],
  },
  {
    id: 'marketing',
    match: (t) => t.includes('marketing') || t.includes('unsubscribe') || t.includes('emails'),
    turns: [
      {
        kind: 'report',
        certainty: 'done',
        text: 'Done — I turned off "Marketing emails" and the page now shows "Preferences saved."',
        reverse: { label: 'Turn back on' },
      },
    ],
  },
  {
    id: 'twofactor',
    match: (t) => t.includes('two-factor') || t.includes('2fa') || t.includes('where'),
    turns: [
      {
        kind: 'agent',
        text: 'Two-factor is under Security › Trusted devices. I won’t change anything — want me to open it?',
      },
    ],
  },
  {
    id: 'delete',
    match: (t) => t.includes('delete'),
    turns: [
      { kind: 'page-quote', text: 'Toolbar: three buttons with no readable labels (icon only).' },
      {
        kind: 'report',
        certainty: 'didnt',
        text: 'I didn’t do anything. Deleting can’t be undone and I couldn’t tell which button deletes, so I won’t guess. You can run them one at a time in Execute.',
      },
    ],
  },
  {
    id: 'export',
    match: (t) => t.includes('export'),
    turns: [
      {
        kind: 'clarify',
        text: 'Two things here could match "export" — which one?',
        choices: ['Export as CSV', 'Export as PDF'],
      },
    ],
  },
];

export const DEFAULT_SCENARIO: Scenario = {
  id: 'nomatch',
  match: () => true,
  turns: [
    {
      kind: 'report',
      certainty: 'couldnt',
      text: 'I don’t see a way to do that on this page. Try the Tools tab to browse what I found here.',
    },
  ],
};

export const OK_COVERAGE: Coverage = {
  detected: SPARSE_TOOLS.length,
  fromElements: 8,
  unlabeled: 1,
  uncovered: ['a virtualized job list (rows load on scroll)'],
};
