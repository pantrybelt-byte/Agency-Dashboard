import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DashboardFilterProvider } from '../context/DashboardFilterProvider';
import { OverviewPage } from './OverviewPage';

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/${search}`]}>
      <DashboardFilterProvider now={new Date('2026-08-11T00:00:00.000Z')}>
        <OverviewPage />
      </DashboardFilterProvider>
    </MemoryRouter>,
  );
}

describe('OverviewPage', () => {
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
