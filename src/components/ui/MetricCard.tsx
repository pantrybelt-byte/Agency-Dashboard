import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon: React.ReactNode;
  glowClass?: string;
  animationDelay?: string;
  /** Monospace the value — exact dollar figures and coordinates. */
  mono?: boolean;
  /** Marks a figure as modelled rather than measured. */
  illustrative?: boolean;
  /**
   * `lead` promotes the figure a view exists to show.
   *
   * Every preset declares its KPIs in priority order, but all four rendered at
   * identical weight, so the five buyer views differed in content and not in
   * shape. Promoting the first gives each view a silhouette you can recognise
   * before reading a word of it.
   */
  emphasis?: 'default' | 'lead';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  trendLabel,
  icon,
  glowClass = '',
  animationDelay = '',
  mono = false,
  illustrative = false,
  emphasis = 'default',
}) => {
  const trendColor = trend && trend > 0 ? 'text-emerald-400' : trend && trend < 0 ? 'text-red-400' : 'text-slate-400';
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const isLead = emphasis === 'lead';

  return (
    <div
      className={`card card-hover animate-fade-in-up ${glowClass} ${animationDelay} ${
        isLead ? 'p-6 sm:col-span-2 border-white/[0.14]' : 'p-5'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400">
            {label}
            {illustrative && (
              <span
                title="Modelled figure — no source system connected yet"
                className="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-300"
              >
                Sample
              </span>
            )}
          </p>
          <p
            className={`mt-2 font-bold tracking-tight text-white tabular-nums ${
              isLead ? 'text-4xl' : 'text-2xl'
            } ${mono ? (isLead ? 'font-mono text-3xl' : 'font-mono text-xl') : ''}`}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1.5 ${trendColor}`}>
              <TrendIcon className="w-3.5 h-3.5" />
              <span className="text-[12px] font-semibold">
                {trend > 0 ? '+' : ''}{trend}%
              </span>
              {trendLabel && (
                <span className="text-[11px] text-slate-400 ml-0.5">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={`rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0 ${
            isLead ? 'w-12 h-12' : 'w-10 h-10'
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};
