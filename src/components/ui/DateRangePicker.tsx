import React, { useState } from 'react';
import { Calendar, GitCompare, X, Check } from 'lucide-react';
import type { DateRangePreset } from '../../types';

interface DateRangePickerProps {
  selected: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
  compareMode?: boolean;
  onToggleCompare?: (enabled: boolean) => void;
}

const presets: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'ytd', label: 'YTD' },
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  selected,
  onChange,
  compareMode = false,
  onToggleCompare,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-08-11');

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    onChange('custom');
    setShowCustomModal(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Preset Pills */}
      <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.06]">
        <Calendar className="w-4 h-4 text-slate-400 ml-2 mr-1 shrink-0" />
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onChange(preset.value)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
              selected === preset.value
                ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {preset.label}
          </button>
        ))}

        {/* Custom Range Button */}
        <button
          onClick={() => setShowCustomModal(true)}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
            selected === 'custom'
              ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          {selected === 'custom' ? `${startDate} - ${endDate}` : 'Custom'}
        </button>
      </div>

      {/* Compare to Previous Period Toggle */}
      {onToggleCompare && (
        <button
          onClick={() => onToggleCompare(!compareMode)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium border transition-all cursor-pointer ${
            compareMode
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              : 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:text-white'
          }`}
          title="Compare current timeframe against previous period"
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>Compare</span>
        </button>
      )}

      {/* Custom Date Range Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1d2e] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/[0.1] animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">Select Custom Date Range</h3>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyCustom} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-xl text-white text-[13px]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-xl text-white text-[13px]"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 text-[13px] text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-[13px] font-medium bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Check className="w-4 h-4" />
                  Apply Range
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
