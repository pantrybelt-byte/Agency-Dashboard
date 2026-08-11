import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../../context/AuthProvider';
import { RequireAuth } from './RequireAuth';

function LoginStub() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from;
  return (
    <div>
      <span data-testid="screen">login</span>
      <span data-testid="from">{from ? `${from.pathname}${from.search ?? ''}` : 'none'}</span>
    </div>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginStub />} />
          <Route
            path="/food-deserts"
            element={
              <RequireAuth>
                <span data-testid="screen">food deserts</span>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('redirects an unauthenticated visitor to the login route', () => {
    renderAt('/food-deserts');
    expect(screen.getByTestId('screen')).toHaveTextContent('login');
  });

  it('remembers the route the visitor was trying to reach', () => {
    renderAt('/food-deserts');
    expect(screen.getByTestId('from')).toHaveTextContent('/food-deserts');
  });

  it('remembers the filter query string as well as the path', () => {
    renderAt('/food-deserts?range=7d&compare=1');
    expect(screen.getByTestId('from')).toHaveTextContent('/food-deserts?range=7d&compare=1');
  });

  it('renders the protected content for a restored session', () => {
    window.localStorage.setItem(
      'accessbelt.session.v1',
      JSON.stringify({ email: 'director@unitedwayriverregion.org' }),
    );
    renderAt('/food-deserts');
    expect(screen.getByTestId('screen')).toHaveTextContent('food deserts');
  });
});
