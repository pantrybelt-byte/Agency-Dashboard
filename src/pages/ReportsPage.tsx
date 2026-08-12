import React, { useState } from 'react';
import {
  FileBarChart2, Download, Printer, Clock, CheckCircle, Loader2, Calendar,
  BarChart3, MapPin, Store, Package, FileText, Sliders, Mail, Plus, Trash2
} from 'lucide-react';
import { ChartCard } from '../components/ui/ChartCard';
import { ScheduleReportModal } from '../components/ui/ScheduleReportModal';
import { useAuth } from '../hooks/useAuth';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { useLiveData } from '../hooks/useLiveData';
import {
  deleteScheduledReport,
  saveScheduledReport,
  subscribeScheduledReports,
} from '../services/dashboardData';
import type { ScheduledReport } from '../types';
import { describeSchedule } from '../utils/reportSchedule';
import { ALL_COUNTIES } from '../utils/scoping';
import { mockReportTemplates, mockGeneratedReports, mockPantryMetrics, mockRequestedItems, mockFoodDesertZones } from '../data/mockData';
import { exportToCSV } from '../utils/csvExport';

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
  const { countyScope } = useDashboardFilters();
  const { data: scheduledRules } = useLiveData(subscribeScheduledReports, [] as ScheduledReport[]);

  const handleSchedule = async (report: ScheduledReport) => {
    await saveScheduledReport(report);
  };

  const handleDeleteSchedule = async (report: ScheduledReport) => {
    await deleteScheduledReport(report.id);
  };

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedToast, setGeneratedToast] = useState<string | null>(null);
  
  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);


  const handleGenerate = (templateId: string) => {
    setGenerating(true);
    setSelectedTemplate(templateId);
    setTimeout(() => {
      setGenerating(false);
      setSelectedTemplate(null);
      setGeneratedToast('Report generated & CSV downloaded successfully!');
      setTimeout(() => setGeneratedToast(null), 3000);

      if (templateId === 'rpt_02') {
        exportToCSV('USDA_Food_Desert_Report', mockFoodDesertZones);
      } else if (templateId === 'rpt_04') {
        exportToCSV('Item_Demand_Intelligence_Report', mockRequestedItems);
      } else {
        exportToCSV('United_Way_Community_Impact_Report', mockPantryMetrics);
      }
    }, 1200);
  };

  const handleDownloadReportCSV = (reportName: string) => {
    if (reportName.includes('Food Desert')) {
      exportToCSV('Food_Desert_Assessment_Q2', mockFoodDesertZones);
    } else if (reportName.includes('Demand')) {
      exportToCSV('Item_Demand_Intelligence_August', mockRequestedItems);
    } else {
      exportToCSV('AccessBelt_Monthly_Impact_Report', mockPantryMetrics);
    }
  };


  return (
    <div className="space-y-6">
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
              onClick={() => !generating && setSelectedTemplate(selectedTemplate === template.id ? null : template.id)}
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
                {template.lastGenerated ? (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {template.lastGenerated}
                  </p>
                ) : (
                  <span className="text-[11px] text-slate-400">On-demand</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerate(template.id);
                  }}
                  disabled={generating}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {generating && selectedTemplate === template.id ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileBarChart2 className="w-3.5 h-3.5" />
                      Generate CSV
                    </>
                  )}
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
          onClick={() => exportToCSV('All_Pantry_Metrics_Export', mockPantryMetrics)}
          className="card p-4 flex items-center gap-3 hover:border-white/[0.12] transition-all cursor-pointer group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <Download className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">Export Full Database CSV</p>
            <p className="text-[11px] text-slate-400">Instant download for analysts</p>
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

      {/* Generated Reports History */}
      <ChartCard
        title="Report History"
        subtitle="Previously generated reports available for download"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-left">Report</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-left">Date Range</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-left">Generated</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center">Status</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">Size</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockGeneratedReports.map((report) => (
                <tr key={report.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3">
                    <p className="text-[13px] font-medium text-white">{report.name}</p>
                  </td>
                  <td className="py-3 px-3 text-[12px] text-slate-400">{report.dateRange}</td>
                  <td className="py-3 px-3 text-[12px] text-slate-400">{report.generatedAt}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      report.status === 'ready'
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : report.status === 'generating'
                        ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                        : 'text-red-400 bg-red-500/10 border border-red-500/20'
                    }`}>
                      {report.status === 'ready' && <CheckCircle className="w-3 h-3" />}
                      {report.status === 'generating' && <Loader2 className="w-3 h-3 animate-spin" />}
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[12px] text-slate-400 text-right font-mono">{report.fileSize}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleDownloadReportCSV(report.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Download CSV Data"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Print PDF View"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ScheduleReportModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        templates={mockReportTemplates}
        assignedCounties={user?.assignedCounties ?? []}
        regionLabel={user?.region ?? 'All counties'}
        defaultCountyScope={countyScope}
        createdBy={user?.email ?? ''}
        onSchedule={handleSchedule}
      />
    </div>
  );
};
