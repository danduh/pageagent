import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ToolsSurface } from './ToolsSurface';
import { ScanGen } from './ScanGen';
import { AvailabilityBanner } from './AvailabilityBanner';
import { DENSE_TOOLS, OK_COVERAGE, SPARSE_TOOLS } from '../fixtures';
import type { ScanResult } from '../engine/types';

describe('ToolsSurface', () => {
  it('renders spec-cards, axe-clean', async () => {
    const { container, getByText } = render(<ToolsSurface tools={SPARSE_TOOLS} onRun={() => {}} />);
    getByText('Rerun failed jobs');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Run fires onRun for a tool', () => {
    const onRun = vi.fn();
    const { getAllByRole } = render(<ToolsSurface tools={SPARSE_TOOLS} onRun={onRun} />);
    fireEvent.click(getAllByRole('button', { name: /^Run /i })[0]);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('never shows an invented name for unlabeled controls', () => {
    const { getAllByText } = render(<ToolsSurface tools={DENSE_TOOLS} onRun={() => {}} />);
    expect(getAllByText(/Unnamed control \(icon only\)/i).length).toBeGreaterThan(0);
  });
});

describe('ScanGen', () => {
  const ok: ScanResult = { status: 'ok', tools: SPARSE_TOOLS, coverage: OK_COVERAGE };

  it('shows a coverage-honesty summary, axe-clean', async () => {
    const { container } = render(<ScanGen freshness="fresh" result={ok} onRescan={() => {}} />);
    expect(container.textContent).toMatch(/found .*tools? from .*elements?/i);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('exposes a status region while scanning', () => {
    const { getByRole } = render(
      <ScanGen freshness="scanning" result={null} onRescan={() => {}} />
    );
    getByRole('status');
  });
});

describe('AvailabilityBanner', () => {
  it('states the trade + offers a per-use cloud opt-in, axe-clean, no "protected" claim', async () => {
    const onUseCloudOnce = vi.fn();
    const { container, getByRole } = render(
      <AvailabilityBanner
        reason="On-device AI unavailable"
        cloudOffered
        onUseCloudOnce={onUseCloudOnce}
      />
    );
    expect(container.textContent).not.toMatch(/protected|secure/i);
    // The opt-in sits behind a "show what it sends" disclosure — the trade is stated first.
    fireEvent.click(getByRole('button', { name: /show what it sends/i }));
    fireEvent.click(getByRole('button', { name: /use cloud once/i }));
    expect(onUseCloudOnce).toHaveBeenCalledTimes(1);
    expect(await axe(container)).toHaveNoViolations();
  });
});
