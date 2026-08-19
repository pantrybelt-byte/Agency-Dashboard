/**
 * Disaster & Emergency Logistics module.
 *
 * Written for someone working an active incident, which changes the design
 * rules: status before analysis, coordinates in monospace so they can be read
 * aloud over radio, and no colour-only states — an operations centre projector
 * washes hue out, so every status carries a word.
 */
import React, { useMemo, useState } from 'react';
import { Radio, PackageX, Siren, MapPin } from 'lucide-react';
import { ChartCard } from '../../components/ui/ChartCard';
import { MetricCard } from '../../components/ui/MetricCard';
import { DataTable } from '../../components/ui/DataTable';
import { ModuleShell, SampleNotice } from './ModuleShell';
import { useModuleData } from './useModuleData';
import { buildModuleExport } from '../../utils/moduleExports';
import { exportBundleToCSV } from '../../utils/csvExport';

type PodStatus = 'Operational' | 'Limited' | 'Offline';

function podStatus(isActive: boolean, visits: number): PodStatus {
  if (!isActive) return 'Offline';
  return visits < 60 ? 'Limited' : 'Operational';
}

const STATUS_STYLES: Record<PodStatus, string> = {
  Operational: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  Limited: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Offline: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

const plainCounty = (name: string) => name.replace(/\s+County$/, '');

export const DisasterModulePage: React.FC = () => {
  const { pantries, counties, scopeLabel, periodLabel, status: dataStatus, error, exportContext } =
    useModuleData();
  const [filter, setFilter] = useState<'all' | PodStatus>('all');

  const pods = useMemo(
    () =>
      pantries.map((pantry) => ({
        ...pantry,
        status: podStatus(pantry.isActive, pantry.avgDailyVisits),
      })),
    [pantries],
  );

  const visible = useMemo(
    () => pods.filter((pod) => filter === 'all' || pod.status === filter),
    [pods, filter],
  );

  const operational = pods.filter((p) => p.status === 'Operational').length;
  const offline = pods.filter((p) => p.status === 'Offline').length;
  const limited = pods.filter((p) => p.status === 'Limited').length;

  // Red zones: counties whose only sites are offline or limited.
  const redZones = useMemo(() => {
    const operationalByCounty = new Map<string, { total: number; operational: number }>();
    for (const pod of pods) {
      const entry = operationalByCounty.get(pod.county) ?? { total: 0, operational: 0 };
      entry.total += 1;
      if (pod.status === 'Operational') entry.operational += 1;
      operationalByCounty.set(pod.county, entry);
    }
    return counties.filter((county) => {
      const entry = operationalByCounty.get(plainCounty(county.name));
      return entry !== undefined && entry.total > 0 && entry.operational === 0;
    });
  }, [pods, counties]);

  const sosStream = useMemo(
    () =>
      pods
        .filter((p) => p.status !== 'Operational')
        .slice(0, 5)
        .map((pod, index) => ({
          id: pod.id,
          site: pod.name,
          county: pod.county,
          need: ['Water pallets', 'Ready-to-eat meals', 'Infant formula', 'Generator fuel', 'Ice'][index % 5],
          raised: `${(index + 1) * 12} min ago`,
          priority: pod.status === 'Offline' ? 'Critical' : 'Elevated',
        })),
    [pods],
  );

  const handleExport = () => {
    const bundle = buildModuleExport(
      'disaster',
      exportContext({
        pantries: visible,
        scopeSuffix: filter === 'all' ? 'AllPODs' : filter,
        containsModelledFigures: true,
      }),
    );
    exportBundleToCSV(bundle);
  };

  return (
    <ModuleShell
      moduleId="disaster"
      onExport={handleExport}
      scopeLabel={scopeLabel}
      periodLabel={periodLabel}
      status={dataStatus}
      error={error}
    >
      <div className="space-y-5">
        <SampleNotice what="The SOS request stream and POD status, which are derived from pantry activity rather than a live incident feed" />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="PODs Operational"
            value={`${operational} / ${pods.length}`}
            icon={<Radio className="h-5 w-5 text-emerald-400" aria-hidden="true" />}
            glowClass="metric-glow-emerald"
          />
          <MetricCard
            label="Limited Capacity"
            value={limited}
            icon={<PackageX className="h-5 w-5 text-amber-400" aria-hidden="true" />}
            glowClass="metric-glow-amber"
          />
          <MetricCard
            label="Offline Sites"
            value={offline}
            icon={<PackageX className="h-5 w-5 text-rose-400" aria-hidden="true" />}
            glowClass="metric-glow-rose"
          />
          <MetricCard
            label="Stockout Red Zones"
            value={redZones.length}
            icon={<Siren className="h-5 w-5 text-rose-400" aria-hidden="true" />}
            glowClass="metric-glow-rose"
          />
        </div>

        {redZones.length > 0 && (
          <section
            aria-labelledby="red-zones-heading"
            className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-5"
          >
            <h2 id="red-zones-heading" className="flex items-center gap-2 text-[14px] font-bold text-white">
              <Siren className="h-4 w-4 text-rose-400" aria-hidden="true" />
              Crisis stockout red zones
            </h2>
            <p className="mt-1 text-[12px] text-slate-300">
              Counties where every distribution point is offline or limited. Prioritise resupply
              routing here.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {redZones.map((zone) => (
                <li
                  key={zone.id}
                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[12px] font-semibold text-rose-200"
                >
                  {zone.name}
                  <span className="ml-2 font-mono text-[11px] text-rose-300/80">
                    pop {zone.population.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ChartCard
          title="Emergency supply SOS stream"
          subtitle="Open requests from sites not at full capacity"
        >
          <ul className="divide-y divide-white/[0.06]">
            {sosStream.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-white">{item.need}</p>
                  <p className="text-[11px] text-slate-400">
                    {item.site} · {item.county} County
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[11px] text-slate-400">{item.raised}</span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      item.priority === 'Critical'
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>
              </li>
            ))}
            {sosStream.length === 0 && (
              <li className="py-6 text-center text-[12px] text-slate-400">
                No open supply requests. All distribution points reporting full capacity.
              </li>
            )}
          </ul>
        </ChartCard>

        <ChartCard
          title="Points of distribution"
          subtitle="Live site status with dispatch coordinates"
          action={
            <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1">
              {(['all', 'Operational', 'Limited', 'Offline'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  aria-pressed={filter === option}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    filter === option ? 'bg-rose-500/20 text-rose-200' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {option === 'all' ? 'All' : option}
                </button>
              ))}
            </div>
          }
        >
          <DataTable
            caption="Points of distribution with status and dispatch coordinates"
            pageSize={8}
            rowKey={(row) => row.id}
            data={visible}
            emptyMessage="No sites match this status filter."
            columns={[
              { key: 'name', label: 'Site', sortable: true },
              { key: 'county', label: 'County', sortable: true },
              {
                key: 'status',
                label: 'POD status',
                sortable: true,
                render: (row) => (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[row.status]}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                    {row.status}
                  </span>
                ),
              },
              {
                key: 'coordinates',
                label: 'Coordinates',
                srLabel: 'Latitude and longitude',
                render: (row) => (
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                    <MapPin className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
                    {row.coordinates.lat.toFixed(4)}, {row.coordinates.lng.toFixed(4)}
                  </span>
                ),
              },
              {
                key: 'avgDailyVisits',
                label: 'Daily throughput',
                align: 'right',
                sortable: true,
                render: (row) => (
                  <span className="font-mono tabular-nums">{row.avgDailyVisits}</span>
                ),
              },
            ]}
          />
        </ChartCard>
      </div>
    </ModuleShell>
  );
};
