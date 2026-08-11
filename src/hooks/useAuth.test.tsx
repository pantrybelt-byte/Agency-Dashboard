import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthProvider';
import { useAuth } from './useAuth';

function Probe() {
  const { status, user, signIn, signOut } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="org">{user?.organization ?? 'none'}</span>
      <button onClick={() => signIn('director@unitedwayriverregion.org')}>sign in</button>
      <button onClick={signOut}>sign out</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe('AuthProvider', () => {
  it('starts unauthenticated with no stored session', () => {
    renderProbe();
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('email')).toHaveTextContent('none');
  });

  it('authenticates and applies the supplied email to the profile', async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole('button', { name: 'sign in' }));
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('email')).toHaveTextContent('director@unitedwayriverregion.org');
    expect(screen.getByTestId('org')).not.toHaveTextContent('none');
  });

  it('restores the session on remount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderProbe();
    await user.click(screen.getByRole('button', { name: 'sign in' }));
    unmount();

    renderProbe();
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('email')).toHaveTextContent('director@unitedwayriverregion.org');
  });

  it('clears the stored session on sign out', async () => {
    const user = userEvent.setup();
    const { unmount } = renderProbe();
    await user.click(screen.getByRole('button', { name: 'sign in' }));
    await user.click(screen.getByRole('button', { name: 'sign out' }));
    unmount();

    renderProbe();
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('ignores a corrupt stored session instead of crashing', () => {
    window.localStorage.setItem('accessbelt.session.v1', '{not json');
    renderProbe();
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('ignores a stored session with no usable email', () => {
    window.localStorage.setItem('accessbelt.session.v1', '{"email":42}');
    renderProbe();
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });
});

describe('useAuth', () => {
  it('throws when used outside the provider', () => {
    expect(() => render(<Probe />)).toThrow(/AuthProvider/);
  });
});
