import React from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
}) => {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[14px] font-semibold text-white">{title}</h3>
          {subtitle && (
            <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
};
