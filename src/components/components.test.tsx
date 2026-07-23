import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Badge, Banner, Button, Card, Chip, Field, ListRow, Tab, Tabs, Toggle } from './primitives';
import { CheckpointIcon, ClickIcon, LocalNodeIcon, OutboundApertureIcon, StopIcon } from './icons';

function Harness() {
  const [on, setOn] = useState(false);
  const [tab, setTab] = useState('chat');
  const [picked, setPicked] = useState(false);
  return (
    <main>
      <Button variant="primary">Send</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="destructive">Cancel subscription</Button>
      <Toggle checked={on} onCheckedChange={setOn} label="Marketing emails" />
      <Tabs value={tab} onValueChange={setTab} label="Surfaces">
        <Tab value="chat">Chat</Tab>
        <Tab value="tools">Tools</Tab>
      </Tabs>
      <ul>
        <ListRow onActivate={() => {}} action={<Button variant="ghost">Run</Button>}>
          Re-run failed jobs
        </ListRow>
      </ul>
      <Field label="Search" />
      <Badge tone="safe">reversible</Badge>
      <Badge tone="destructive">destructive</Badge>
      <Chip tone="brand" onClick={() => setPicked(!picked)} selected={picked}>
        Export as CSV
      </Chip>
      <Banner tone="caution">On-device AI isn&apos;t available in this browser yet.</Banner>
      <Card actionType="click" name="click_rerun_failed_jobs">
        Re-run the failed jobs in this pipeline.
      </Card>
      <LocalNodeIcon title="On your device" />
      <OutboundApertureIcon title="Leaves your device" />
      <CheckpointIcon />
      <ClickIcon />
      <StopIcon title="Stop" />
    </main>
  );
}

describe('component primitives + icons', () => {
  it('render with no axe violations', async () => {
    const { container } = render(<Harness />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('destructive Button uses the caller-supplied label (no built-in OK/Confirm)', () => {
    const { getByRole } = render(<Button variant="destructive">Cancel subscription</Button>);
    getByRole('button', { name: 'Cancel subscription' });
  });
});
