import type React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';
import { DashboardFilterProvider } from '../context/DashboardFilterProvider';

const FIXED_NOW = new Date('2026-08-11T00:00:00.000Z');

/** Seed a signed-in demo session before rendering anything auth-gated. */
export function signInForTest(email = 'director@unitedwayriverregion.org') {
  window.localStorage.setItem('accessbelt.session.v1', JSON.stringify({ email }));
}

/**
 * Render a page inside the providers it expects, with a fixed clock so
 * date-derived copy is stable.
 */
export function renderPage(ui: React.ReactElement, initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <DashboardFilterProvider now={FIXED_NOW}>{ui}</DashboardFilterProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}
