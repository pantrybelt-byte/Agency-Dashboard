import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderPage, signInForTest } from '../test/renderPage';
import { OverviewPage } from './OverviewPage';

function renderAt(search: string) {
  return renderPage(<OverviewPage />, `/${search}`);
}

describe('OverviewPage', () => {
  beforeEach(() => {
    signInForTest();
  });

  it('shows the plain trend subtitle when compare is off', () => {
    renderAt('');
    expect(screen.getByText('30-day trend across all pantries')).toBeInTheDocument();
    expect(screen.queryByText('Comparison Active')).not.toBeInTheDocument();
  });

  it('shows the comparison affordances when compare is on', () => {
    renderAt('?compare=1');
    expect(screen.getByText('Comparison Active')).toBeInTheDocument();
    expect(
      screen.getByText('Comparing current period (green) against the previous period (indigo)'),
    ).toBeInTheDocument();
  });

  it('labels KPI trends against the resolved window length', () => {
    renderAt('?compare=1&range=7d');
    expect(screen.getAllByText('vs previous 7 days').length).toBeGreaterThan(0);
  });

  it('reflects the selected preset in the chart subtitle', () => {
    renderAt('?range=90d');
    expect(screen.getByText('90-day trend across all pantries')).toBeInTheDocument();
  });
});

describe('OverviewPage county scope', () => {
  beforeEach(() => {
    signInForTest();
  });

  it('summarises every assigned county by default', () => {
    renderAt('');
    // The demo user is assigned 8 counties; pantries outside them are excluded.
    expect(screen.getByText(/across 8 assigned counties/i)).toBeInTheDocument();
  });

  it('narrows the summary to a single county', () => {
    renderAt('?scope=Lowndes');
    expect(screen.getByText(/across Lowndes County/i)).toBeInTheDocument();
  });

  it('reduces families served when scoped to one county', () => {
    renderAt('');
    const allCounties = screen.getByText('Families Served').parentElement?.textContent ?? '';

    renderAt('?scope=Lowndes');
    const oneCounty = screen.getAllByText('Families Served').at(-1)?.parentElement?.textContent ?? '';

    expect(allCounties).not.toBe(oneCounty);
  });

  it('shows an empty state for a county with no reporting pantries', () => {
    // Jefferson is outside the demo user's assigned counties, so scoping to it
    // must produce nothing rather than leaking data.
    renderAt('?scope=Jefferson');
    expect(screen.getByText('No pantries in scope')).toBeInTheDocument();
  });

  it('never widens beyond the assigned counties', () => {
    renderAt('');
    // Mobile and Madison pantries exist in the dataset but are not assigned.
    expect(screen.queryByText(/Mobile Bay Nutrition/i)).not.toBeInTheDocument();
  });
});

describe('OverviewPage demographic segment', () => {
  beforeEach(() => {
    signInForTest();
  });

  it('defaults to all families', () => {
    renderAt('');
    expect(screen.getByRole('radio', { name: 'All Families' })).toBeChecked();
  });

  it('hydrates the segment from the URL', () => {
    renderAt('?segment=seniors');
    expect(screen.getByRole('radio', { name: 'Seniors 60+' })).toBeChecked();
    expect(screen.getByText(/Seniors 60\+ only/i)).toBeInTheDocument();
  });

  it('narrows the headline figure when a segment is chosen', async () => {
    const user = userEvent.setup();
    renderAt('');

    const before = screen.getByText('Families Served').parentElement?.textContent ?? '';
    await user.click(screen.getByRole('radio', { name: 'Children 0–17' }));
    const after = screen.getByText('Families Served').parentElement?.textContent ?? '';

    expect(after).not.toBe(before);
    expect(screen.getByRole('radio', { name: 'Children 0–17' })).toBeChecked();
  });
});
