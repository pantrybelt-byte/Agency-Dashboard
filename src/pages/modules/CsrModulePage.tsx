/**
 * Corporate CSR Sponsor module.
 *
 * A foundation programme officer reports upward to a giving committee, so the
 * page is built to be shown rather than queried: a headline reach figure, the
 * counties their money touched, and a co-branded header that survives the
 * print route onto a board handout.
 */
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Users, MapPinned, Building2, ImagePlus } from 'lucide-react';
import { ChartCard } from '../../components/ui/ChartCard';
import { MetricCard } from '../../components/ui/MetricCard';
import { ModuleShell, SampleNotice } from './ModuleShell';
import { useModuleData } from './useModuleData';
import { buildModuleExport } from '../../utils/moduleExports';
import { exportBundleToCSV } from '../../utils/csvExport';
import { useAuth } from '../../hooks/useAuth';

const SPONSORS = ['Alabama Power Foundation', 'Regions Bank Foundation', 'Publix Charities'];

/** Annual sponsorship, against which reach is costed. Modelled, and marked so. */
const SPONSORSHIP_USD = 42_000;

export const CsrModulePage: React.FC = () => {
  const { user } = useAuth();
  const { pantries, totals, scopeLabel, periodLabel, status, error, exportContext } = useModuleData();
  const [sponsor, setSponsor] = useState(SPONSORS[0]);

  const byCounty = useMemo(() => {
    const map = new Map<string, { county: string; families: number; sites: number; growth: number }>();
    for (const pantry of pantries) {
      const current = map.get(pantry.county) ?? {
        county: pantry.county,
        families: 0,
        sites: 0,
        growth: 0,
      };
      current.families += pantry.familiesServed;
      current.sites += 1;
      current.growth += pantry.growthRate;
      map.set(pantry.county, current);
    }
    return [...map.values()]
      .map((entry) => ({ ...entry, growth: Number((entry.growth / entry.sites).toFixed(1)) }))
      .sort((a, b) => b.families - a.families);
  }, [pantries]);

  const totalFamilies = byCounty.reduce((sum, c) => sum + c.families, 0);
  const costPerFamily = SPONSORSHIP_USD / Math.max(1, totalFamilies);

  const handleExport = () => {
    const bundle = buildModuleExport(
      'csr',
      exportContext({ agencyName: sponsor, containsModelledFigures: true }),
    );
    exportBundleToCSV(bundle);
  };

  return (
    <ModuleShell
      moduleId="csr"
      onExport={handleExport}
      scopeLabel={scopeLabel}
      periodLabel={periodLabel}
      status={status}
      error={error}
    >
      <div className="space-y-5">
        {/* Co-branded header — the artifact the sponsor is actually buying */}
        <section className="card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-white/[0.08] bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] text-slate-500">
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Sponsor logo placeholder</span>
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-slate-400">Powered by</p>
                <p className="text-lg font-bold tracking-tight text-white">{sponsor}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  In partnership with {user?.organization ?? 'AccessBelt'}
                </p>
              </div>
            </div>

            <div className="no-print">
              <label htmlFor="sponsor-select" className="sr-only">
                Sponsor
              </label>
              <select
                id="sponsor-select"
                value={sponsor}
                onChange={(event) => setSponsor(event.target.value)}
                className="px-3 py-2 text-[12px]"
              >
                {SPONSORS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 divide-y divide-white/[0.08] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="p-5 text-center">
              <p className="font-mono text-3xl font-bold tabular-nums text-amber-400">
                {totalFamilies.toLocaleString()}
              </p>
              <p className="mt-1 text-[12px] text-slate-400">Families reached</p>
            </div>
            <div className="p-5 text-center">
              <p className="font-mono text-3xl font-bold tabular-nums text-white">
                {byCounty.length}
              </p>
              <p className="mt-1 text-[12px] text-slate-400">Counties sponsored</p>
            </div>
            <div className="p-5 text-center">
              <p className="font-mono text-3xl font-bold tabular-nums text-white">
                ${costPerFamily.toFixed(2)}
              </p>
              <p className="mt-1 text-[12px] text-slate-400">Cost per family reached</p>
            </div>
          </div>
        </section>

        <SampleNotice what="Cost per family, which assumes a fixed $42,000 sponsorship" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Total Families Reached"
            value={totalFamilies}
            icon={<Users className="h-5 w-5 text-amber-400" aria-hidden="true" />}
            glowClass="metric-glow-amber"
          />
          <MetricCard
            label="Sponsored Counties"
            value={byCounty.length}
            icon={<MapPinned className="h-5 w-5 text-emerald-400" aria-hidden="true" />}
            glowClass="metric-glow-emerald"
          />
          <MetricCard
            label="Distribution Sites"
            value={pantries.length}
            trend={totals.familiesTrend}
            trendLabel="families vs previous period"
            icon={<Building2 className="h-5 w-5 text-violet-400" aria-hidden="true" />}
            glowClass="metric-glow-indigo"
          />
        </div>

        <ChartCard
          title="Sponsored county growth"
          subtitle="Year-over-year change in families reached, by county"
          dataTable={{
            columns: ['County', 'Families reached', 'Growth %'],
            rows: byCounty.map((c) => [c.county, c.families, c.growth]),
          }}
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCounty} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="county"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{
                    backgroundColor: '#161926',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="families" name="Families reached" radius={[6, 6, 0, 0]}>
                  {byCounty.map((entry) => (
                    <Cell key={entry.county} fill={entry.growth >= 0 ? '#f59e0b' : '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </ModuleShell>
  );
};
