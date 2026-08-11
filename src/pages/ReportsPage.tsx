import React, { useState } from 'react';
import {
  FileBarChart2, Download, Printer, Clock, CheckCircle, Loader2, Calendar,
  BarChart3, MapPin, Store, Package, FileText, Sliders
} from 'lucide-react';
import { ChartCard } from '../components/ui/ChartCard';
import { DataTable } from '../components/ui/DataTable';
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
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedToast, setGeneratedToast] = useState(false);

  const handleGenerate = (templateId: string) => {
    setGenerating(true);
    setSelectedTemplate(templateId);
    setTimeout(() => {
      setGenerating(false);
      setSelectedTemplate(null);
      setGeneratedToast(true);
      setTimeout(() => setGeneratedToast(false), 3000);

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
      {/* Toast */}
      {generatedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1d2e] border border-emerald-500/20 shadow-xl px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in-up">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-[13px] text-white">Report generated & CSV downloaded successfully!</p>
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
        <button
          onClick={() => handleGenerate('rpt_05')}
          className="card p-4 flex items-center gap-3 hover:border-white/[0.12] transition-all cursor-pointer group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <Calendar className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">United Way Grant Package</p>
            <p className="text-[11px] text-slate-400">Pre-formatted submission bundle</p>
          </div>
        </button>
      </div>

      {/* Generated Reports History */}
      <ChartCard
        title="Report History"
        subtitle="Previously generated reports available for download"
      >
        <DataTable
          caption="Previously generated reports, with download and print actions"
          data={mockGeneratedReports}
          rowKey={(report) => report.id}
          emptyMessage="No reports have been generated yet."
          columns={[
            {
              key: 'name',
              label: 'Report',
              sortable: true,
              render: (report) => <span className="font-medium text-white">{report.name}</span>,
            },
            {
              key: 'dateRange',
              label: 'Date Range',
              render: (report) => <span className="text-[12px] text-slate-300">{report.dateRange}</span>,
            },
            {
              key: 'generatedAt',
              label: 'Generated',
              sortable: true,
              render: (report) => <span className="text-[12px] text-slate-300">{report.generatedAt}</span>,
            },
            {
              key: 'status',
              label: 'Status',
              align: 'center',
              sortable: true,
              render: (report) => (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    report.status === 'ready'
                      ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/25'
                      : report.status === 'generating'
                        ? 'text-amber-300 bg-amber-500/10 border border-amber-500/25'
                        : 'text-red-300 bg-red-500/10 border border-red-500/25'
                  }`}
                >
                  {report.status === 'ready' && <CheckCircle className="w-3 h-3" aria-hidden="true" />}
                  {report.status === 'generating' && (
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                  )}
                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </span>
              ),
            },
            {
              key: 'fileSize',
              label: 'Size',
              align: 'right',
              render: (report) => (
                <span className="text-[12px] text-slate-300 font-mono">{report.fileSize}</span>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              align: 'right',
              render: (report) => (
                <span className="flex items-center gap-1 justify-end">
                  <button
                    type="button"
                    onClick={() => handleDownloadReportCSV(report.name)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                    aria-label={`Download ${report.name} as CSV`}
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                    aria-label={`Print ${report.name}`}
                  >
                    <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </span>
              ),
            },
          ]}
        />
      </ChartCard>
    </div>
  );
};
