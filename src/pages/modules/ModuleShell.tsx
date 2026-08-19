/**
 * Common frame for a purchasable module page.
 *
 * Wraps content in the entitlement gate, so an agency without the module sees
 * a blurred preview of the real thing plus the upgrade path, and an agency
 * with it sees the module. The masthead carries the same identity, price band
 * and export affordance the Overview preset banner uses, so a buyer meets one
 * consistent presentation of the product wherever they land.
 */
import React from 'react';
import { Printer, Download, MapPin, CalendarRange } from 'lucide-react';
import { ACCENTS, formatPriceBand, getPreset, type PresetId } from '../../config/presets';
import { ModuleGate } from '../../components/ui/ModuleGate';
import { DataStateBoundary } from '../../components/ui/DataStateBoundary';
import { EntitlementBadge } from '../../components/ui/StatusBadge';
import { usePreset } from '../../hooks/usePreset';
import type { DataStatus } from '../../hooks/useLiveData';

interface ModuleShellProps {
  moduleId: PresetId;
  onExport?: () => void;
  /** What the figures on this page cover. Rendered as a coverage strip. */
  scopeLabel?: string;
  periodLabel?: string;
  status?: DataStatus;
  error?: Error | null;
  children: React.ReactNode;
}

export const ModuleShell: React.FC<ModuleShellProps> = ({
  moduleId,
  onExport,
  scopeLabel,
  periodLabel,
  status = 'ready',
  error = null,
  children,
}) => {
  const { isUnlocked } = usePreset();
  const preset = getPreset(moduleId);
  const accent = ACCENTS[preset.accent];
  const unlocked = isUnlocked(moduleId);
  const Icon = preset.icon;

  return (
    <div className="space-y-6">
      <section className={`card-accent card ${accent.text} p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${accent.border} ${accent.bg}`}
            >
              <Icon className={`h-5 w-5 ${accent.text}`} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-bold tracking-tight text-white">{preset.name}</h2>
                <EntitlementBadge locked={!unlocked} variant={preset.access === 'included' ? 'included' : 'purchased'} />
              </div>
              <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-slate-300">
                {preset.summary}
              </p>
              <p className="mt-1.5 font-mono text-[11px] text-slate-400">
                {formatPriceBand(preset)} · {preset.buyer}
              </p>
            </div>
          </div>

          {unlocked && (
            <div className="no-print flex shrink-0 items-start gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[12px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white cursor-pointer"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Print
              </button>
              {onExport && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={onExport}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold text-[#0b0d14] transition-colors cursor-pointer ${accent.solid} ${accent.solidHover}`}
                  >
                    <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {preset.exportLabel}
                  </button>
                  <p className="mt-1.5 max-w-[17rem] text-[11px] text-slate-400">
                    {preset.exportNote}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Coverage strip. A module page shows figures for a scope and a period
          that were chosen in the header two sections away; saying so on the
          page is what stops a screenshot from losing that context. */}
      {unlocked && (scopeLabel || periodLabel) && (
        <div className="card flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          {scopeLabel && (
            <span className="flex items-center gap-1.5 text-[12px] text-slate-300">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="text-slate-400">Coverage</span>
              <span className="font-semibold text-white">{scopeLabel}</span>
            </span>
          )}
          {periodLabel && (
            <span className="flex items-center gap-1.5 text-[12px] text-slate-300">
              <CalendarRange className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="text-slate-400">Period</span>
              <span className="font-semibold text-white">{periodLabel}</span>
            </span>
          )}
          <span className="text-[11px] text-slate-400">
            Change either in the dashboard header; every figure below follows.
          </span>
        </div>
      )}

      <ModuleGate moduleId={moduleId}>
        <DataStateBoundary status={status} error={error} source="demo" skeletonRows={4}>
          {children}
        </DataStateBoundary>
      </ModuleGate>
    </div>
  );
};

/** Shared marker for any figure this module models rather than measures. */
export const SampleNotice: React.FC<{ what: string }> = ({ what }) => (
  <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5 text-[11px] text-amber-200/90">
    <span className="font-semibold">Sample data.</span> {what} is modelled from pantry activity and
    is not yet drawn from a source system. Do not cite in a filing or audit without verification.
  </p>
);
