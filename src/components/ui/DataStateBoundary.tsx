import React from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import type { DataSource } from '../../services/dashboardData';
import type { DataStatus } from '../../hooks/useLiveData';

interface DataStateBoundaryProps {
  status: DataStatus;
  error: Error | null;
  source: DataSource;
  /** True when the request succeeded but produced nothing to show. */
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  skeletonRows?: number;
  children: React.ReactNode;
}

const Skeleton = ({ rows }: { rows: number }) => (
  <div className="space-y-4" role="status">
    <span className="sr-only">Loading dashboard data</span>
    {Array.from({ length: rows }, (_, index) => (
      <div
        key={index}
        className="h-24 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-shimmer"
        aria-hidden="true"
      />
    ))}
  </div>
);

/**
 * Wraps a data-backed region with its loading, error and empty states.
 *
 * An error is shown *alongside* the content rather than instead of it: when a
 * Firestore listener fails the service layer falls back to demonstration data,
 * so there is still something worth reading. Replacing a populated dashboard
 * with a full-page error would be a downgrade, but hiding the failure would be
 * dishonest — an agency must never mistake fallback data for live data.
 */
export const DataStateBoundary: React.FC<DataStateBoundaryProps> = ({
  status,
  error,
  source,
  isEmpty = false,
  emptyTitle = 'Nothing to show',
  emptyMessage = 'No records match the current filters.',
  skeletonRows = 3,
  children,
}) => {
  if (status === 'loading') {
    return <Skeleton rows={skeletonRows} />;
  }

  return (
    <>
      {status === 'error' && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-bold text-white">Live data unavailable</p>
            <p className="text-[12px] text-slate-300">
              {source === 'demo'
                ? 'Showing demonstration data instead. Figures below are not live and must not be reported as such.'
                : 'Some figures may be out of date.'}
              {error?.message ? ` (${error.message})` : ''}
            </p>
          </div>
        </div>
      )}

      {isEmpty ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
            <Inbox className="w-6 h-6 text-slate-300" aria-hidden="true" />
          </div>
          <p className="text-[14px] font-semibold text-white">{emptyTitle}</p>
          <p className="text-[12px] text-slate-300 mt-1 max-w-sm">{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </>
  );
};
