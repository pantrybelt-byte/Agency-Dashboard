import React, { useCallback, useMemo, useState } from 'react';
import type { AgencyUser } from '../types';
import { mockCurrentUser } from '../data/mockData';
import { AuthContext, type AuthValue } from './AuthContext';

const STORAGE_KEY = 'accessbelt.session.v1';

/**
 * Read a previously stored demo session.
 *
 * This is session *restoration*, not authentication — nothing here verifies a
 * credential, and the stored value is not a token. Replace the body of this
 * provider with Firebase Auth before this reaches real users.
 */
function readStoredSession(): AgencyUser | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const email = (parsed as { email?: unknown }).email;
    if (typeof email !== 'string' || email.length === 0) return null;

    return { ...mockCurrentUser, email };
  } catch {
    // Corrupt or unreadable storage must never take the dashboard down.
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AgencyUser | null>(readStoredSession);

  const signIn = useCallback((email: string) => {
    setUser({ ...mockCurrentUser, email });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ email }));
    } catch {
      // Private browsing can reject writes; staying signed in for this tab is fine.
    }
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing useful to do if storage is unavailable.
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status: user ? 'authenticated' : 'unauthenticated',
      user,
      signIn,
      signOut,
    }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
