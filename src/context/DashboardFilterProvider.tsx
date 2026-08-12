import React, { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CustomDateRange, DateRangePreset, DemographicSegment } from '../types';
import { resolveDateRange, toISODate } from '../utils/dateRange';
import { ALL_COUNTIES, DEMOGRAPHIC_SEGMENTS } from '../utils/scoping';
import { DashboardFilterContext, type DashboardFilterValue } from './DashboardFilterContext';

const PRESETS: DateRangePreset[] = ['7d', '30d', '90d', 'ytd', 'custom'];
const SEGMENTS = DEMOGRAPHIC_SEGMENTS.map((entry) => entry.value);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Guards against an arbitrary query value being echoed into the UI. */
const COUNTY_NAME = /^[A-Za-z .'-]{2,40}$/;

function parsePreset(raw: string | null): DateRangePreset {
  return PRESETS.includes(raw as DateRangePreset) ? (raw as DateRangePreset) : '30d';
}

function parseSegment(raw: string | null): DemographicSegment {
  return SEGMENTS.includes(raw as DemographicSegment) ? (raw as DemographicSegment) : 'all';
}

function parseCountyScope(raw: string | null): string {
  if (!raw || raw === ALL_COUNTIES) return ALL_COUNTIES;
  return COUNTY_NAME.test(raw) ? raw : ALL_COUNTIES;
}

function parseCustomRange(from: string | null, to: string | null): CustomDateRange | null {
  if (!from || !to) return null;
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) return null;
  return { startDate: from, endDate: to };
}

interface DashboardFilterProviderProps {
  children: React.ReactNode;
  /** Injectable clock. Tests pass a fixed date; production leaves it undefined. */
  now?: Date;
}

/**
 * Holds every cross-page filter in the URL query string.
 *
 * The URL is the single source of truth on purpose: it makes the Share button
 * actually share the current view, makes filtered views bookmarkable, and gives
 * the future data layer a natural place to read query parameters from.
 */
export const DashboardFilterProvider: React.FC<DashboardFilterProviderProps> = ({ children, now }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const rangeParam = searchParams.get('range');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const compareParam = searchParams.get('compare');
  const countyParam = searchParams.get('county');
  const scopeParam = searchParams.get('scope');
  const segmentParam = searchParams.get('segment');

  // Reduce the clock to a date string so the memo below does not invalidate on
  // every render just because `new Date()` produced a new object.
  const todayISO = toISODate(now ?? new Date());

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          mutate(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setDateRange = useCallback(
    (preset: DateRangePreset, custom?: CustomDateRange) => {
      update((params) => {
        params.set('range', preset);
        if (preset === 'custom' && custom) {
          params.set('from', custom.startDate);
          params.set('to', custom.endDate);
        } else {
          params.delete('from');
          params.delete('to');
        }
      });
    },
    [update],
  );

  const setCompareMode = useCallback(
    (enabled: boolean) => {
      update((params) => {
        if (enabled) {
          params.set('compare', '1');
        } else {
          params.delete('compare');
        }
      });
    },
    [update],
  );

  const setCountyScope = useCallback(
    (county: string) => {
      update((params) => {
        if (county === ALL_COUNTIES) params.delete('scope');
        else params.set('scope', county);
      });
    },
    [update],
  );

  const setDemographicSegment = useCallback(
    (segment: DemographicSegment) => {
      update((params) => {
        if (segment === 'all') params.delete('segment');
        else params.set('segment', segment);
      });
    },
    [update],
  );

  const setSelectedCountyId = useCallback(
    (countyId: string | null) => {
      update((params) => {
        if (countyId) {
          params.set('county', countyId);
        } else {
          params.delete('county');
        }
      });
    },
    [update],
  );

  const value = useMemo<DashboardFilterValue>(() => {
    const dateRange = parsePreset(rangeParam);
    const customRange = parseCustomRange(fromParam, toParam);
    return {
      dateRange,
      customRange,
      compareMode: compareParam === '1',
      countyScope: parseCountyScope(scopeParam),
      demographicSegment: parseSegment(segmentParam),
      selectedCountyId: countyParam,
      resolved: resolveDateRange(dateRange, customRange, new Date(`${todayISO}T00:00:00.000Z`)),
      setDateRange,
      setCompareMode,
      setCountyScope,
      setDemographicSegment,
      setSelectedCountyId,
    };
  }, [
    rangeParam,
    fromParam,
    toParam,
    compareParam,
    countyParam,
    scopeParam,
    segmentParam,
    todayISO,
    setDateRange,
    setCompareMode,
    setCountyScope,
    setDemographicSegment,
    setSelectedCountyId,
  ]);

  return <DashboardFilterContext.Provider value={value}>{children}</DashboardFilterContext.Provider>;
};
