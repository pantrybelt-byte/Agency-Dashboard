/**
 * The hooks every page uses to read data.
 *
 * A page should never assemble its own query. Doing so is precisely how the
 * county scope came to be honoured on some pages and quietly ignored on others:
 * each page decided for itself, and four of them decided not to. Here the scope
 * and the period are derived once, from the filter context and the signed-in
 * user, and every consumer inherits both.
 *
 * The subscription for a query is memoised on the query's contents rather than
 * its identity. `useLiveData` tears down and reattaches its listener whenever
 * the subscribe function changes, so a fresh closure on every render would mean
 * a fresh Firestore listener on every render.
 */
import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useDashboardFilters } from './useDashboardFilters';
import { useLiveData, type DataStatus, type LiveData } from './useLiveData';
import {
  countyRollupQuery,
  pantryDirectoryQuery,
  pantryRollupQuery,
  subscribeItemCatalogue,
  type DataQuery,
  type ItemCatalogueEntry,
  type PantryProfile,
  type RollupWindow,
  type Subscribe,
} from '../services/dashboardData';
import type { CountyDailyDoc, PantryDailyDoc } from '../data/schema';
import { resolveVisibleCounties } from '../utils/scoping';

const EMPTY_WINDOW = { current: [], previous: [] };

/**
 * The query implied by the current user and the current filters.
 *
 * `counties` is the intersection of what the agency is assigned and what the
 * scope selector narrowed to — scoping is a filter, never a grant, so it can
 * only ever shrink this list.
 */
export function useScopedQuery(): DataQuery {
  const { user } = useAuth();
  const { countyScope, resolved } = useDashboardFilters();

  const assigned = user?.assignedCounties ?? [];
  const countiesKey = resolveVisibleCounties(assigned, countyScope).join('|');

  return useMemo(
    () => ({
      counties: countiesKey === '' ? [] : countiesKey.split('|'),
      startDate: resolved.startDate,
      endDate: resolved.endDate,
      previousStartDate: resolved.previousStartDate,
      previousEndDate: resolved.previousEndDate,
    }),
    [countiesKey, resolved.startDate, resolved.endDate, resolved.previousStartDate, resolved.previousEndDate],
  );
}

/** Attach a windowed subscription, rebuilding it only when the query changes. */
function useWindowed<T extends { date: string; county: string }>(
  factory: (q: DataQuery) => Subscribe<RollupWindow<T>>,
  query: DataQuery,
): LiveData<RollupWindow<T>> {
  const { counties, startDate, endDate, previousStartDate, previousEndDate } = query;
  const countiesKey = counties.join('|');

  const subscribe = useMemo(
    () =>
      factory({
        counties: countiesKey === '' ? [] : countiesKey.split('|'),
        startDate,
        endDate,
        previousStartDate,
        previousEndDate,
      }),
    [factory, countiesKey, startDate, endDate, previousStartDate, previousEndDate],
  );

  return useLiveData(subscribe, EMPTY_WINDOW as RollupWindow<T>);
}

/** County-day rollups for the active scope and period, plus the previous period. */
export function useCountyRollups(): LiveData<RollupWindow<CountyDailyDoc>> {
  return useWindowed(countyRollupQuery, useScopedQuery());
}

/** Per-pantry rollups for the active scope and period. */
export function usePantryRollups(): LiveData<RollupWindow<PantryDailyDoc>> {
  return useWindowed(pantryRollupQuery, useScopedQuery());
}

/** The pantry directory for the counties in scope. Stable attributes only. */
export function usePantryDirectory(): LiveData<PantryProfile[]> {
  const { counties } = useScopedQuery();
  const countiesKey = counties.join('|');

  const subscribe = useMemo(
    () => pantryDirectoryQuery(countiesKey === '' ? [] : countiesKey.split('|')),
    [countiesKey],
  );

  return useLiveData(subscribe, [] as PantryProfile[]);
}

/** The item catalogue. Not scoped: an item exists whether or not it was requested here. */
export function useItemCatalogue(): LiveData<ItemCatalogueEntry[]> {
  return useLiveData(subscribeItemCatalogue, [] as ItemCatalogueEntry[]);
}

/**
 * Reduce several subscriptions to one status for a single `DataStateBoundary`.
 *
 * Worst case wins: any error is an error, and anything still loading keeps the
 * whole view in its skeleton. Showing three of four panels while the fourth is
 * still arriving invites someone to read a partial figure as a final one.
 */
export function combineStatus(...parts: { status: DataStatus; error: Error | null }[]): {
  status: DataStatus;
  error: Error | null;
} {
  const error = parts.find((part) => part.status === 'error');
  if (error) return { status: 'error', error: error.error };
  if (parts.some((part) => part.status === 'loading')) return { status: 'loading', error: null };
  return { status: 'ready', error: null };
}
