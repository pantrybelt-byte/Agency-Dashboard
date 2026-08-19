import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { MousePointerClick, ScanLine, Bell, Search, Navigation, TrendingUp, ArrowUpRight, Download } from 'lucide-react';
import { MetricCard } from '../components/ui/MetricCard';
import { ChartCard } from '../components/ui/ChartCard';
import { DataTable } from '../components/ui/DataTable';
import { DataStateBoundary } from '../components/ui/DataStateBoundary';
import {
  combineStatus,
  useCountyRollups,
  usePantryDirectory,
  usePantryRollups,
} from '../hooks/useDashboardData';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { interactionsSeries, pantryMetricsFor, summarise, totalsFor, growth } from '../utils/analytics';
import { ALL_COUNTIES } from '../utils/scoping';
import { exportToCSV } from '../utils/csvExport';

const interactionColors = {
  checkIns: '#10b981',
  itemScans: '#6366f1',
  notificationViews: '#f59e0b',
  searches: '#3b82f6',
  directions: '#ec4899',
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#1e2235] border border-white/[0.1] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-slate-400 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[12px] text-slate-300">{entry.name}:</span>
          <span className="text-[12px] font-semibold text-white">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export const PantryInteractionsPage: React.FC = () => {
  const [selectedPantry, setSelectedPantry] = useState<string | null>(null);
  const [searchPantry, setSearchPantry] = useState('');

  const { countyScope, resolved } = useDashboardFilters();
  const countyRollups = useCountyRollups();
  const pantryRollups = usePantryRollups();
  const directory = usePantryDirectory();
  const { status, error } = combineStatus(countyRollups, pantryRollups, directory);

  const dailyInteractions = useMemo(
    () => interactionsSeries(countyRollups.data.current),
    [countyRollups.data],
  );

  // Trends are the measured change against the equally sized window before
  // this one. They used to be four literals against a period control that did
  // not reach this page at all.
  const totals = useMemo(() => summarise(countyRollups.data), [countyRollups.data]);
  const previous = useMemo(() => totalsFor(countyRollups.data.previous), [countyRollups.data]);

  const pantries = useMemo(
    () => pantryMetricsFor(directory.data, pantryRollups.data),
    [directory.data, pantryRollups.data],
  );

  const sortedPantries = useMemo(() => {
    const term = searchPantry.toLowerCase();
    return pantries
      .filter(
        (p) => p.name.toLowerCase().includes(term) || p.county.toLowerCase().includes(term),
      )
      .sort((a, b) => b.totalVisits - a.totalVisits);
  }, [pantries, searchPantry]);

  const activePantry = selectedPantry ? pantries.find((p) => p.id === selectedPantry) ?? null : null;

  const handleExportLeaderboardCSV = () => {
    exportToCSV(`Pantry_Leaderboard_${countyScope === ALL_COUNTIES ? 'AllAssigned' : countyScope}`, sortedPantries, [
      { key: 'name', label: 'Pantry Name' },
      { key: 'county', label: 'County' },
      { key: 'type', label: 'Type' },
      { key: 'totalVisits', label: 'Total Visits' },
      { key: 'totalItemsDistributed', label: 'Items Distributed' },
      { key: 'growthRate', label: 'Growth Rate (%)' },
      { key: 'avgDailyVisits', label: 'Avg Daily Visits' },
    ]);
  };

  return (
    <div className="space-y-6">
      <DataStateBoundary
        status={status}
        error={error}
        source={countyRollups.source}
        isEmpty={status === 'ready' && dailyInteractions.length === 0}
        emptyTitle="No interactions in scope"
        emptyMessage={
          countyScope === ALL_COUNTIES
            ? 'No app activity was recorded for your counties in this period.'
            : `${countyScope} County recorded no app activity in this period.`
        }
        skeletonRows={4}
      >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Check-ins"
          value={totals.checkIns}
          trend={growth(totals.checkIns, previous.checkIns)}
          trendLabel={`vs previous ${resolved.dayCount} days`}
          icon={<MousePointerClick className="w-5 h-5 text-emerald-400" />}
          glowClass="metric-glow-emerald"
        />
        <MetricCard
          label="Item Scans"
          value={totals.itemScans}
          trend={growth(totals.itemScans, previous.itemScans)}
          trendLabel={`vs previous ${resolved.dayCount} days`}
          icon={<ScanLine className="w-5 h-5 text-indigo-400" />}
          glowClass="metric-glow-indigo"
          animationDelay="delay-100"
        />
        <MetricCard
          label="Notification Views"
          value={totals.notificationViews}
          trend={growth(totals.notificationViews, previous.notificationViews)}
          trendLabel={`vs previous ${resolved.dayCount} days`}
          icon={<Bell className="w-5 h-5 text-amber-400" />}
          glowClass="metric-glow-amber"
          animationDelay="delay-200"
        />
        <MetricCard
          label="Searches"
          value={totals.searches}
          trend={growth(totals.searches, previous.searches)}
          trendLabel={`vs previous ${resolved.dayCount} days`}
          icon={<Search className="w-5 h-5 text-blue-400" />}
          glowClass="metric-glow-blue"
          animationDelay="delay-300"
        />
      </div>

      {/* Daily Interactions Area Chart */}
      <ChartCard
        title="Daily Interactions"
        subtitle={`All interaction types · ${resolved.label}`}
        dataTable={{
          columns: ['Date', 'Check-ins', 'Item scans', 'Notification views'],
          rows: dailyInteractions.map((day) => [
            day.date,
            day.checkIns,
            day.itemScans,
            day.notificationViews,
          ]),
        }}
      >
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyInteractions} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="checkInsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={interactionColors.checkIns} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={interactionColors.checkIns} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="itemScansGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={interactionColors.itemScans} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={interactionColors.itemScans} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="notifGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={interactionColors.notificationViews} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={interactionColors.notificationViews} stopOpacity={0} />
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
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                iconType="circle"
                iconSize={8}
              />
              <Area type="monotone" dataKey="notificationViews" name="Notifications" stroke={interactionColors.notificationViews} strokeWidth={1.5} fill="url(#notifGrad)" dot={false} />
              <Area type="monotone" dataKey="itemScans" name="Item Scans" stroke={interactionColors.itemScans} strokeWidth={1.5} fill="url(#itemScansGrad)" dot={false} />
              <Area type="monotone" dataKey="checkIns" name="Check-ins" stroke={interactionColors.checkIns} strokeWidth={1.5} fill="url(#checkInsGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Pantry Leaderboard + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Leaderboard */}
        <ChartCard
          title="Pantry Leaderboard"
          subtitle="Ranked by total visits"
          className="lg:col-span-2"
          action={
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchPantry}
                onChange={(e) => setSearchPantry(e.target.value)}
                placeholder="Search Pantry..."
                className="px-3 py-1 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleExportLeaderboardCSV}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label="Export the pantry leaderboard as CSV"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          }
        >
          <DataTable
            caption="Pantries ranked by total visits. Select a pantry to see its detail."
            data={sortedPantries}
            rowKey={(pantry) => pantry.id}
            initialSortKey="totalVisits"
            emptyMessage={`No pantries match “${searchPantry}”.`}
            onRowClick={(pantry) => setSelectedPantry(selectedPantry === pantry.id ? null : pantry.id)}
            isRowSelected={(pantry) => selectedPantry === pantry.id}
            rowLabel={(pantry) => `Show detail for ${pantry.name}`}
            columns={[
              {
                key: 'name',
                label: 'Pantry',
                sortable: true,
                isRowTrigger: true,
                render: (pantry) => (
                  <span className="block">
                    <span className="block text-[13px] font-medium text-white">{pantry.name}</span>
                    <span className="block text-[11px] text-slate-400">
                      {pantry.county} Co. · {pantry.type}
                    </span>
                  </span>
                ),
              },
              {
                key: 'totalVisits',
                label: 'Visits',
                align: 'right',
                sortable: true,
                render: (pantry) => (
                  <span className="font-semibold text-white">{pantry.totalVisits.toLocaleString()}</span>
                ),
              },
              {
                key: 'totalItemsDistributed',
                label: 'Items',
                align: 'right',
                sortable: true,
                render: (pantry) => (
                  <span className="text-slate-200">{pantry.totalItemsDistributed.toLocaleString()}</span>
                ),
              },
              {
                key: 'growthRate',
                label: 'Growth',
                align: 'right',
                sortable: true,
                render: (pantry) => (
                  <span
                    className={`text-[12px] font-semibold ${
                      pantry.growthRate > 0 ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {pantry.growthRate > 0 ? '+' : ''}
                    {pantry.growthRate}%
                  </span>
                ),
              },
              {
                key: 'avgDailyVisits',
                label: 'Avg/Day',
                srLabel: ' average visits per day',
                align: 'right',
                sortable: true,
                render: (pantry) => <span className="text-slate-300">{pantry.avgDailyVisits}</span>,
              },
            ]}
          />
        </ChartCard>

        {/* Pantry Detail Panel */}
        <ChartCard
          title={activePantry ? activePantry.name : 'Pantry Detail'}
          subtitle={activePantry ? `${activePantry.county} County · ${activePantry.type}` : 'Select a pantry to view details'}
        >
          {activePantry ? (
            <div className="space-y-4">
              {/* Key Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <p className="text-[11px] text-slate-400 mb-1">Families Served</p>
                  <p className="text-lg font-bold text-white">{activePantry.familiesServed.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <p className="text-[11px] text-slate-400 mb-1">Total Visits</p>
                  <p className="text-lg font-bold text-white">{activePantry.totalVisits.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <p className="text-[11px] text-slate-400 mb-1">Items Out</p>
                  <p className="text-lg font-bold text-white">{activePantry.totalItemsDistributed.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <p className="text-[11px] text-slate-400 mb-1">Growth</p>
                  <p className={`text-lg font-bold flex items-center gap-1 ${activePantry.growthRate > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <TrendingUp className="w-4 h-4" />
                    {activePantry.growthRate > 0 ? '+' : ''}{activePantry.growthRate}%
                  </p>
                </div>
              </div>

              {/* Top Items */}
              <div>
                <p className="text-[12px] font-semibold text-slate-300 mb-2">Top Items</p>
                <div className="space-y-1.5">
                  {activePantry.topItems.map((item, idx) => (
                    <div key={item} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-white/[0.02]">
                      <span className="text-[11px] font-bold text-slate-400 w-4">{idx + 1}</span>
                      <span className="text-[12px] text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="p-3 rounded-xl bg-white/[0.03] flex items-center gap-2">
                <Navigation className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[12px] text-white">{activePantry.address}</p>
                  <p className="text-[11px] text-slate-400">{activePantry.city}, {activePantry.state}</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                Last updated {activePantry.lastUpdated}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
                <ArrowUpRight className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-[13px] text-slate-400">Click a row in the leaderboard</p>
              <p className="text-[12px] text-slate-400 mt-1">to view pantry details</p>
            </div>
          )}
        </ChartCard>
      </div>
      </DataStateBoundary>
    </div>
  );
};
