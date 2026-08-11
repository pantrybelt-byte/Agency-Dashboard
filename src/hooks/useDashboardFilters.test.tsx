import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DashboardFilterProvider } from '../context/DashboardFilterProvider';
import { useDashboardFilters } from './useDashboardFilters';

const FIXED_NOW = new Date('2026-08-11T00:00:00.000Z');

function Probe() {
  const {
    dateRange,
    customRange,
    compareMode,
    selectedCountyId,
    resolved,
    setDateRange,
    setCompareMode,
    setSelectedCountyId,
  } = useDashboardFilters();

  return (
    <div>
      <span data-testid="range">{dateRange}</span>
      <span data-testid="custom">
        {customRange ? `${customRange.startDate}/${customRange.endDate}` : 'none'}
      </span>
      <span data-testid="compare">{String(compareMode)}</span>
      <span data-testid="county">{selectedCountyId ?? 'none'}</span>
      <span data-testid="start">{resolved.startDate}</span>
      <button onClick={() => setDateRange('7d')}>seven days</button>
      <button onClick={() => setDateRange('custom', { startDate: '2026-01-05', endDate: '2026-01-09' })}>
        custom range
      </button>
      <button onClick={() => setCompareMode(true)}>enable compare</button>
      <button onClick={() => setSelectedCountyId('lowndes')}>select lowndes</button>
    </div>
  );
}

function renderProbe(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DashboardFilterProvider now={FIXED_NOW}>
        <Probe />
      </DashboardFilterProvider>
    </MemoryRouter>,
  );
}

describe('DashboardFilterProvider', () => {
  it('defaults to a 30 day range with compare off and no county', () => {
    renderProbe('/');
    expect(screen.getByTestId('range')).toHaveTextContent('30d');
    expect(screen.getByTestId('compare')).toHaveTextContent('false');
    expect(screen.getByTestId('county')).toHaveTextContent('none');
    expect(screen.getByTestId('start')).toHaveTextContent('2026-07-13');
  });

  it('hydrates every filter from the URL', () => {
    renderProbe('/?range=7d&compare=1&county=macon');
    expect(screen.getByTestId('range')).toHaveTextContent('7d');
    expect(screen.getByTestId('compare')).toHaveTextContent('true');
    expect(screen.getByTestId('county')).toHaveTextContent('macon');
    expect(screen.getByTestId('start')).toHaveTextContent('2026-08-05');
  });

  it('hydrates a custom range from the URL', () => {
    renderProbe('/?range=custom&from=2026-03-01&to=2026-03-31');
    expect(screen.getByTestId('custom')).toHaveTextContent('2026-03-01/2026-03-31');
    expect(screen.getByTestId('start')).toHaveTextContent('2026-03-01');
  });

  it('ignores an unrecognised range and falls back to 30d', () => {
    renderProbe('/?range=banana');
    expect(screen.getByTestId('range')).toHaveTextContent('30d');
  });

  it('ignores a malformed custom range', () => {
    renderProbe('/?range=custom&from=not-a-date&to=2026-03-31');
    expect(screen.getByTestId('custom')).toHaveTextContent('none');
  });

  it('updates the resolved window when the preset changes', async () => {
    const user = userEvent.setup();
    renderProbe('/');
    await user.click(screen.getByRole('button', { name: 'seven days' }));
    expect(screen.getByTestId('range')).toHaveTextContent('7d');
    expect(screen.getByTestId('start')).toHaveTextContent('2026-08-05');
  });

  it('stores a custom range and clears it when another preset is chosen', async () => {
    const user = userEvent.setup();
    renderProbe('/');
    await user.click(screen.getByRole('button', { name: 'custom range' }));
    expect(screen.getByTestId('custom')).toHaveTextContent('2026-01-05/2026-01-09');

    await user.click(screen.getByRole('button', { name: 'seven days' }));
    expect(screen.getByTestId('custom')).toHaveTextContent('none');
  });

  it('toggles compare mode', async () => {
    const user = userEvent.setup();
    renderProbe('/');
    await user.click(screen.getByRole('button', { name: 'enable compare' }));
    expect(screen.getByTestId('compare')).toHaveTextContent('true');
  });

  it('records the selected county', async () => {
    const user = userEvent.setup();
    renderProbe('/');
    await user.click(screen.getByRole('button', { name: 'select lowndes' }));
    expect(screen.getByTestId('county')).toHaveTextContent('lowndes');
  });

  it('preserves unrelated filters when one changes', async () => {
    const user = userEvent.setup();
    renderProbe('/?county=macon');
    await user.click(screen.getByRole('button', { name: 'enable compare' }));
    expect(screen.getByTestId('county')).toHaveTextContent('macon');
    expect(screen.getByTestId('compare')).toHaveTextContent('true');
  });
});

describe('useDashboardFilters', () => {
  it('throws when used outside the provider', () => {
    expect(() =>
      render(
        <MemoryRouter>
          <Probe />
        </MemoryRouter>,
      ),
    ).toThrow(/DashboardFilterProvider/);
  });
});
