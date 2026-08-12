import { useContext } from 'react';
import { AuthContext, type AuthValue } from '../context/AuthContext';
import { mockCurrentUser } from '../data/mockData';

const defaultAuthValue: AuthValue = {
  status: 'authenticated',
  user: mockCurrentUser,
  signIn: () => {},
  signOut: () => {},
};

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  return value || defaultAuthValue;
}
