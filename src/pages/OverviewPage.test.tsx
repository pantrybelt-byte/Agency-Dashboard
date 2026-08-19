import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderPage, signInForTest } from '../test/renderPage';
import { OverviewPage } from './OverviewPage';

function renderAt(search: string) {
  return renderPage(<OverviewPage />, `/${search}`);
}

/**
 * Every assertion here awaits: the page now reads scoped, period-bounded
 * rollups through a subscription rather than importing a mock array, so its
 * first paint is legitimately a skeleton. A synchronous `getBy` would be
 * asserting against the loading state.
 */
async function familiesServedText(): Promise<string> {
  const label = await screen.findByText('Families Served');
  return label.parentElement?.textContent ?? '';
}

describe('OverviewPage', () => {
  beforeEach(() => {
    signInForTest();
  });

  it('shows the plain trend subtitle when compare is off', async () => {
    renderAt('');
    expect(await screen.findByText('30-day trend across all pantries')).toBeInTheDocument();
    expect(screen.queryByText('Comparison Active')).not.toBeInTheDocument();
  });

  it('shows the comparison affordances when compare is on', async () => {
    renderAt('?compare=1');
    expect(await screen.findByText('Comparison Active')).toBeInTheDocument();
    expect(
      screen.getByText('Comparing current period (green) against the previous period (indigo)'),
    ).toBeInTheDocument();
  });

  it('labels KPI trends against the resolved window length', async () => {
    renderAt('?compare=1&range=7d');
    expect((await screen.findAllByText('vs previous 7 days')).length).toBeGreaterThan(0);
  });

  it('reflects the selected preset in the chart subtitle', async () => {
    renderAt('?range=90d');
    expect(await screen.findByText('90-day trend across all pantries')).toBeInTheDocument();
  });
});

describe('OverviewPage county scope', () => {
  beforeEach(() => {
    signInForTest();
  });

  it('summarises every assigned county by default', async () => {
    renderAt('');
    // The demo user is assigned 8 counties; pantries outside them are excluded.
    expect(await screen.findByText(/across 8 assigned counties/i)).toBeInTheDocument();
  });

  it('narrows the summary to a single county', async () => {
    renderAt('?scope=Lowndes');
    expect(await screen.findByText(/across Lowndes County/i)).toBeInTheDocument();
  });

  it('reduces families served when scoped to one county', async () => {
    const all = renderAt('');
    const allCounties = await familiesServedText();
    all.unmount();

    renderAt('?scope=Lowndes');
    const oneCounty = await familiesServedText();

    expect(allCounties).not.toBe(oneCounty);
  });

  it('shows an empty state for a county with no reporting pantries', async () => {
    // Jefferson is outside the demo user's assigned counties, so scoping to it
    // must produce nothing rather than leaking data.
    renderAt('?scope=Jefferson');
    expect(await screen.findByText('No pantries in scope')).toBeInTheDocument();
  });

  it('never widens beyond the assigned counties', async () => {
    renderAt('');
    await screen.findByText(/across 8 assigned counties/i);
    // Mobile and Madison pantries exist in the dataset but are not assigned.
    expect(screen.queryByText(/Mobile Bay Nutrition/i)).not.toBeInTheDocument();
  });
});

describe('OverviewPage date range', () => {
  beforeEach(() => {
    signInForTest();
  });

  it('reports a different total for a shorter window', async () => {
    // The whole point of pushing the period into the query: a seven-day view
    // must not report the same volume as a ninety-day one.
    const short = renderAt('?range=7d');
    const sevenDays = await familiesServedText();
    short.unmount();

    renderAt('?range=90d');
    const ninetyDays = await familiesServedText();

    expect(sevenDays).not.toBe(ninetyDays);
  });

  it('plots one point per day in the selected window', async () => {
    renderAt('?range=7d');
    const table = await screen.findByRole('table', { name: /families served over time/i });
    // Header row plus seven days.
    expect(within(table).getAllByRole('row')).toHaveLength(8);
  });
});

describe('OverviewPage demographic segment', () => {
  beforeEach(() => {
    signInForTest();
  });

  it('defaults to all families', async () => {
    renderAt('');
    expect(await screen.findByRole('radio', { name: 'All Families' })).toBeChecked();
  });

  it('hydrates the segment from the URL', async () => {
    renderAt('?segment=seniors');
    expect(await screen.findByRole('radio', { name: 'Seniors 60+' })).toBeChecked();
    expect(screen.getByText(/Seniors 60\+ only/i)).toBeInTheDocument();
  });

  it('narrows the headline figure when a segment is chosen', async () => {
    const user = userEvent.setup();
    renderAt('');

    const before = await familiesServedText();
    await user.click(await screen.findByRole('radio', { name: 'Children 0–17' }));
    const after = await familiesServedText();

    expect(after).not.toBe(before);
    expect(screen.getByRole('radio', { name: 'Children 0–17' })).toBeChecked();
  });
});
