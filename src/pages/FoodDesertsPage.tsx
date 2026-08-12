import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { MapPin, AlertTriangle, TrendingDown, DollarSign, ShoppingCart, ChevronDown, ChevronUp, Download, Bell, Sparkles, Navigation, Layers } from 'lucide-react';
import { ChartCard } from '../components/ui/ChartCard';
import { AlabamaHeatMap } from '../components/ui/AlabamaHeatMap';
import { AlabamaGisMap } from '../components/ui/AlabamaGisMap';
import { DataStateBoundary } from '../components/ui/DataStateBoundary';
import { type AlabamaCountyData } from '../data/alabamaCounties';
import { exportToCSV } from '../utils/csvExport';
import { useAuth } from '../hooks/useAuth';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { useLiveData } from '../hooks/useLiveData';
import { subscribeCountyMetrics, subscribePantries } from '../services/dashboardData';
import { ALL_COUNTIES, filterPantriesByScope, resolveVisibleCounties } from '../utils/scoping';
import type { PantryMetric } from '../types';

const statusColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
  'At Risk': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  Moderate: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400' },
  Adequate: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
};

const scoreBarColors = (score: number) => {
  if (score < 25) return '#ef4444';
  if (score < 40) return '#f59e0b';
  if (score < 60) return '#3b82f6';
  return '#10b981';
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#1e2235] border border-white/[0.1] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-slate-400 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-[12px] font-semibold" style={{ color: entry.color }}>
          Score: {entry.value}/100
        </p>
      ))}
    </div>
  );
};

export const FoodDesertsPage: React.FC = () => {
  const { user } = useAuth();
  const { countyScope } = useDashboardFilters();
  const counties = useLiveData(subscribeCountyMetrics, []);
  const { data: pantries } = useLiveData(subscribePantries, []);
  const [selectedPantry, setSelectedPantry] = useState<PantryMetric | null>(null);

  const visibleCounties = useMemo(
    () => resolveVisibleCounties(user?.assignedCounties ?? [], countyScope),
    [user, countyScope],
  );
  const scopedPantries = useMemo(
    () => filterPantriesByScope(pantries, visibleCounties),
    [pantries, visibleCounties],
  );
  const [selectedCounty, setSelectedCounty] = useState<AlabamaCountyData | null>(null);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'choropleth' | 'gis'>('choropleth');

  const sortedZones = [...counties.data].sort((a, b) => a.foodAccessScore - b.foodAccessScore);
  const criticalCount = sortedZones.filter(z => z.status === 'Critical').length;
  const atRiskCount = sortedZones.filter(z => z.status === 'At Risk').length;
  const avgDistance =
    sortedZones.length === 0
      ? '—'
      : (sortedZones.reduce((s, z) => s + z.nearestPantryMiles, 0) / sortedZones.length).toFixed(1);

  const handleExportCSV = () => {
    exportToCSV('Alabama_All_Counties_Food_Desert_Assessment', sortedZones, [
      { key: 'name', label: 'County Name' },
      { key: 'region', label: 'Region' },
      { key: 'status', label: 'Status' },
      { key: 'foodAccessScore', label: 'Food Access Score (0-100)' },
      { key: 'population', label: 'Population' },
      { key: 'povertyRate', label: 'Poverty Rate (%)' },
      { key: 'medianIncome', label: 'Median Household Income ($)' },
      { key: 'nearestPantryMiles', label: 'Nearest Pantry Distance (Miles)' },
      { key: 'activePantries', label: 'Active Pantries' },
      { key: 'topRequestedItem', label: 'Top Need Item' },
    ]);
  };

  const handleCreateAlert = (countyName: string) => {
    setToastMessage(`Threshold alert configured for ${countyName}! Notification sent to Agency Director.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectCountyFromMap = (county: AlabamaCountyData) => {
    setSelectedCounty(county);
    setExpandedZone(county.id);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1d2e] border border-amber-500/30 shadow-xl px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in-up">
          <Bell className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-[13px] text-white">{toastMessage}</p>
        </div>
      )}

      {/* Top Title Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">Alabama Food Desert Vulnerability Index</h2>
            <p className="text-[12px] text-slate-400">
              Interactive 67-County Alabama SVG Vector Heatmap & GIS Pantry Location pins based on USDA & Census metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Map View Mode Switcher */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setMapMode('choropleth')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                mapMode === 'choropleth'
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              County Choropleth
            </button>
            <button
              onClick={() => setMapMode('gis')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                mapMode === 'gis'
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              GIS Pantry Map
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-[12px] font-semibold hover:bg-emerald-600 transition-colors cursor-pointer shadow-md shadow-emerald-500/20 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Alert Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-l-red-500/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{criticalCount}</p>
              <p className="text-[12px] text-slate-400">Critical Zones (&lt; 25 Access Score)</p>
            </div>
          </div>
        </div>
        <div className="card p-5 border-l-4 border-l-amber-500/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{atRiskCount}</p>
              <p className="text-[12px] text-slate-400">At-Risk Alabama Counties</p>
            </div>
          </div>
        </div>
        <div className="card p-5 border-l-4 border-l-blue-500/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{avgDistance} mi</p>
              <p className="text-[12px] text-slate-400">Statewide Avg Pantry Distance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Feature: Interactive Map Display (Choropleth OR GIS View) */}
      <ChartCard
        title={mapMode === 'choropleth' ? 'Interactive Alabama County Heatmap' : 'GIS Pantry Coordinate Locations'}
        subtitle={
          mapMode === 'choropleth'
            ? 'Albers equal-area projection · Hover or focus a county to inspect metrics · Select one to expand its detail below'
            : 'Pantry coordinates projected onto the same county geometry · Marker area shows families served'
        }
      >
        <DataStateBoundary
          status={counties.status}
          error={counties.error}
          source={counties.source}
          skeletonRows={4}
        >
          {mapMode === 'choropleth' ? (
            <AlabamaHeatMap
              counties={sortedZones}
              selectedCountyId={selectedCounty?.id}
              onSelectCounty={handleSelectCountyFromMap}
            />
          ) : (
            <AlabamaGisMap
              pantries={scopedPantries}
              visibleCounties={
                countyScope === ALL_COUNTIES ? (user?.assignedCounties ?? []) : visibleCounties
              }
              selectedPantryId={selectedPantry?.id}
              onSelectPantry={setSelectedPantry}
            />
          )}
        </DataStateBoundary>
      </ChartCard>

      {/* Food Access Score Ranking Chart */}
      <ChartCard
        title="Food Access Score by County (Lowest to Highest)"
        subtitle="Lower scores indicate severe food desert vulnerability"
        action={
          <button
            onClick={handleExportCSV}
            className="text-[12px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        }
      >
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedZones.slice(0, 20)} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={50}
                tickFormatter={(val: string) => val.replace(' County', '')}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="foodAccessScore" name="Access Score" radius={[6, 6, 0, 0]} barSize={24}>
                {sortedZones.slice(0, 20).map((entry, index) => (
                  <Cell key={index} fill={scoreBarColors(entry.foodAccessScore)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Expandable County Detail Cards */}
      <ChartCard
        title="County Census Metrics & ZIP Tracts"
        subtitle={selectedCounty ? `Selected: ${selectedCounty.name}` : 'Click any county in the heatmap to view metrics'}
      >
        <div className="space-y-2">
          {sortedZones.map((zone) => {
            const colors = statusColors[zone.status];
            const isExpanded = expandedZone === zone.id;

            return (
              <div
                key={zone.id}
                className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden transition-all ${
                  selectedCounty?.id === zone.id ? 'ring-2 ring-emerald-400/50' : ''
                }`}
              >
                <button
                  onClick={() => {
                    setExpandedZone(isExpanded ? null : zone.id);
                    setSelectedCounty(zone);
                  }}
                  className="w-full flex items-center justify-between p-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${colors.dot} ${zone.status === 'Critical' ? 'animate-pulse-glow' : ''}`} />
                    <div className="text-left">
                      <p className="text-[14px] font-semibold text-white">{zone.name} ({zone.abbrev})</p>
                      <p className="text-[12px] text-slate-400">
                        {zone.region} · Pop. {zone.population.toLocaleString()} · ZIPs: {zone.zipCodes.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${colors.text}`}>{zone.foodAccessScore}/100</p>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {zone.status}
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04] pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-white/[0.03]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-[11px] text-slate-400">Nearest Pantry</p>
                        </div>
                        <p className="text-[15px] font-bold text-white">{zone.nearestPantryMiles} mi</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.03]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-[11px] text-slate-400">Active Pantries</p>
                        </div>
                        <p className="text-[15px] font-bold text-white">{zone.activePantries}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.03]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-[11px] text-slate-400">Median Income</p>
                        </div>
                        <p className="text-[15px] font-bold text-white">${zone.medianIncome.toLocaleString()}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.03]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingDown className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-[11px] text-slate-400">Below Poverty</p>
                        </div>
                        <p className="text-[15px] font-bold text-white">{zone.povertyRate}%</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-[12px] text-slate-400">
                        Top Requested Need: <span className="text-emerald-400 font-semibold">{zone.topRequestedItem}</span>
                      </p>
                      <button
                        onClick={() => handleCreateAlert(zone.name)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Set Threshold Alert
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
};
