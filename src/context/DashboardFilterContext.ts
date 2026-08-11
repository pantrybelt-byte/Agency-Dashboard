import { createContext } from 'react';
import type { CustomDateRange, DateRangePreset } from '../types';
import type { ResolvedDateRange } from '../utils/dateRange';

export interface DashboardFilterValue {
  dateRange: DateRangePreset;
  customRange: CustomDateRange | null;
  compareMode: boolean;
  selectedCountyId: string | null;
  /** Concrete dates for the current selection, plus the preceding window. */
  resolved: ResolvedDateRange;
  setDateRange: (preset: DateRangePreset, custom?: CustomDateRange) => void;
  setCompareMode: (enabled: boolean) => void;
  setSelectedCountyId: (countyId: string | null) => void;
}

export const DashboardFilterContext = createContext<DashboardFilterValue | null>(null);
