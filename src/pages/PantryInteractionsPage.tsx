import React, { useState } from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { MousePointerClick, ScanLine, Bell, Search, Navigation, TrendingUp, ArrowUpRight, Download } from 'lucide-react';
import { MetricCard } from '../components/ui/MetricCard';
import { ChartCard } from '../components/ui/ChartCard';
import { mockDailyInteractions, mockPantryMetrics } from '../data/mockData';
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

  const totalCheckIns = mockDailyInteractions.reduce((s, d) => s + d.checkIns, 0);
  const totalItemScans = mockDailyInteractions.reduce((s, d) => s + d.itemScans, 0);
  const totalNotifications = mockDailyInteractions.reduce((s, d) => s + d.notificationViews, 0);
  const totalSearches = mockDailyInteractions.reduce((s, d) => s + d.searches, 0);

  const sortedPantries = [...mockPantryMetrics]
    .filter(p => p.name.toLowerCase().includes(searchPantry.toLowerCase()) || p.county.toLowerCase().includes(searchPantry.toLowerCase()))
    .sort((a, b) => b.totalVisits - a.totalVisits);

  const activePantry = selectedPantry ? mockPantryMetrics.find(p => p.id === selectedPantry) : null;

  const handleExportLeaderboardCSV = () => {
    exportToCSV('Pantry_Leaderboard_Interactions', sortedPantries, [
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
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Check-ins"
          value={totalCheckIns}
          trend={14.2}
          trendLabel="vs last period"
          icon={<MousePointerClick className="w-5 h-5 text-emerald-400" />}
          glowClass="metric-glow-emerald"
        />
        <MetricCard
          label="Item Scans"
          value={totalItemScans}
          trend={19.8}
          trendLabel="vs last period"
          icon={<ScanLine className="w-5 h-5 text-indigo-400" />}
          glowClass="metric-glow-indigo"
          animationDelay="delay-100"
        />
        <MetricCard
          label="Notification Views"
          value={totalNotifications}
          trend={23.1}
          trendLabel="vs last period"
          icon={<Bell className="w-5 h-5 text-amber-400" />}
          glowClass="metric-glow-amber"
          animationDelay="delay-200"
        />
        <MetricCard
          label="Searches"
          value={totalSearches}
          trend={8.4}
          trendLabel="vs last period"
          icon={<Search className="w-5 h-5 text-blue-400" />}
          glowClass="metric-glow-blue"
          animationDelay="delay-300"
        />
      </div>

      {/* Daily Interactions Area Chart */}
      <ChartCard
        title="Daily Interactions"
        subtitle="All interaction types across 30-day window"
      >
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockDailyInteractions} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
                className="px-3 py-1 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleExportLeaderboardCSV}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Export CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">#</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Pantry</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Visits</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Items</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Growth</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Avg/Day</th>
                </tr>
              </thead>
              <tbody>
                {sortedPantries.map((pantry, idx) => (
                  <tr
                    key={pantry.id}
                    onClick={() => setSelectedPantry(selectedPantry === pantry.id ? null : pantry.id)}
                    className={`border-b border-white/[0.03] cursor-pointer transition-colors ${
                      selectedPantry === pantry.id ? 'bg-emerald-500/[0.06]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <td className="py-3 px-3 text-[13px] text-slate-500 font-medium">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div>
                        <p className="text-[13px] font-medium text-white">{pantry.name}</p>
                        <p className="text-[11px] text-slate-500">{pantry.county} Co. · {pantry.type}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[13px] font-semibold text-white text-right">{pantry.totalVisits.toLocaleString()}</td>
                    <td className="py-3 px-3 text-[13px] text-slate-300 text-right">{pantry.totalItemsDistributed.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`text-[12px] font-semibold ${pantry.growthRate > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pantry.growthRate > 0 ? '+' : ''}{pantry.growthRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[13px] text-slate-400 text-right">{pantry.avgDailyVisits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                      <span className="text-[11px] font-bold text-slate-500 w-4">{idx + 1}</span>
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

              <p className="text-[11px] text-slate-500 text-center">
                Last updated {activePantry.lastUpdated}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
                <ArrowUpRight className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-[13px] text-slate-400">Click a row in the leaderboard</p>
              <p className="text-[12px] text-slate-500 mt-1">to view pantry details</p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};
