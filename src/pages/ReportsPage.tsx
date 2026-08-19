import React, { useMemo, useState } from 'react';
import {
  FileBarChart2, Download, Printer, CheckCircle, Calendar,
  BarChart3, MapPin, Store, Package, FileText, Sliders, Mail, Plus, Trash2, Inbox
} from 'lucide-react';
import { ChartCard } from '../components/ui/ChartCard';
import { ScheduleReportModal } from '../components/ui/ScheduleReportModal';
import { DataStateBoundary } from '../components/ui/DataStateBoundary';
import { useAuth } from '../hooks/useAuth';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { useLiveData } from '../hooks/useLiveData';
import {
  deleteScheduledReport,
  saveScheduledReport,
  subscribeCountyMetrics,
  subscribeScheduledReports,
} from '../services/dashboardData';
import {
  combineStatus,
  useCountyRollups,
  useItemCatalogue,
  usePantryDirectory,
  usePantryRollups,
} from '../hooks/useDashboardData';
import { pantryMetricsFor, requestedItemsFor } from '../utils/analytics';
import { buildModuleExport, type ExportBundle } from '../utils/moduleExports';
import type { ScheduledReport } from '../types';
import { describeSchedule } from '../utils/reportSchedule';
import { ALL_COUNTIES, countyIdsForNames, resolveVisibleCounties } from '../utils/scoping';
import { mockReportTemplates } from '../data/mockData';
import { exportBundleToCSV } from '../utils/csvExport';

const iconMap: Record<string, React.ReactNode> = {
  'bar-chart': <BarChart3 className="w-5 h-5 text-emerald-400" />,
  'map-pin': <MapPin className="w-5 h-5 text-indigo-400" />,
  'store': <Store className="w-5 h-5 text-amber-400" />,
  'package': <Package className="w-5 h-5 text-blue-400" />,
  'file-text': <FileText className="w-5 h-5 text-purple-400" />,
  'sliders': <Sliders className="w-5 h-5 text-teal-400" />,
};

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { countyScope, resolved } = useDashboardFilters();
  const { data: scheduledRules } = useLiveData(subscribeScheduledReports, [] as ScheduledReport[]);

  const countyRollups = useCountyRollups();
  const pantryRollups = usePantryRollups();
  const directory = usePantryDirectory();
  const catalogue = useItemCatalogue();
  const countyMetrics = useLiveData(subscribeCountyMetrics, []);
  const { status, error } = combineStatus(countyRollups, pantryRollups, directory, catalogue);

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generatedToast, setGeneratedToast] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  /**
   * Reports produced in this session.
   *
   * This replaces a hardcoded five-row history that described files nobody had
   * generated, with sizes and timestamps that were invented. A report list
   * should only ever contain reports that exist.
   */
  const [history, setHistory] = useState<
    { id: string; name: string; range: string; generatedAt: string; rows: number; bundle: ExportBundle }[]
  >([]);

  const handleSchedule = async (report: ScheduledReport) => {
    await saveScheduledReport(report);
  };

  const handleDeleteSchedule = async (report: ScheduledReport) => {
    await deleteScheduledReport(report.id);
  };

  const visibleCounties = useMemo(
    () => resolveVisibleCounties(user?.assignedCounties ?? [], countyScope),
    [user, countyScope],
  );

  const pantries = useMemo(
    () => pantryMetricsFor(directory.data, pantryRollups.data),
    [directory.data, pantryRollups.data],
  );

  const counties = useMemo(() => {
    const inScope = new Set(countyIdsForNames(countyMetrics.data, visibleCounties));
    return countyMetrics.data.filter((county) => inScope.has(county.id));
  }, [countyMetrics.data, visibleCounties]);

  const items = useMemo(
    () => requestedItemsFor(catalogue.data, countyRollups.data),
    [catalogue.data, countyRollups.data],
  );

  const scopeName = countyScope === ALL_COUNTIES ? 'AllAssigned' : countyScope;

  const provenance = (purpose: string) => [
    `AccessBelt export — ${purpose}`,
    `Agency: ${user?.organization ?? 'AccessBelt agency'}`,
    `Scope: ${countyScope === ALL_COUNTIES ? `${visibleCounties.length} assigned counties` : `${countyScope} County`} · Period: ${resolved.label}`,
    `Generated: ${new Date().toISOString()}`,
  ];

  /**
   * One builder per template.
   *
   * Every template used to hand back one of three fixed CSVs picked by id, so
   * six differently named buttons produced three files, none of which matched
   * the description above them.
   */
  const buildReport = (templateId: string): ExportBundle | null => {
    switch (templateId) {
      case 'rpt_02':
        return {
          filename: `Food_Desert_Assessment_${scopeName}`,
          rows: counties.map((county) => ({
            County: county.name,
            Region: county.region,
            Status: county.status,
            'Food Access Score': county.foodAccessScore,
            Population: county.population,
            'Poverty Rate (%)': county.povertyRate,
            'Median Income': county.medianIncome,
            'Nearest Pantry (mi)': county.nearestPantryMiles,
            'Active Pantries': county.activePantries,
            'Top Need': county.topRequestedItem,
          })),
          provenance: provenance('Food desert assessment (county census measures)'),
        };

      case 'rpt_03':
        return {
          filename: `Pantry_Performance_Scorecard_${scopeName}`,
          rows: pantries.map((pantry) => ({
            Pantry: pantry.name,
            County: pantry.county,
            Type: pantry.type,
            Status: pantry.isActive ? 'Active' : 'Inactive',
            Visits: pantry.totalVisits,
            'Items Distributed': pantry.totalItemsDistributed,
            'Families Served': pantry.familiesServed,
            'Avg Visits / Day': pantry.avgDailyVisits,
            'Change vs Previous Period (%)': pantry.growthRate,
          })),
          provenance: provenance('Pantry performance scorecard'),
        };

      case 'rpt_04':
        return {
          filename: `Item_Demand_Intelligence_${scopeName}`,
          rows: items.map((item) => ({
            Item: item.name,
            Category: item.category,
            Requests: item.requestCount,
            Direction: item.trend,
            'Change vs Previous Period (%)': item.trendPercentage,
            'Last Reported Day': item.lastRequested,
          })),
          provenance: provenance('Item demand and supply gap intelligence'),
        };

      case 'rpt_06': {
        const bundle = buildModuleExport('grant', {
          pantries,
          counties,
          countyScope: scopeName,
          periodLabel: resolved.label,
          agencyName: user?.organization ?? 'AccessBelt agency',
          containsModelledFigures: false,
        });
        return { ...bundle, filename: `Custom_Range_${scopeName}_${resolved.startDate}_to_${resolved.endDate}` };
      }

      // rpt_01 and rpt_05 are both county-level impact summaries, which is
      // exactly what the grant builder produces.
      default:
        return buildModuleExport('grant', {
          pantries,
          counties,
          countyScope: scopeName,
          periodLabel: resolved.label,
          agencyName: user?.organization ?? 'AccessBelt agency',
          containsModelledFigures: false,
        });
    }
  };

  /** Rows the template would produce right now, so the card is not a promise. */
  const rowCountFor = (templateId: string): number => buildReport(templateId)?.rows.length ?? 0;

  const handleGenerate = (templateId: string) => {
    const template = mockReportTemplates.find((entry) => entry.id === templateId);
    const bundle = buildReport(templateId);
    if (!bundle || bundle.rows.length === 0) {
      setGeneratedToast('Nothing to report for the current scope and period.');
      setTimeout(() => setGeneratedToast(null), 3000);
      return;
    }

    setSelectedTemplate(templateId);
    exportBundleToCSV(bundle);

    setHistory((current) => [
      {
        id: `${templateId}_${Date.now()}`,
        name: `${template?.name ?? templateId} — ${resolved.label}`,
        range: `${resolved.startDate} to ${resolved.endDate}`,
        generatedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        rows: bundle.rows.length,
        bundle,
      },
      ...current,
    ]);

    setGeneratedToast(`${bundle.rows.length} rows exported.`);
    setTimeout(() => setGeneratedToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      <DataStateBoundary status={status} error={error} source={countyRollups.source} skeletonRows={3}>
      {/* Toast Notification */}
      {generatedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1d2e] border border-emerald-500/30 shadow-xl px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in-up">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-[13px] text-white">{generatedToast}</p>
        </div>
      )}

      {/* Report Templates */}
      <ChartCard
        title="Report Templates"
        subtitle="Select a template to generate a compliance or grant report"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockReportTemplates.map((template) => (
            <div
              key={template.id}
              className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                selectedTemplate === template.id
                  ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
              }`}
              onClick={() => setSelectedTemplate(selectedTemplate === template.id ? null : template.id)}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                  {iconMap[template.icon] || <FileText className="w-5 h-5 text-emerald-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{template.name}</p>
                  <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    template.category === 'Monthly'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : template.category === 'Quarterly'
                      ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  }`}>
                    {template.category}
                  </span>
                </div>
              </div>
              <p className="text-[12px] text-slate-400 leading-relaxed mb-4">{template.description}</p>
              
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                <span className="text-[11px] text-slate-400">
                  {rowCountFor(template.id)} rows · {resolved.label}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerate(template.id);
                  }}
                  disabled={status !== 'ready'}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <FileBarChart2 className="w-3.5 h-3.5" />
                  Generate CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => window.print()}
          className="card p-4 flex items-center gap-3 hover:border-white/[0.12] transition-all cursor-pointer group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <Printer className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">Print Branded PDF</p>
            <p className="text-[11px] text-slate-400">Co-branded report header view</p>
          </div>
        </button>

        <button
          onClick={() => setShowScheduleModal(true)}
          className="card p-4 flex items-center gap-3 hover:border-white/[0.12] transition-all cursor-pointer group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <Calendar className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">Schedule Email Report</p>
            <p className="text-[11px] text-slate-400">Automate weekly or monthly delivery</p>
          </div>
        </button>

        <button
          onClick={() => handleGenerate('rpt_03')}
          className="card p-4 flex items-center gap-3 hover:border-white/[0.12] transition-all cursor-pointer group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <Download className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">Export Pantry Scorecard</p>
            <p className="text-[11px] text-slate-400">Every pantry in scope, for this period</p>
          </div>
        </button>
      </div>

      {/* Active Automated Schedules */}
      <ChartCard
        title="Active Automated Email Schedules"
        subtitle="Automated digests sent to agency stakeholders"
        action={
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20 text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Schedule
          </button>
        }
      >
        {scheduledRules.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
              <Mail className="w-5 h-5 text-slate-300" aria-hidden="true" />
            </div>
            <p className="text-[13px] font-semibold text-white">No scheduled reports yet</p>
            <p className="text-[12px] text-slate-300 mt-1 max-w-sm">
              Schedule a recurring delivery so grant reports reach your funders without anyone
              remembering to export them.
            </p>
          </div>
        ) : (
          <ul className="space-y-3 list-none p-0 m-0">
            {scheduledRules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-300 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">
                      {rule.templateName}
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                        {rule.format}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-300">
                      {describeSchedule(rule.frequency, rule.sendOnDay, rule.recipients.length)}
                      {' · '}
                      {rule.countyScope === ALL_COUNTIES
                        ? 'All assigned counties'
                        : `${rule.countyScope} County`}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      Next run{' '}
                      {new Date(rule.nextRunAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                      {' · '}
                      {rule.recipients.join(', ')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteSchedule(rule)}
                  aria-label={`Delete the ${rule.templateName} schedule`}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-300 hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>

      {/* Generated Reports History — only what this session actually produced */}
      <ChartCard
        title="Reports generated this session"
        subtitle="Re-download any file without rebuilding it"
      >
        {history.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
              <Inbox className="w-5 h-5 text-slate-300" aria-hidden="true" />
            </div>
            <p className="text-[13px] font-semibold text-white">No reports generated yet</p>
            <p className="text-[12px] text-slate-300 mt-1 max-w-sm">
              Generate one above and it appears here with the scope and period it covered. History is
              not stored between sessions yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Reports generated during this session</caption>
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th scope="col" className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-left">Report</th>
                  <th scope="col" className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-left">Date range</th>
                  <th scope="col" className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-left">Generated</th>
                  <th scope="col" className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">Rows</th>
                  <th scope="col" className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <p className="text-[13px] font-medium text-white">{entry.name}</p>
                    </td>
                    <td className="py-3 px-3 font-mono text-[12px] text-slate-400">{entry.range}</td>
                    <td className="py-3 px-3 text-[12px] text-slate-400">{entry.generatedAt}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[12px] text-slate-300">
                      {entry.rows.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => exportBundleToCSV(entry.bundle)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                        aria-label={`Download ${entry.name} again`}
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <ScheduleReportModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        templates={mockReportTemplates}
        assignedCounties={user?.assignedCounties ?? []}
        orgId={user?.orgId ?? ''}
        regionLabel={user?.region ?? 'All counties'}
        defaultCountyScope={countyScope}
        createdBy={user?.email ?? ''}
        onSchedule={handleSchedule}
      />
      </DataStateBoundary>
    </div>
  );
};
