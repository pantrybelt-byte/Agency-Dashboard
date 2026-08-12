import React, { useState } from 'react';
import { Calendar, GitCompare, Check } from 'lucide-react';
import type { CustomDateRange, DateRangePreset } from '../../types';
import { Modal } from './Modal';

interface DateRangePickerProps {
  selected: DateRangePreset;
  customRange?: CustomDateRange;
  onChange: (preset: DateRangePreset, custom?: CustomDateRange) => void;
  compareMode: boolean;
  onToggleCompare: (enabled: boolean) => void;
}

const presets: { value: DateRangePreset; label: string; description: string }[] = [
  { value: '7d', label: '7 Days', description: 'Last 7 days' },
  { value: '30d', label: '30 Days', description: 'Last 30 days' },
  { value: '90d', label: '90 Days', description: 'Last 90 days' },
  { value: 'ytd', label: 'YTD', description: 'Year to date' },
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  selected,
  customRange,
  onChange,
  compareMode,
  onToggleCompare,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [startDate, setStartDate] = useState(customRange?.startDate ?? '2026-07-01');
  const [endDate, setEndDate] = useState(customRange?.endDate ?? '2026-08-11');

  const handleApplyCustom = (event: React.FormEvent) => {
    event.preventDefault();
    onChange('custom', { startDate, endDate });
    setShowCustomModal(false);
  };

  const customLabel =
    selected === 'custom' && customRange ? `${customRange.startDate} – ${customRange.endDate}` : 'Custom';

  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label="Reporting period"
        className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.08]"
      >
        <Calendar className="w-4 h-4 text-slate-300 ml-2 mr-1 shrink-0" aria-hidden="true" />
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            aria-pressed={selected === preset.value}
            aria-label={preset.description}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
              selected === preset.value
                ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {preset.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowCustomModal(true)}
          aria-pressed={selected === 'custom'}
          aria-haspopup="dialog"
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
            selected === 'custom'
              ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          {customLabel}
        </button>
      </div>

      <button
        type="button"
        onClick={() => onToggleCompare(!compareMode)}
        aria-pressed={compareMode}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium border transition-all cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
          compareMode
            ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40'
            : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:text-white'
        }`}
      >
        <GitCompare className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Compare</span>
        <span className="sr-only">against the previous period</span>
      </button>

      <Modal
        open={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        title="Select custom date range"
        icon={<Calendar className="w-5 h-5 text-emerald-400" aria-hidden="true" />}
      >
        <form onSubmit={handleApplyCustom} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="custom-range-start" className="block text-[12px] text-slate-300 mb-1">
                Start date
              </label>
              <input
                id="custom-range-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-white text-[13px]"
                required
              />
            </div>
            <div>
              <label htmlFor="custom-range-end" className="block text-[12px] text-slate-300 mb-1">
                End date
              </label>
              <input
                id="custom-range-end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-white text-[13px]"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCustomModal(false)}
              className="px-4 py-2 text-[13px] text-slate-300 hover:text-white rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-[13px] font-medium bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              Apply range
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
