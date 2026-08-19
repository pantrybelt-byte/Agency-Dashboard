/**
 * The data spine shared by all four purchasable modules.
 *
 * Modules used to import mock arrays directly and hardcode their export scope
 * (`'all'`, `'sponsored'`, a radius string), which meant the county selector and
 * the date picker sitting above them controlled nothing. These are the paid
 * pages: a buyer evaluating the CSR module scopes to their sponsored county
 * first, and nothing happened.
 *
 * Everything here is already narrowed by the query, so a module page never
 * filters by county itself — it can only narrow further along its own axis
 * (a service radius, a POD status), which is the distinction that kept getting
 * lost.
 */
import { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import { useLiveData } from '../../hooks/useLiveData';
import {
  combineStatus,
  useCountyRollups,
  usePantryDirectory,
  usePantryRollups,
} from '../../hooks/useDashboardData';
import { subscribeCountyMetrics } from '../../services/dashboardData';
import { pantryMetricsFor, summarise, type PeriodSummary } from '../../utils/analytics';
import { ALL_COUNTIES, countyIdsForNames, resolveVisibleCounties } from '../../utils/scoping';
import type { ExportContext } from '../../utils/moduleExports';
import type { AlabamaCountyData } from '../../data/alabamaCounties';
import type { DataStatus } from '../../hooks/useLiveData';
import type { PantryMetric } from '../../types';

export interface ModuleData {
  /** Pantries in scope, with volume summed over the selected period. */
  pantries: PantryMetric[];
  /** County census rows for the counties in scope. */
  counties: AlabamaCountyData[];
  /** Volume and period-over-period trends for the same scope and period. */
  totals: PeriodSummary;
  /** Human description of the county scope, e.g. "Lowndes County". */
  scopeLabel: string;
  /** Human description of the period, e.g. "Last 30 days". */
  periodLabel: string;
  agencyName: string;
  status: DataStatus;
  error: Error | null;
  /**
   * Build the export context for this module's download.
   *
   * Modules pass their own narrowed slices — a radius, a status filter — but
   * never a wider set than the query returned, which is what keeps the file
   * inside the agency's coverage.
   */
  exportContext: (overrides: {
    pantries?: PantryMetric[];
    counties?: AlabamaCountyData[];
    scopeSuffix?: string;
    periodLabel?: string;
    agencyName?: string;
    containsModelledFigures: boolean;
  }) => ExportContext;
}

export function useModuleData(): ModuleData {
  const { user } = useAuth();
  const { countyScope, resolved } = useDashboardFilters();

  const countyRollups = useCountyRollups();
  const pantryRollups = usePantryRollups();
  const directory = usePantryDirectory();
  const countyMetrics = useLiveData(subscribeCountyMetrics, []);

  const visibleCounties = useMemo(
    () => resolveVisibleCounties(user?.assignedCounties ?? [], countyScope),
    [user, countyScope],
  );

  const pantries = useMemo(
    () => pantryMetricsFor(directory.data, pantryRollups.data),
    [directory.data, pantryRollups.data],
  );

  const counties = useMemo(() => {
    const inScope = new Set(countyIdsForNames(countyMetrics.data, visibleCounties));
    return countyMetrics.data.filter((county) => inScope.has(county.id));
  }, [countyMetrics.data, visibleCounties]);

  const totals = useMemo(() => summarise(countyRollups.data), [countyRollups.data]);

  const scopeLabel =
    countyScope === ALL_COUNTIES
      ? `${visibleCounties.length} assigned ${visibleCounties.length === 1 ? 'county' : 'counties'}`
      : `${countyScope} County`;

  const { status, error } = combineStatus(countyRollups, pantryRollups, directory);
  const agencyName = user?.organization ?? 'AccessBelt agency';

  const exportContext: ModuleData['exportContext'] = (overrides) => ({
    pantries: overrides.pantries ?? pantries,
    counties: overrides.counties ?? counties,
    countyScope:
      countyScope === ALL_COUNTIES
        ? `AllAssigned${overrides.scopeSuffix ? `_${overrides.scopeSuffix}` : ''}`
        : `${countyScope}${overrides.scopeSuffix ? `_${overrides.scopeSuffix}` : ''}`,
    periodLabel: overrides.periodLabel ?? resolved.label,
    agencyName: overrides.agencyName ?? agencyName,
    containsModelledFigures: overrides.containsModelledFigures,
  });

  return {
    pantries,
    counties,
    totals,
    scopeLabel,
    periodLabel: resolved.label,
    agencyName,
    status,
    error,
    exportContext,
  };
}
