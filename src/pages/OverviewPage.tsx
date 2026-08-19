import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, Download, X, GitCompare, Info } from 'lucide-react';
import { ACCENTS, type PresetMetrics } from '../config/presets';
import { usePreset } from '../hooks/usePreset';
import { EntitlementBadge } from '../components/ui/StatusBadge';
import { MetricCard } from '../components/ui/MetricCard';
import { ChartCard } from '../components/ui/ChartCard';
import { SegmentFilter } from '../components/ui/SegmentFilter';
import { DataStateBoundary } from '../components/ui/DataStateBoundary';
import { useAuth } from '../hooks/useAuth';
import { useLiveData } from '../hooks/useLiveData';
import { subscribeCountyMetrics } from '../services/dashboardData';
import {
  combineStatus,
  useCountyRollups,
  usePantryDirectory,
  usePantryRollups,
} from '../hooks/useDashboardData';
import {
  categoryBreakdownFor,
  dailySeries,
  demographicsFor,
  distributionByType,
  pantryMetricsFor,
  summarise,
} from '../utils/analytics';
import { ZIP_DIRECTORY } from '../data/zipDirectory';
import { ALL_COUNTIES, countyIdsForNames, resolveVisibleCounties, segmentLabel, segmentShare } from '../utils/scoping';
import { exportToCSV, exportBundleToCSV } from '../utils/csvExport';
import { buildModuleExport } from '../utils/moduleExports';
import { useDashboardFilters } from '../hooks/useDashboardFilters';


const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#1e2235] border border-white/[0.1] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-slate-400 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-[12px] font-semibold" style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export const OverviewPage: React.FC = () => {
  const [showBanner, setShowBanner] = useState(true);
  const {
    compareMode,
    resolved,
    countyScope,
    demographicSegment,
    setDemographicSegment,
  } = useDashboardFilters();
  const { user } = useAuth();
  const { preset } = usePreset();
  const accent = ACCENTS[preset.accent];

  // Everything on this page reads the same scoped, period-bounded rollups, so
  // the county selector and the date picker reach every figure by construction
  // rather than by each chart remembering to apply them.
  const countyRollups = useCountyRollups();
  const pantryRollups = usePantryRollups();
  const directory = usePantryDirectory();
  const countyMetrics = useLiveData(subscribeCountyMetrics, []);

  const { status, error } = combineStatus(countyRollups, pantryRollups, directory);
  const source = countyRollups.source;

  const assignedCounties = useMemo(() => user?.assignedCounties ?? [], [user]);
  const visibleCounties = useMemo(
    () => resolveVisibleCounties(assignedCounties, countyScope),
    [assignedCounties, countyScope],
  );

  const scopedPantries = useMemo(
    () => pantryMetricsFor(directory.data, pantryRollups.data),
    [directory.data, pantryRollups.data],
  );

  // The segment share is derived from the demographics of the counties and days
  // actually in scope, so narrowing to one county changes what "seniors" means
  // there rather than reapplying a region-wide ratio.
  const demographics = useMemo(
    () => demographicsFor(countyRollups.data, ZIP_DIRECTORY),
    [countyRollups.data],
  );
  const segmentFraction = useMemo(
    () => segmentShare(demographics, demographicSegment),
    [demographics, demographicSegment],
  );

  const totals = useMemo(() => summarise(countyRollups.data), [countyRollups.data]);

  const summary = useMemo(() => {
    const scale = demographicSegment === 'all' ? 1 : segmentFraction;
    return {
      totalFamiliesServed: Math.round(totals.familiesServed * scale),
      totalItemsDistributed: Math.round(totals.itemsDistributed * scale),
      totalPantries: scopedPantries.length,
      activePantries: scopedPantries.filter((pantry) => pantry.isActive).length,
      familiesServedTrend: totals.familiesTrend,
      itemsDistributedTrend: totals.itemsTrend,
    };
  }, [totals, scopedPantries, demographicSegment, segmentFraction]);

  const familiesSeries = useMemo(() => {
    const series = dailySeries(countyRollups.data, (doc) => doc.familiesServed);
    if (demographicSegment === 'all') return series;
    return series.map((point) => ({
      ...point,
      value: Math.round(point.value * segmentFraction),
      previousValue:
        point.previousValue === undefined ? undefined : Math.round(point.previousValue * segmentFraction),
    }));
  }, [countyRollups.data, demographicSegment, segmentFraction]);

  const categoryBreakdown = useMemo(() => {
    const scale = demographicSegment === 'all' ? 1 : segmentFraction;
    return categoryBreakdownFor(countyRollups.data.current).map((entry) => ({
      ...entry,
      value: Math.round(entry.value * scale),
    }));
  }, [countyRollups.data, demographicSegment, segmentFraction]);

  const distribution = useMemo(() => distributionByType(directory.data), [directory.data]);

  /**
   * Mean food access score across the counties in scope, from the census
   * rollup. Previously this was a hand-typed lookup covering six county names
   * and silently falling back to a region average for everyone else.
   */
  const avgFoodDesertScore = useMemo(() => {
    const inScope = new Set(countyIdsForNames(countyMetrics.data, visibleCounties));
    const scores = countyMetrics.data
      .filter((county) => inScope.has(county.id))
      .map((county) => county.foodAccessScore);
    if (scores.length === 0) return 0;
    return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
  }, [countyMetrics.data, visibleCounties]);

  /** County census rows for the counties in scope — the export's other half. */
  const scopedCounties = useMemo(() => {
    const inScope = new Set(countyIdsForNames(countyMetrics.data, visibleCounties));
    return countyMetrics.data.filter((county) => inScope.has(county.id));
  }, [countyMetrics.data, visibleCounties]);

  const topPantries = useMemo(
    () => [...scopedPantries].sort((a, b) => b.totalVisits - a.totalVisits).slice(0, 5),
    [scopedPantries],
  );

  // One computation of the underlying figures; each preset selects and
  // reframes them rather than recomputing its own.
  const presetMetrics: PresetMetrics = useMemo(
    () => ({
      familiesServed: summary.totalFamiliesServed,
      itemsDistributed: summary.totalItemsDistributed,
      activePantries: summary.activePantries,
      totalPantries: summary.totalPantries,
      foodDesertScore: avgFoodDesertScore,
      countyCount: visibleCounties.length,
      pantriesInScope: scopedPantries.length,
      familiesTrend: summary.familiesServedTrend,
      itemsTrend: summary.itemsDistributedTrend,
      trendLabel: `vs previous ${resolved.dayCount} days`,
    }),
    [summary, avgFoodDesertScore, visibleCounties.length, scopedPantries.length, resolved.dayCount],
  );

  const presetKpis = useMemo(() => preset.buildKpis(presetMetrics), [preset, presetMetrics]);
  const hasIllustrativeKpis = presetKpis.some((kpi) => kpi.illustrative);

  // Each module produces its own file shape rather than one shared pantry
  // list under five different names.
  const handlePresetExport = () => {
    const bundle = buildModuleExport(preset.id, {
      pantries: scopedPantries,
      // Scoped, not the whole state: the file is the copy that leaves the
      // building, so it must not carry counties the agency does not cover.
      counties: scopedCounties,
      countyScope,
      periodLabel: `${resolved.dayCount} days`,
      agencyName: user?.organization ?? 'AccessBelt agency',
      containsModelledFigures: hasIllustrativeKpis,
    });
    exportBundleToCSV(bundle);
  };

  const scopeDescription =
    countyScope === ALL_COUNTIES ? `${visibleCounties.length} assigned counties` : `${countyScope} County`;

  const handleExportTopPantriesCSV = () => {
    exportToCSV(`AccessBelt_Top_Pantries_${countyScope}`, topPantries, [
      { key: 'name', label: 'Pantry Name' },
      { key: 'county', label: 'County' },
      { key: 'totalVisits', label: 'Total Visits' },
      { key: 'totalItemsDistributed', label: 'Items Distributed' },
      { key: 'familiesServed', label: 'Families Served' },
      { key: 'growthRate', label: 'Growth Rate (%)' },
    ]);
  };

  return (
    <div className="space-y-6">
      <DataStateBoundary
        status={status}
        error={error}
        source={source}
        isEmpty={scopedPantries.length === 0}
        emptyTitle="No pantries in scope"
        emptyMessage={
          countyScope === ALL_COUNTIES
            ? 'No pantries are reporting for your assigned counties yet.'
            : `${countyScope} County has no reporting pantries. Widen the county scope in the header.`
        }
      >
      {/* Preset masthead — identity, entitlement, and the primary export CTA */}
      {showBanner && (
        <section
          aria-label={`${preset.name} view`}
          className={`card-accent card animate-fade-in-up ${accent.text} p-5`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${accent.border} ${accent.bg}`}
              >
                <preset.icon className={`h-5 w-5 ${accent.text}`} aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-bold tracking-tight text-white">{preset.name}</h2>
                  <EntitlementBadge
                    locked={false}
                    variant={preset.access === 'included' ? 'included' : 'purchased'}
                  />
                </div>

                <p className="mt-1 text-[12px] text-slate-300">
                  {scopedPantries.length} partner{' '}
                  {scopedPantries.length === 1 ? 'pantry' : 'pantries'} across {scopeDescription}
                  {demographicSegment !== 'all' && ` · ${segmentLabel(demographicSegment)} only`}.
                </p>

                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {preset.focus.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-slate-300"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex shrink-0 items-start gap-2">
              <div className="text-right">
                <button
                  type="button"
                  onClick={handlePresetExport}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold text-[#0b0d14] transition-colors cursor-pointer ${accent.solid} ${accent.solidHover}`}
                >
                  <preset.exportIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="text-left">{preset.exportLabel}</span>
                </button>
                <p className="mt-1.5 max-w-[16rem] text-[11px] text-slate-400">{preset.exportNote}</p>
              </div>

              <button
                type="button"
                onClick={() => setShowBanner(false)}
                aria-label="Dismiss the executive overview notice"
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      )}

      <SegmentFilter value={demographicSegment} onChange={setDemographicSegment} />

      {hasIllustrativeKpis && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5 text-[11px] text-amber-200/90">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Figures marked <span className="font-semibold">Sample</span> in this view are modelled
            from pantry activity and are not yet drawn from a source system. They are for layout
            and demonstration only — do not cite them in a filing or audit.
          </span>
        </p>
      )}

      {/* KPI row — the preset decides which four figures this buyer cares about */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {presetKpis.map((kpi, index) => (
          <MetricCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
            trendLabel={kpi.trendLabel}
            mono={kpi.mono}
            illustrative={kpi.illustrative}
            emphasis={index === 0 ? 'lead' : 'default'}
            icon={<kpi.icon className={`w-5 h-5 ${accent.text}`} aria-hidden="true" />}
            glowClass={kpi.glow}
            animationDelay={['', 'delay-100', 'delay-200', 'delay-300'][index] ?? ''}
          />
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Families Served Area Chart */}
        <ChartCard
          title="Families Served Over Time"
          subtitle={
            compareMode
              ? 'Comparing current period (green) against the previous period (indigo)'
              : `${resolved.dayCount}-day trend across all pantries`
          }
          className="lg:col-span-2"
          // The headline chart was the only one on the page with no text
          // equivalent, which also made it the only one a screen reader could
          // not read at all.
          dataTable={{
            columns: compareMode
              ? ['Day', 'Families served', 'Previous period']
              : ['Day', 'Families served'],
            rows: familiesSeries.map((point) =>
              compareMode
                ? [point.date, point.value, point.previousValue ?? 0]
                : [point.date, point.value],
            ),
          }}
          action={
            compareMode ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                <GitCompare className="w-3 h-3" />
                Comparison Active
              </span>
            ) : undefined
          }
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={familiesSeries}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="familiesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                {compareMode && (
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} iconType="circle" />
                )}
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Current Period"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#familiesGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981', stroke: '#0f1117', strokeWidth: 2 }}
                />
                {compareMode && (
                  <Area
                    type="monotone"
                    dataKey="previousValue"
                    name="Previous Period"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="url(#previousGradient)"
                    dot={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Distribution by Type Donut */}
        <ChartCard
          title="Distribution by Type"
          subtitle="Pantry distribution methods"
        >
          <div className="h-[280px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}%`, '']}
                  contentStyle={{
                    backgroundColor: '#1e2235',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f1f5f9',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {distribution.map((item) => (
                <div key={item.category} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-slate-400">{item.category}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Items by Category Bar Chart */}
        <ChartCard
          title="Items Distributed by Category"
          subtitle="Total volume breakdown"
          className="lg:col-span-2"
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryBreakdown}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  dataKey="category"
                  type="category"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Items" radius={[0, 6, 6, 0]} barSize={20}>
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Top Pantries Table */}
        <ChartCard
          title={`Top Pantries in Scope (${countyScope === 'all' ? 'All Counties' : countyScope})`}
          subtitle={`Showing ${topPantries.length} pantries`}
          action={
            <button
              onClick={handleExportTopPantriesCSV}
              className="text-[12px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          }
        >
          <div className="space-y-3">
            {topPantries.length > 0 ? (
              topPantries.map((pantry, idx) => (
                <div
                  key={pantry.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-[12px] font-bold text-slate-400 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">{pantry.name}</p>
                    <p className="text-[11px] text-slate-400">{pantry.county} County</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-semibold text-white">{pantry.totalVisits.toLocaleString()}</p>
                    <p className={`text-[11px] font-medium flex items-center gap-0.5 justify-end ${
                      pantry.growthRate > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      <TrendingUp className="w-3 h-3" />
                      {pantry.growthRate > 0 ? '+' : ''}{pantry.growthRate}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[12px] text-slate-400 py-4 text-center">No active pantries in {countyScope} County.</p>
            )}
          </div>
        </ChartCard>
      </div>
      </DataStateBoundary>
    </div>
  );
};
