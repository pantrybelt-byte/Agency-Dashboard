import { createContext } from 'react';
import type { CustomDateRange, DateRangePreset, DemographicSegment } from '../types';
import type { ResolvedDateRange } from '../utils/dateRange';

export interface DashboardFilterValue {
  dateRange: DateRangePreset;
  customRange: CustomDateRange | null;
  compareMode: boolean;
  /**
   * County the whole dashboard is narrowed to, or 'all' for every county the
   * signed-in user is assigned. Distinct from `selectedCountyId`, which is the
   * map's detail selection and does not narrow anything.
   */
  countyScope: string;
  /** Cohort the figures are narrowed to. */
  demographicSegment: DemographicSegment;
  selectedCountyId: string | null;
  /** Concrete dates for the current selection, plus the preceding window. */
  resolved: ResolvedDateRange;
  setDateRange: (preset: DateRangePreset, custom?: CustomDateRange) => void;
  setCompareMode: (enabled: boolean) => void;
  setCountyScope: (county: string) => void;
  setDemographicSegment: (segment: DemographicSegment) => void;
  setSelectedCountyId: (countyId: string | null) => void;
}

export const DashboardFilterContext = createContext<DashboardFilterValue | null>(null);
