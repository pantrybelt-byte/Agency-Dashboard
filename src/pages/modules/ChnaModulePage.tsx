/**
 * IRS CHNA Hospital Compliance module.
 *
 * A non-profit hospital must document community need and its response to it
 * every three years under Form 501(r). The controls here mirror that filing:
 * a service radius to define "community", a multi-year trend to show the need
 * is real, and an investment log that ties dollars to it.
 */
import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { MapPinned, CalendarRange, HandCoins } from 'lucide-react';
import { ChartCard } from '../../components/ui/ChartCard';
import { MetricCard } from '../../components/ui/MetricCard';
import { DataTable } from '../../components/ui/DataTable';
import { ModuleShell, SampleNotice } from './ModuleShell';
import { useModuleData } from './useModuleData';
import { buildModuleExport } from '../../utils/moduleExports';
import { exportBundleToCSV } from '../../utils/csvExport';

const RADII = [10, 25, 50] as const;

/** Rough miles-per-degree at Alabama's latitude; adequate for a service radius. */
const MILES_PER_DEGREE = 69;

/** Baptist Health Montgomery, the anchor for the demo service area. */
const ANCHOR = { lat: 32.3792, lng: -86.3077 };

const plainCounty = (name: string) => name.replace(/\s+County$/, '');

export const ChnaModulePage: React.FC = () => {
  const { pantries, counties, scopeLabel, periodLabel, status, error, exportContext } = useModuleData();
  const [radius, setRadius] = useState<(typeof RADII)[number]>(25);

  // The radius narrows *within* the counties already in scope. It cannot reach
  // a pantry the agency is not assigned, which is the difference between a
  // module control and a permissions boundary.
  const inRadius = useMemo(
    () =>
      pantries.filter((pantry) => {
        const dLat = (pantry.coordinates.lat - ANCHOR.lat) * MILES_PER_DEGREE;
        const dLng =
          (pantry.coordinates.lng - ANCHOR.lng) *
          MILES_PER_DEGREE *
          Math.cos((ANCHOR.lat * Math.PI) / 180);
        return Math.hypot(dLat, dLng) <= radius;
      }),
    [pantries, radius],
  );

  const countiesInRadius = useMemo(() => {
    const names = new Set(inRadius.map((pantry) => pantry.county));
    return counties.filter((county) => names.has(plainCounty(county.name)));
  }, [counties, inRadius]);

  const populationAssessed = countiesInRadius.reduce((sum, c) => sum + c.population, 0);
  const familiesReached = inRadius.reduce((sum, p) => sum + p.familiesServed, 0);
  const investment = inRadius.reduce((sum, p) => sum + p.totalItemsDistributed, 0) * 2.15;

  // Three-year need trend. Modelled backwards from the current score.
  const trend = useMemo(() => {
    const current =
      countiesInRadius.length === 0
        ? 0
        : countiesInRadius.reduce((sum, c) => sum + c.foodAccessScore, 0) / countiesInRadius.length;
    const thisYear = new Date().getFullYear();
    return [thisYear - 2, thisYear - 1, thisYear].map((year, index) => ({
      year: String(year),
      score: Number((current - (2 - index) * 3.4).toFixed(1)),
    }));
  }, [countiesInRadius]);

  const handleExport = () => {
    const bundle = buildModuleExport(
      'chna',
      exportContext({
        pantries: inRadius,
        counties: countiesInRadius,
        scopeSuffix: `${radius}mi`,
        periodLabel: '3-year assessment window',
        containsModelledFigures: true,
      }),
    );
    exportBundleToCSV(bundle);
  };

  return (
    <ModuleShell
      moduleId="chna"
      onExport={handleExport}
      scopeLabel={`${scopeLabel} · ${radius}-mile service radius`}
      periodLabel={periodLabel}
      status={status}
      error={error}
    >
      <div className="space-y-5">
        <SampleNotice what="The community investment figure and the three-year trend" />

        {/* Service radius selector — defines "community" for the filing */}
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[13px] font-semibold text-white">Hospital service radius</p>
            <p className="text-[11px] text-slate-400">
              Defines the community assessed in this filing
            </p>
          </div>
          <div
            className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1"
            role="group"
            aria-label="Service radius"
          >
            {RADII.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRadius(option)}
                aria-pressed={radius === option}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
                  radius === option
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {option} miles
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Population Assessed"
            value={populationAssessed}
            icon={<MapPinned className="h-5 w-5 text-violet-400" aria-hidden="true" />}
            glowClass="metric-glow-indigo"
          />
          <MetricCard
            label="Families Reached"
            value={familiesReached}
            icon={<CalendarRange className="h-5 w-5 text-emerald-400" aria-hidden="true" />}
            glowClass="metric-glow-emerald"
          />
          <MetricCard
            label="Community Investment Logged"
            value={`$${investment.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            icon={<HandCoins className="h-5 w-5 text-amber-400" aria-hidden="true" />}
            glowClass="metric-glow-amber"
            mono
            illustrative
          />
        </div>

        <ChartCard
          title="Three-year food security trend"
          subtitle={`Mean food access score within ${radius} miles · higher is better`}
          dataTable={{
            columns: ['Year', 'Mean food access score'],
            rows: trend.map((point) => [point.year, point.score]),
          }}
        >
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="chnaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161926',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Access score"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  fill="url(#chnaGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Form 501(r) community investment log"
          subtitle={`${inRadius.length} documented response sites within ${radius} miles`}
        >
          <DataTable
            caption="Community investment log for Form 501(r) Schedule H"
            pageSize={8}
            rowKey={(row) => row.id}
            data={inRadius}
            columns={[
              { key: 'name', label: 'Response site', sortable: true },
              { key: 'county', label: 'Community', sortable: true },
              {
                key: 'familiesServed',
                label: 'Families reached',
                align: 'right',
                sortable: true,
                render: (row) => (
                  <span className="font-mono tabular-nums">
                    {row.familiesServed.toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'totalItemsDistributed',
                label: 'Items distributed',
                align: 'right',
                sortable: true,
                render: (row) => (
                  <span className="font-mono tabular-nums">
                    {row.totalItemsDistributed.toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'investment',
                label: 'Attributed value',
                align: 'right',
                sortValue: (row) => row.totalItemsDistributed,
                render: (row) => (
                  <span className="font-mono tabular-nums text-amber-300">
                    ${Math.round(row.totalItemsDistributed * 2.15).toLocaleString()}
                  </span>
                ),
              },
            ]}
          />
        </ChartCard>
      </div>
    </ModuleShell>
  );
};
