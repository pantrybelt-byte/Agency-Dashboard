import React, { useId } from 'react';

export interface ChartDataTable {
  /** Column headers. The first names the category axis. */
  columns: string[];
  rows: (string | number)[][];
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /**
   * Text alternative for the visualisation. Rendered as a visually hidden
   * table so screen-reader users get the underlying numbers — an SVG chart is
   * otherwise unreadable to them.
   */
  dataTable?: ChartDataTable;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  dataTable,
}) => {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={`card p-5 ${className}`}>
      <div className="flex items-start justify-between mb-5 gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-[14px] font-semibold text-white">
            {title}
          </h2>
          {subtitle && <p className="text-[12px] text-slate-300 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {children}

      {dataTable && (
        <table className="sr-only">
          <caption>{`${title} — underlying data`}</caption>
          <thead>
            <tr>
              {dataTable.columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataTable.rows.map((row) => (
              <tr key={String(row[0])}>
                <th scope="row">{row[0]}</th>
                {row.slice(1).map((cell, index) => (
                  <td key={dataTable.columns[index + 1] ?? index}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
