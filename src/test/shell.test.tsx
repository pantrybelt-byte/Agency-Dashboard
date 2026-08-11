import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { signInForTest } from './renderPage';

/**
 * Exercises the whole shell — sidebar, header, skip link and a routed page —
 * rather than a page in isolation, so layout-level regressions are caught.
 */
async function renderApp(path = '/') {
  window.history.pushState({}, '', path);
  const result = render(<App />);
  // Routes are lazily imported, so wait for real page content rather than for
  // the Suspense fallback to clear — the header carries its own status region.
  await screen.findByRole('heading', { name: /families served over time/i });
  return result;
}

describe('dashboard shell', () => {
  beforeEach(() => {
    signInForTest();
  });

  it('has no detectable axe violations', async () => {
    const { container } = await renderApp('/');
    const results = await axe(container);
    expect(
      results.violations.map((violation) => ({ id: violation.id, help: violation.help })),
    ).toEqual([]);
  });

  it('exposes a skip link as the first tab stop', async () => {
    const user = userEvent.setup();
    await renderApp('/');

    await user.tab();
    expect(document.activeElement).toHaveTextContent('Skip to main content');
    expect(document.activeElement).toHaveAttribute('href', '#main-content');
  });

  it('gives the page a single level-one heading', async () => {
    await renderApp('/');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('exposes navigation and main landmarks', async () => {
    await renderApp('/');
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('opens the account menu with the keyboard and closes it with Escape', async () => {
    const user = userEvent.setup();
    await renderApp('/');

    const trigger = screen.getByRole('button', { name: /account menu/i });
    await user.click(trigger);

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    // Focus must come back to the trigger, not vanish to the document body.
    expect(document.activeElement).toBe(trigger);
  });

  it('traps focus inside the custom date range dialog and restores it on close', async () => {
    const user = userEvent.setup();
    await renderApp('/');

    const customButton = screen.getAllByRole('button', { name: 'Custom' })[0];
    await user.click(customButton);

    const dialog = await screen.findByRole('dialog', { name: /custom date range/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(customButton);
  });
});
