import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { App } from './App';

describe('App (side panel)', () => {
  it('renders the shell', () => {
    const { getByRole, getByPlaceholderText } = render(<App />);
    getByRole('heading', { name: /PageAgent/i }); // throws if absent
    getByPlaceholderText(/tell this page/i);
    getByRole('tab', { name: /Chat/i });
  });

  it('has no axe violations', async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('axe detects a known violation (gate proof)', async () => {
    const Bad = () => {
      // eslint-disable-next-line jsx-a11y/alt-text
      return <img src="x.png" />;
    };
    const { container } = render(<Bad />);
    const results = await axe(container);
    expect(results.violations.length).toBeGreaterThan(0);
  });
});
