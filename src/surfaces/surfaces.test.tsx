import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Header } from './Header';
import { Chat } from './Chat';
import type { ChatProps } from './contracts';
import type { Turn } from '../engine/port';
import { PAGES, SPARSE_TOOLS } from '../fixtures';

const noop = () => {};

function chatProps(turns: Turn[], acting = false): ChatProps {
  return {
    page: PAGES.ci,
    tools: SPARSE_TOOLS,
    turns,
    acting,
    status: acting ? 'Working on your device…' : '',
    inputRef: createRef<HTMLInputElement>(),
    onSend: noop,
    onStop: noop,
    onReverse: noop,
    onChoice: noop,
  };
}

// One of every turn kind + every certainty-ladder rung + provenance wall + clarify.
const RICH_TURNS: Turn[] = [
  { id: 'u1', kind: 'user', text: 'rerun the failed jobs' },
  { id: 'q1', kind: 'page-quote', text: 'Toolbar: three icon-only buttons.' },
  {
    id: 'r1',
    kind: 'report',
    certainty: 'done',
    text: 'Done — turned off "Marketing emails"; the page shows "Preferences saved."',
    reverse: { label: 'Turn back on' },
  },
  {
    id: 'r2',
    kind: 'report',
    certainty: 'sent-unconfirmed',
    text: 'I clicked "Rerun failed jobs."',
  },
  { id: 'r3', kind: 'report', certainty: 'couldnt', text: 'No such control on this page.' },
  { id: 'r4', kind: 'report', certainty: 'didnt', text: 'I didn’t do anything — I won’t guess.' },
  { id: 'c1', kind: 'clarify', text: 'Which one?', choices: ['Export as CSV', 'Export as PDF'] },
];

describe('Header surface', () => {
  it('renders a freshness/locus/acting state with no axe violations', async () => {
    const { container } = render(
      <Header
        page={PAGES.ci}
        freshness="stale"
        locus="on-device"
        acting
        onRescan={noop}
        onStop={noop}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Chat surface', () => {
  it('empty state is page-aware and axe-clean', async () => {
    const { container, getByPlaceholderText } = render(<Chat {...chatProps([])} />);
    getByPlaceholderText(/tell this page/i);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('transcript renders all turn kinds + the certainty ladder, axe-clean', async () => {
    const { container, getByText, getByRole } = render(<Chat {...chatProps(RICH_TURNS)} />);
    getByText('Done'); // certainty-ladder labels present as words
    getByText(/Didn/);
    getByRole('button', { name: /turn back on/i }); // Tier-0 one-tap reverse
    getByRole('button', { name: /export as csv/i }); // clarification choice chip
    expect(await axe(container)).toHaveNoViolations();
  });

  it('a working transcript exposes a status region', async () => {
    const { getByRole } = render(<Chat {...chatProps(RICH_TURNS, true)} />);
    getByRole('status');
  });
});
