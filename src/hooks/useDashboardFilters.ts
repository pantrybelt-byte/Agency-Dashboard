import { useContext } from 'react';
import { DashboardFilterContext, type DashboardFilterValue } from '../context/DashboardFilterContext';

export function useDashboardFilters(): DashboardFilterValue {
  const value = useContext(DashboardFilterContext);
  if (!value) {
    throw new Error('useDashboardFilters must be used inside a DashboardFilterProvider');
  }
  return value;
}
