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
import { mockFoodDesertZones, mockPantryMetrics } from '../../data/mockData';
import { buildModuleExport } from '../../utils/moduleExports';
import { exportToCSV } from '../../utils/csvExport';
import { useAuth } from '../../hooks/useAuth';

const HEDIS_TARGET = 75;

export const SdohModulePage: React.FC = () => {
  const { user } = useAuth();
  const [tier, setTier] = useState<'all' | 'Critical' | 'At Risk'>('all');

  const zipRows = useMemo(() => {
    const rows = mockFoodDesertZones
      .filter((zone) => tier === 'all' || zone.status === tier)
      .flatMap((zone) =>
        zone.zipCodes.map((zip) => ({
          zip,
          county: zone.county,
          score: zone.foodAccessScore,
          status: zone.status,
          poverty: `${zone.percentBelowPoverty}%`,
          distance: `${zone.nearestPantryMiles} mi`,
          endpoints: mockPantryMetrics.filter((p) => p.county === zone.county).length,
        })),
      );
    return rows.sort((a, b) => a.score - b.score);
  }, [tier]);

  const screeningRate = Math.min(97, 62 + mockPantryMetrics.length * 1.6);
  const referrals = mockPantryMetrics.length * 148;

  const handleExport = () => {
    const bundle = buildModuleExport('sdoh', {
      pantries: mockPantryMetrics,
      zones: mockFoodDesertZones,
      countyScope: 'all',
      periodLabel: 'current period',
      agencyName: user?.organization ?? 'Health plan',
      containsModelledFigures: true,
    });
    exportToCSV(bundle.filename, bundle.rows);
  };

  return (
    <ModuleShell moduleId="sdoh" onExport={handleExport}>
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
