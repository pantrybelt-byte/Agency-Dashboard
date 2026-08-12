import { useContext } from 'react';
import { DashboardFilterContext, type DashboardFilterValue } from '../context/DashboardFilterContext';
import { resolveDateRange } from '../utils/dateRange';

const defaultResolved = resolveDateRange('30d', null, new Date());

const defaultFilterValue: DashboardFilterValue = {
  dateRange: '30d',
  customRange: null,
  compareMode: false,
  countyScope: 'all',
  demographicSegment: 'all',
  selectedCountyId: null,
  resolved: defaultResolved,
  setDateRange: () => {},
  setCompareMode: () => {},
  setCountyScope: () => {},
  setDemographicSegment: () => {},
  setSelectedCountyId: () => {},
};

export function useDashboardFilters(): DashboardFilterValue {
  const value = useContext(DashboardFilterContext);
  return value || defaultFilterValue;
}
