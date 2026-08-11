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
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  trendLabel,
  icon,
  glowClass = '',
  animationDelay = '',
}) => {
  const trendColor = trend && trend > 0 ? 'text-emerald-400' : trend && trend < 0 ? 'text-red-400' : 'text-slate-400';
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;

  return (
    <div className={`card p-5 animate-fade-in-up ${glowClass} ${animationDelay}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] text-slate-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-white mt-2 tracking-tight">
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
        <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
};
