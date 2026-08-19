/**
 * SDOH Health & Medicaid Audit module.
 *
 * Built around what a payer's compliance analyst is accountable for: which
 * member ZIPs sit in a food-access gap, whether social needs screening is
 * being documented at the HEDIS threshold, and whether referrals actually
 * closed the loop rather than disappearing into a PDF directory.
 */
import React, { useMemo, useState } from 'react';
import { ShieldCheck, Repeat, HeartPulse } from 'lucide-react';
import { ChartCard } from '../../components/ui/ChartCard';
import { MetricCard } from '../../components/ui/MetricCard';
import { DataTable } from '../../components/ui/DataTable';
import { ModuleShell, SampleNotice } from './ModuleShell';
import { useModuleData } from './useModuleData';
import { buildModuleExport } from '../../utils/moduleExports';
import { exportBundleToCSV } from '../../utils/csvExport';

const HEDIS_TARGET = 75;

/** "Lowndes County" as the pantry directory spells it: "Lowndes". */
const plainCounty = (name: string) => name.replace(/\s+County$/, '');

export const SdohModulePage: React.FC = () => {
  const { pantries, counties, totals, scopeLabel, periodLabel, agencyName, status, error, exportContext } =
    useModuleData();
  const [tier, setTier] = useState<'all' | 'Critical' | 'At Risk'>('all');

  const tieredCounties = useMemo(
    () => counties.filter((county) => tier === 'all' || county.status === tier),
    [counties, tier],
  );

  const zipRows = useMemo(() => {
    // Index the referral endpoints once rather than rescanning per ZIP row.
    const endpointsByCounty = new Map<string, number>();
    for (const pantry of pantries) {
      endpointsByCounty.set(pantry.county, (endpointsByCounty.get(pantry.county) ?? 0) + 1);
    }

    return tieredCounties
      .flatMap((county) =>
        county.zipCodes.map((zip) => ({
          zip,
          county: plainCounty(county.name),
          score: county.foodAccessScore,
          status: county.status,
          poverty: `${county.povertyRate}%`,
          distance: `${county.nearestPantryMiles} mi`,
          endpoints: endpointsByCounty.get(plainCounty(county.name)) ?? 0,
        })),
      )
      .sort((a, b) => a.score - b.score);
  }, [tieredCounties, pantries]);

  // Modelled, and marked as such: there is no screening-documentation feed yet.
  // Tying it to measured volume at least keeps it consistent with the scope and
  // period on screen instead of being a constant that never moves.
  const screeningRate = Math.min(97, 62 + pantries.length * 1.6);
  const referrals = Math.round(totals.familiesServed * 0.42);

  const handleExport = () => {
    const bundle = buildModuleExport(
      'sdoh',
      exportContext({
        counties: tieredCounties,
        scopeSuffix: tier === 'all' ? undefined : tier.replace(/\s+/g, ''),
        agencyName,
        containsModelledFigures: true,
      }),
    );
    exportBundleToCSV(bundle);
  };

  return (
    <ModuleShell
      moduleId="sdoh"
      onExport={handleExport}
      scopeLabel={scopeLabel}
      periodLabel={periodLabel}
      status={status}
      error={error}
    >
      <div className="space-y-5">
        <SampleNotice what="HEDIS screening compliance and closed-loop referral volume" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="HEDIS Screening Compliance"
            value={`${Math.round(screeningRate)}%`}
            icon={<ShieldCheck className="h-5 w-5 text-sky-400" aria-hidden="true" />}
            glowClass="metric-glow-blue"
            illustrative
          />
          <MetricCard
            label="Closed-Loop Referrals"
            value={referrals}
            trend={totals.familiesTrend}
            trendLabel="vs previous period"
            icon={<Repeat className="h-5 w-5 text-emerald-400" aria-hidden="true" />}
            glowClass="metric-glow-emerald"
            illustrative
          />
          <MetricCard
            label="Member ZIPs in Access Gap"
            value={zipRows.filter((r) => r.score < 40).length}
            icon={<HeartPulse className="h-5 w-5 text-rose-400" aria-hidden="true" />}
            glowClass="metric-glow-rose"
          />
        </div>

        <ChartCard
          title="CMS HEDIS social needs screening"
          subtitle={`Measured against the ${HEDIS_TARGET}% documentation threshold`}
        >
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="font-mono text-3xl font-bold tabular-nums text-white">
                {Math.round(screeningRate)}%
              </span>
              <span className="text-[12px] text-slate-400">
                Threshold <span className="font-mono text-slate-300">{HEDIS_TARGET}%</span>
              </span>
            </div>
            <div
              className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
              role="progressbar"
              aria-valuenow={Math.round(screeningRate)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="HEDIS screening compliance"
            >
              <div
                className={`h-full rounded-full ${screeningRate >= HEDIS_TARGET ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${screeningRate}%` }}
              />
              <span
                className="absolute inset-y-0 w-px bg-white/50"
                style={{ left: `${HEDIS_TARGET}%` }}
                aria-hidden="true"
              />
            </div>
            <p className="text-[12px] text-slate-400">
              {screeningRate >= HEDIS_TARGET
                ? 'Above the documentation threshold for this measurement year.'
                : 'Below threshold — screening documentation gap in the highlighted ZIPs below.'}
            </p>
          </div>
        </ChartCard>

        <ChartCard
          title="Member ZIP vulnerability overlay"
          subtitle="Ranked by food access score, worst first"
          action={
            <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1">
              {(['all', 'Critical', 'At Risk'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTier(option)}
                  aria-pressed={tier === option}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    tier === option ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {option === 'all' ? 'All tiers' : option}
                </button>
              ))}
            </div>
          }
        >
          <DataTable
            caption="Member ZIP codes ranked by food access score"
            pageSize={8}
            rowKey={(row) => row.zip}
            data={zipRows}
            columns={[
              {
                key: 'zip',
                label: 'ZIP',
                sortable: true,
                render: (row) => <span className="font-mono text-white">{row.zip}</span>,
              },
              { key: 'county', label: 'County', sortable: true },
              {
                key: 'score',
                label: 'Access score',
                align: 'right',
                sortable: true,
                render: (row) => <span className="font-mono tabular-nums">{row.score}</span>,
              },
              {
                key: 'status',
                label: 'Vulnerability',
                sortable: true,
                render: (row) => (
                  <span
                    className={
                      row.status === 'Critical'
                        ? 'text-rose-300'
                        : row.status === 'At Risk'
                          ? 'text-amber-300'
                          : 'text-slate-300'
                    }
                  >
                    {row.status}
                  </span>
                ),
              },
              {
                key: 'poverty',
                label: 'Below poverty',
                align: 'right',
                render: (row) => <span className="font-mono tabular-nums">{row.poverty}</span>,
              },
              {
                key: 'distance',
                label: 'Nearest resource',
                align: 'right',
                render: (row) => <span className="font-mono tabular-nums">{row.distance}</span>,
              },
              { key: 'endpoints', label: 'Referral endpoints', align: 'right' },
            ]}
          />
        </ChartCard>
      </div>
    </ModuleShell>
  );
};
