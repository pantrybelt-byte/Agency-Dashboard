import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RouteFallback } from '../ui/RouteFallback';

/**
 * Gate for every dashboard route. Preserves the attempted destination in
 * location state so the login screen can return the visitor to it.
 */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <RouteFallback />;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
