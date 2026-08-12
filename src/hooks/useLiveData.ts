import { useEffect, useState } from 'react';
import type { DataSource, Subscribe } from '../services/dashboardData';

export type DataStatus = 'loading' | 'ready' | 'error';

export interface LiveData<T> {
  data: T;
  status: DataStatus;
  /** Which backing store produced `data` — drives an honest freshness badge. */
  source: DataSource;
  error: Error | null;
}

/**
 * Attach a dashboard subscription for the lifetime of a component.
 *
 * `subscribe` must be a stable reference (the exported subscriptions are
 * module-level constants), otherwise the listener is torn down and rebuilt on
 * every render.
 *
 * An error does not clear `data`: when a Firestore listener fails the service
 * layer falls back to demonstration data, and a populated dashboard with a
 * visible warning beats an empty one.
 */
export function useLiveData<T>(subscribe: Subscribe<T>, initialValue: T): LiveData<T> {
  const [state, setState] = useState<LiveData<T>>({
    data: initialValue,
    status: 'loading',
    source: 'demo',
    error: null,
  });

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribe(
      (data, source) => {
        if (!active) return;
        setState((previous) => ({ ...previous, data, source, status: 'ready' }));
      },
      (error) => {
        if (!active) return;
        setState((previous) => ({ ...previous, status: 'error', error }));
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [subscribe]);

  return state;
}
