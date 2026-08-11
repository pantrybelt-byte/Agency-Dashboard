import React, { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CustomDateRange, DateRangePreset } from '../types';
import { resolveDateRange, toISODate } from '../utils/dateRange';
import { DashboardFilterContext, type DashboardFilterValue } from './DashboardFilterContext';

const PRESETS: DateRangePreset[] = ['7d', '30d', '90d', 'ytd', 'custom'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parsePreset(raw: string | null): DateRangePreset {
  return PRESETS.includes(raw as DateRangePreset) ? (raw as DateRangePreset) : '30d';
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
      selectedCountyId: countyParam,
      resolved: resolveDateRange(dateRange, customRange, new Date(`${todayISO}T00:00:00.000Z`)),
      setDateRange,
      setCompareMode,
      setSelectedCountyId,
    };
  }, [
    rangeParam,
    fromParam,
    toParam,
    compareParam,
    countyParam,
    todayISO,
    setDateRange,
    setCompareMode,
    setSelectedCountyId,
  ]);

  return <DashboardFilterContext.Provider value={value}>{children}</DashboardFilterContext.Provider>;
};
