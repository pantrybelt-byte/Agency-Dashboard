import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { MapPin, AlertTriangle, TrendingDown, DollarSign, ShoppingCart, ChevronDown, ChevronUp, Download, Bell, Map as MapIcon, Navigation, Layers, Lock } from 'lucide-react';
import { VerificationBadge, verificationLevelFor } from '../components/ui/StatusBadge';
import { ACCENTS } from '../config/presets';
import { usePreset } from '../hooks/usePreset';
import { ChartCard } from '../components/ui/ChartCard';
import { AlabamaHeatMap } from '../components/ui/AlabamaHeatMap';
import { AlabamaGisMap } from '../components/ui/AlabamaGisMap';
import { DataStateBoundary } from '../components/ui/DataStateBoundary';
import { type AlabamaCountyData } from '../data/alabamaCounties';
import { exportToCSV } from '../utils/csvExport';
import { useAuth } from '../hooks/useAuth';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { useLiveData } from '../hooks/useLiveData';
import { useNavigate } from 'react-router-dom';
import { saveThresholdAlert, subscribeCountyMetrics } from '../services/dashboardData';
import { combineStatus, usePantryDirectory, usePantryRollups } from '../hooks/useDashboardData';
import { pantryMetricsFor } from '../utils/analytics';
import { ALL_COUNTIES, countyIdsForNames, resolveVisibleCounties } from '../utils/scoping';
import { Crosshair } from 'lucide-react';
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
  const { preset } = usePreset();
  const accent = ACCENTS[preset.accent];
  const { user } = useAuth();
  const { countyScope, setCountyScope } = useDashboardFilters();
  const counties = useLiveData(subscribeCountyMetrics, []);
  // The directory and its rollups are already narrowed to the counties in
  // scope by the query, so there is nothing left to filter here.
  const directory = usePantryDirectory();
  const pantryRollups = usePantryRollups();
  const [selectedPantry, setSelectedPantry] = useState<PantryMetric | null>(null);

  const visibleCounties = useMemo(
    () => resolveVisibleCounties(user?.assignedCounties ?? [], countyScope),
    [user, countyScope],
  );
  const scopedPantries = useMemo(
    () => pantryMetricsFor(directory.data, pantryRollups.data),
    [directory.data, pantryRollups.data],
  );
  const pantryState = combineStatus(directory, pantryRollups);
  const [selectedCounty, setSelectedCounty] = useState<AlabamaCountyData | null>(null);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'choropleth' | 'gis'>('choropleth');
  const [showAllZones, setShowAllZones] = useState(false);
  const navigate = useNavigate();

  // The county-scope control speaks in bare names; the choropleth speaks in
  // ids. Everything below this line works in ids so the two stay joined.
  const unlockedCountyIds = useMemo(
    () => countyIdsForNames(counties.data, user?.assignedCounties ?? []),
    [counties.data, user],
  );
  const scopedCountyIds = useMemo(
    () => countyIdsForNames(counties.data, visibleCounties),
    [counties.data, visibleCounties],
  );

  // Every figure on this page is reported for the counties in scope. Ranking
  // the whole state under a header that reads "Scoped to Lowndes County" is
  // how a funder ends up quoting the wrong number.
  const scopedIdSet = useMemo(() => new Set(scopedCountyIds), [scopedCountyIds]);
  const sortedZones = useMemo(
    () =>
      counties.data
        .filter((zone) => scopedIdSet.has(zone.id))
        .sort((a, b) => a.foodAccessScore - b.foodAccessScore),
    [counties.data, scopedIdSet],
  );

  const isScoped = countyScope !== ALL_COUNTIES;
  const scopeLabel = isScoped ? `${countyScope} County` : `${sortedZones.length} assigned counties`;
  const criticalCount = sortedZones.filter(z => z.status === 'Critical').length;
  const atRiskCount = sortedZones.filter(z => z.status === 'At Risk').length;
  const avgDistance =
    sortedZones.length === 0
      ? '—'
      : (sortedZones.reduce((s, z) => s + z.nearestPantryMiles, 0) / sortedZones.length).toFixed(1);

  /**
   * How each mapped location was established, counted from the directory in
   * scope. These were four hardcoded numbers that never moved — and
   * verification level is exactly the claim a hospital or health plan asks an
   * agency to stand behind.
   */
  const pinIntegrity = useMemo(() => {
    let level3 = 0;
    let level2 = 0;
    let level1 = 0;
    for (const pantry of scopedPantries) {
      const level = verificationLevelFor(pantry);
      if (level === 3) level3 += 1;
      else if (level === 2) level2 += 1;
      else level1 += 1;
    }
    const total = scopedPantries.length;
    return {
      level3,
      level2,
      level1,
      confirmedShare: total === 0 ? 0 : Math.round((level3 / total) * 1000) / 10,
    };
  }, [scopedPantries]);

  /**
   * The accordion renders one full-width expandable card per county. Scoped to
   * an agency that is fine, but a statewide user unscoped is 67 of them — about
   * nine screens of scrolling, directly beneath a chart that already ranks the
   * worst twenty. Show the worst twelve and let the reader ask for the rest.
   */
  const ZONE_CEILING = 12;
  const visibleZones = showAllZones ? sortedZones : sortedZones.slice(0, ZONE_CEILING);

  const handleLockedCounty = (county: AlabamaCountyData) => {
    setToastMessage(
      `${county.name} is outside your agency's coverage. Opening plan and coverage options.`,
    );
    setTimeout(() => setToastMessage(null), 3500);
    navigate('/billing');
  };

  const handleExportCSV = () => {
    exportToCSV(`Alabama_Food_Desert_Assessment_${isScoped ? countyScope : 'AllAssignedCounties'}`, sortedZones, [
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

  /**
   * Write a real alert through the same store Settings uses.
   *
   * This button previously announced "Notification sent to Agency Director"
   * and wrote nothing, while Settings had a persisting implementation a few
   * files away. One alert system, and it is the one that saves.
   */
  const handleCreateAlert = async (zone: AlabamaCountyData) => {
    if (!user) return;
    await saveThresholdAlert({
      id: `alt_${zone.id}_${Date.now()}`,
      orgId: user.orgId,
      metric: 'Food Access Score',
      countyOrPantry: zone.name,
      condition: 'less_than',
      thresholdValue: 25,
      notifyEmail: user.email,
      isTriggered: zone.foodAccessScore < 25,
    });
    setToastMessage(
      `Alert saved: notify ${user.email} when ${zone.name} falls below a food access score of 25. Manage it in Settings.`,
    );
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleSelectCountyFromMap = (county: AlabamaCountyData) => {
    setSelectedCounty(county);
    setExpandedZone(county.id);
  };

  /**
   * Selecting a county on the map used to expand a card lower down the page,
   * and that was the end of it — seeing everything for that county meant
   * finding the header dropdown and choosing the same county again by name.
   * The map is the entry point to this product; it should be able to drive it.
   */
  const handleScopeToCounty = (county: AlabamaCountyData) => {
    setCountyScope(county.name.replace(/\s+County$/, ''));
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="card-glass fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 animate-fade-in-up">
          <Bell className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-[13px] text-white">{toastMessage}</p>
        </div>
      )}

      {/* Top Title Banner */}
      <div className={`card-accent card ${accent.text} p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3.5 min-w-0">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${accent.border} ${accent.bg}`}>
            <MapIcon className={`h-5 w-5 ${accent.text}`} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold tracking-tight text-white">Alabama Food Desert Vulnerability Index</h2>
            <p className="mt-0.5 text-[12px] text-slate-300">
              67-county vector heatmap and GIS pantry pins, derived from USDA and Census access metrics.
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
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold text-[#0b0d14] transition-colors cursor-pointer ${accent.solid} ${accent.solidHover}`}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Pin integrity — counted from the pantry directory in scope, not typed */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-slate-400">Location pin integrity</span>
          <span className="flex flex-wrap items-center gap-1.5">
            <VerificationBadge level={3} />
            <span className="font-mono text-[11px] text-slate-400">{pinIntegrity.level3}</span>
            <VerificationBadge level={2} />
            <span className="font-mono text-[11px] text-slate-400">{pinIntegrity.level2}</span>
            <VerificationBadge level={1} />
            <span className="font-mono text-[11px] text-slate-400">{pinIntegrity.level1}</span>
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          <span className="font-mono text-slate-300">{pinIntegrity.confirmedShare}%</span> of{' '}
          {scopeLabel} locations field-verified
        </span>
      </div>

      {/* Alert Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card card-hover p-5 metric-glow-rose">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">{criticalCount}</p>
              <p className="text-[12px] text-slate-400">
                Critical Zones (&lt; 25 Access Score) · {scopeLabel}
              </p>
            </div>
          </div>
        </div>
        <div className="card card-hover p-5 metric-glow-amber">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">{atRiskCount}</p>
              <p className="text-[12px] text-slate-400">At-Risk Counties · {scopeLabel}</p>
            </div>
          </div>
        </div>
        <div className="card card-hover p-5 metric-glow-blue">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">{avgDistance} mi</p>
              <p className="text-[12px] text-slate-400">Avg Pantry Distance · {scopeLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Feature: Interactive Map Display (Choropleth OR GIS View) */}
      <ChartCard
        title={mapMode === 'choropleth' ? 'Interactive Alabama County Heatmap' : 'GIS Pantry Coordinate Locations'}
        subtitle={
          mapMode === 'choropleth'
            ? `Albers equal-area projection · ${scopeLabel} in colour, counties outside your coverage in grey · select a county to expand its detail below`
            : 'Pantry coordinates projected onto the same county geometry · Marker area shows families served'
        }
      >
        <DataStateBoundary
          status={mapMode === 'choropleth' ? counties.status : pantryState.status}
          error={mapMode === 'choropleth' ? counties.error : pantryState.error}
          source={counties.source}
          skeletonRows={4}
        >
          {mapMode === 'choropleth' ? (
            <AlabamaHeatMap
              counties={counties.data}
              selectedCountyId={selectedCounty?.id}
              onSelectCounty={handleSelectCountyFromMap}
              unlockedCountyIds={unlockedCountyIds}
              scopedCountyIds={scopedCountyIds}
              onLockedCountyClick={handleLockedCounty}
            />
          ) : (
            <AlabamaGisMap
              pantries={scopedPantries}
              visibleCounties={visibleCounties}
              selectedPantryId={selectedPantry?.id}
              onSelectPantry={setSelectedPantry}
            />
          )}
        </DataStateBoundary>
      </ChartCard>

      {/* Selected county — the bridge from the map to the rest of the dashboard */}
      {selectedCounty && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: scoreBarColors(selectedCounty.foodAccessScore) }}
              aria-hidden="true"
            />
            <p className="text-[13px] text-slate-300">
              <span className="font-semibold text-white">{selectedCounty.name}</span> selected ·{' '}
              <span className="font-mono">{selectedCounty.foodAccessScore}/100</span> ·{' '}
              {selectedCounty.status}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {countyScope === selectedCounty.name.replace(/\s+County$/, '') ? (
              <button
                type="button"
                onClick={() => setCountyScope(ALL_COUNTIES)}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-[12px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white cursor-pointer"
              >
                Clear county scope
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleScopeToCounty(selectedCounty)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-[12px] font-bold text-[#04140d] transition-colors hover:bg-emerald-400 cursor-pointer"
              >
                <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
                Scope dashboard to {selectedCounty.name.replace(/\s+County$/, '')}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedCounty(null);
                setExpandedZone(null);
              }}
              className="rounded-xl px-3 py-2 text-[12px] font-medium text-slate-400 transition-colors hover:text-white cursor-pointer"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Food Access Score Ranking Chart */}
      <ChartCard
        title="Food Access Score by County (Lowest to Highest)"
        subtitle={`Lower scores indicate severe food desert vulnerability · ${scopeLabel}`}
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
        subtitle={
          selectedCounty
            ? `Selected: ${selectedCounty.name}`
            : `Showing ${visibleZones.length} of ${sortedZones.length} ${sortedZones.length === 1 ? 'county' : 'counties'} in scope, most vulnerable first · click any lit county in the heatmap`
        }
      >
        <div className="space-y-2">
          {sortedZones.length === 0 && (
            <p className="flex items-center justify-center gap-2 py-8 text-center text-[13px] text-slate-400">
              <Lock className="h-4 w-4 shrink-0 text-amber-400/80" aria-hidden="true" />
              No county census data for {scopeLabel}. Widen the county scope in the header.
            </p>
          )}
          {visibleZones.map((zone) => {
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
                        onClick={() => void handleCreateAlert(zone)}
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

          {sortedZones.length > ZONE_CEILING && (
            <button
              type="button"
              onClick={() => setShowAllZones((current) => !current)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-[12px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.06] hover:text-white cursor-pointer"
            >
              {showAllZones
                ? `Show only the ${ZONE_CEILING} most vulnerable`
                : `Show all ${sortedZones.length} counties in scope`}
            </button>
          )}
        </div>
      </ChartCard>
    </div>
  );
};
