import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ConfirmGate } from './ConfirmGate';
import { ProcessingLocus } from './ProcessingLocus';
import type { GatePreview } from '../engine/types';

const tier1: GatePreview = {
  tier: 1,
  verb: 'click',
  toolName: 'click_cancel_subscription',
  targetLabel: 'the "Cancel subscription" button in Billing',
  consequence: 'This ends your Pro plan on 30 Aug 2026 and can’t be undone from here.',
  provenance: 'Because you asked: "cancel my subscription."',
  proceedLabel: 'Cancel subscription',
  cancelLabel: 'Don’t cancel',
  locatable: true,
};
const tier2: GatePreview = {
  ...tier1,
  tier: 2,
  toolName: 'click_pay_now',
  targetLabel: 'the "Pay" button in Checkout',
  value: '$500.00 to Jordan',
  consequence: 'This sends $500.00 now and can’t be undone.',
  reacknowledge: '$500.00',
  proceedLabel: 'Pay $500.00',
  cancelLabel: 'Don’t pay',
};
const unlocatable: GatePreview = { ...tier1, locatable: false };

describe('ConfirmGate — safety invariants', () => {
  it('is a labelled alertdialog with no axe violations', async () => {
    const { container, getByRole } = render(
      <ConfirmGate preview={tier1} onApprove={() => {}} onCancel={() => {}} />
    );
    getByRole('alertdialog');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('puts initial focus on the safe action, never Approve', () => {
    const { getByRole } = render(
      <ConfirmGate preview={tier1} onApprove={() => {}} onCancel={() => {}} />
    );
    expect(document.activeElement).toBe(getByRole('button', { name: /don’t cancel/i }));
    expect(document.activeElement).not.toBe(
      getByRole('button', { name: /^cancel subscription$/i })
    );
  });

  it('has no <form> and the proceed button is type=button (Enter cannot submit)', () => {
    const { container, getByRole } = render(
      <ConfirmGate preview={tier1} onApprove={() => {}} onCancel={() => {}} />
    );
    expect(container.querySelector('form')).toBeNull();
    expect(getByRole('button', { name: /^cancel subscription$/i }).getAttribute('type')).toBe(
      'button'
    );
  });

  it('Escape fires onCancel', () => {
    const onCancel = vi.fn();
    const { getByRole } = render(
      <ConfirmGate preview={tier1} onApprove={() => {}} onCancel={onCancel} />
    );
    fireEvent.keyDown(getByRole('alertdialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Tier 2: Approve is disabled until the value is re-acknowledged, then fires', () => {
    const onApprove = vi.fn();
    const { getByRole } = render(
      <ConfirmGate preview={tier2} onApprove={onApprove} onCancel={() => {}} />
    );
    const approve = getByRole('button', { name: /pay \$500\.00/i });
    expect(approve).toBeDisabled();
    fireEvent.click(approve);
    expect(onApprove).not.toHaveBeenCalled();
    fireEvent.click(getByRole('checkbox')); // the comprehension re-acknowledgment
    fireEvent.click(getByRole('button', { name: /pay \$500\.00/i }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('locate-or-decline: an unlocatable target offers no Approve path', () => {
    const { queryByRole } = render(
      <ConfirmGate preview={unlocatable} onApprove={() => {}} onCancel={() => {}} />
    );
    expect(queryByRole('button', { name: /^cancel subscription$/i })).toBeNull();
  });
});

describe('ProcessingLocus — honesty', () => {
  it('off-device + audioEgress never claims reasoning stayed local', () => {
    const { container, queryByText } = render(<ProcessingLocus locus="off-device" audioEgress />);
    expect(queryByText(/stayed on your device/i)).toBeNull();
    expect(container.textContent).toMatch(/left your device/i);
  });

  it('on-device resting makes no "protected"/"secure" claim', () => {
    const { container } = render(<ProcessingLocus locus="on-device" />);
    expect(container.textContent).not.toMatch(/protected|secure/i);
  });
});
