import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Users, Store, Package, AlertTriangle, TrendingUp, Download, ShieldCheck, X, GitCompare, Filter, Heart, UserCheck } from 'lucide-react';
import { MetricCard } from '../components/ui/MetricCard';
import { ChartCard } from '../components/ui/ChartCard';
import {
  mockRegionSummary,
  mockFamiliesServedSeries,
  mockCategoryBreakdown,
  mockDistributionByType,
  mockPantryMetrics,
} from '../data/mockData';
import { exportToCSV } from '../utils/csvExport';
import { useDashboardFilters } from '../hooks/useDashboardFilters';

type DemographicSegment = 'all' | 'children' | 'seniors' | 'first_time' | 'emergency';

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
  const [segment, setSegment] = useState<DemographicSegment>('all');

  const filters = useDashboardFilters();
  const countyScope = filters.countyScope || 'all';
  const compareMode = filters.compareMode;

  const summary = mockRegionSummary;

  // Filter pantries by Header County Scope
  const filteredPantries = mockPantryMetrics.filter((p) => {
    if (!countyScope || countyScope === 'all') return true;
    return p.county.toLowerCase() === countyScope.toLowerCase();
  });

  const topPantries = [...filteredPantries]
    .sort((a, b) => b.totalVisits - a.totalVisits)
    .slice(0, 5);

  // Calculate scope multiplier when a single county is selected vs all region
  const countyMultiplier = countyScope === 'all' ? 1.0 : countyScope === 'Montgomery' ? 0.45 : countyScope === 'Autauga' ? 0.18 : countyScope === 'Elmore' ? 0.15 : countyScope === 'Lowndes' ? 0.08 : countyScope === 'Macon' ? 0.08 : 0.06;

  // Apply Segment Multipliers & County Scope multipliers for live dynamic simulation
  const segmentMultiplier = segment === 'children' ? 0.37 : segment === 'seniors' ? 0.21 : segment === 'first_time' ? 0.19 : segment === 'emergency' ? 0.09 : 1.0;
  const combinedMultiplier = countyMultiplier * segmentMultiplier;

  const displayFamilies = Math.round(summary.totalFamiliesServed * combinedMultiplier);
  const displayItems = Math.round(summary.totalItemsDistributed * combinedMultiplier);

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
      {/* Executive Notice */}
      {showBanner && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">
                River Region Executive Overview {countyScope !== 'all' ? `— ${countyScope} County` : '— All Counties'}
              </p>
              <p className="text-[12px] text-slate-400">
                {countyScope === 'all'
                  ? 'Aggregated metrics across partner pantries in Montgomery, Autauga, Elmore, Lowndes, Macon, and Dallas counties.'
                  : `Isolated metrics and active pantry operations for ${countyScope} County.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={handleExportTopPantriesCSV}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[12px] font-semibold hover:bg-emerald-500/25 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Executive CSV
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Demographic Segment Filter Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Demographic Filter:</span>
          {[
            { id: 'all', label: 'All Recipients', icon: Users },
            { id: 'children', label: 'Children (0–17)', icon: Heart },
            { id: 'seniors', label: 'Seniors (60+)', icon: Users },
            { id: 'first_time', label: 'First-Time Recipients', icon: UserCheck },
            { id: 'emergency', label: 'Emergency Food Support', icon: AlertTriangle },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSegment(item.id as DemographicSegment)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                segment === item.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white bg-white/[0.03] border border-white/[0.06]'
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          ))}
        </div>

        {countyScope !== 'all' && (
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
            Scoped to: {countyScope} County
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Families Served"
          value={displayFamilies}
          trend={summary.familiesServedTrend}
          trendLabel={compareMode ? 'vs previous 30 days' : 'vs last period'}
          icon={<Users className="w-5 h-5 text-emerald-400" />}
          glowClass="metric-glow-emerald"
        />
        <MetricCard
          label="Active Pantries in Scope"
          value={`${filteredPantries.filter(p => p.isActive).length} / ${filteredPantries.length}`}
          icon={<Store className="w-5 h-5 text-indigo-400" />}
          glowClass="metric-glow-indigo"
          animationDelay="delay-100"
        />
        <MetricCard
          label="Items Distributed"
          value={displayItems}
          trend={summary.itemsDistributedTrend}
          trendLabel={compareMode ? 'vs previous 30 days' : 'vs last period'}
          icon={<Package className="w-5 h-5 text-amber-400" />}
          glowClass="metric-glow-amber"
          animationDelay="delay-200"
        />
        <MetricCard
          label="Food Desert Score"
          value={`${countyScope === 'Lowndes' ? 18 : countyScope === 'Macon' ? 24 : countyScope === 'Dallas' ? 31 : countyScope === 'Montgomery' ? 58 : countyScope === 'Autauga' ? 62 : countyScope === 'Elmore' ? 71 : summary.avgFoodDesertScore}/100`}
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          glowClass="metric-glow-blue"
          animationDelay="delay-300"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Families Served Area Chart */}
        <ChartCard
          title="Families Served Over Time"
          subtitle={compareMode ? 'Comparing Current Period (Green) vs Previous Period (Indigo)' : '30-day trend across pantries in scope'}
          className="lg:col-span-2"
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
                data={mockFamiliesServedSeries.map(d => ({
                  ...d,
                  value: Math.round(d.value * combinedMultiplier),
                  previousValue: d.previousValue ? Math.round(d.previousValue * combinedMultiplier) : undefined,
                }))}
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
                  data={mockDistributionByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {mockDistributionByType.map((entry, index) => (
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
              {mockDistributionByType.map((item) => (
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
                data={mockCategoryBreakdown.map(c => ({ ...c, value: Math.round(c.value * combinedMultiplier) }))}
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
                  {mockCategoryBreakdown.map((entry, index) => (
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
                    <p className="text-[11px] text-slate-500">{pantry.county} County</p>
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
              <p className="text-[12px] text-slate-500 py-4 text-center">No active pantries in {countyScope} County.</p>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};
