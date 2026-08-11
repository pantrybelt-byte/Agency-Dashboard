import { createContext } from 'react';
import type { AgencyUser } from '../types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthValue {
  /**
   * 'loading' is never emitted by the demo provider, which reads localStorage
   * synchronously. It exists so Firebase `onAuthStateChanged` — which resolves
   * asynchronously — can be swapped in without any consumer changing, and
   * without the login page flashing during session restore.
   */
  status: AuthStatus;
  user: AgencyUser | null;
  signIn: (email: string) => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthValue | null>(null);
