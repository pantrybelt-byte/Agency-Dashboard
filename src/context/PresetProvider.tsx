/**
 * Holds which of the five buyer views is active.
 *
 * The active preset is deliberately app-wide rather than per page: an
 * emergency manager who switches to the disaster feed expects the food desert
 * map and the export button to follow them across the whole dashboard, not to
 * reset on navigation.
 *
 * Selecting a locked preset never changes the view. It records the upgrade
 * request instead, which is what opens the modal — a gate that half-applies
 * is worse than one that does not move at all.
 *
 * The active preset lives in the query string because the header's Share
 * button copies `window.location.href` and promises the link carries "the
 * current filters". Holding the preset in component state made that promise
 * false — the recipient opened a different view than the sender saw — and
 * dropped the selection on every refresh.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PresetContext } from './PresetContext';
import {
  DEFAULT_PRESET_ID,
  VIEW_PRESET_IDS,
  getPreset,
  isPresetUnlocked,
  type PresetId,
  type ViewPreset,
} from '../config/presets';
import { useAuth } from '../hooks/useAuth';

export const PresetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingUpgrade, setPendingUpgrade] = useState<ViewPreset | null>(null);

  const requested = searchParams.get('view') as PresetId | null;
  const presetId: PresetId =
    requested && VIEW_PRESET_IDS.includes(requested) ? requested : DEFAULT_PRESET_ID;

  const entitlements = user?.entitlements;

  const isUnlocked = useCallback(
    (id: PresetId) => isPresetUnlocked(getPreset(id), entitlements),
    [entitlements],
  );

  const requestUpgrade = useCallback((id: PresetId) => {
    setPendingUpgrade(getPreset(id));
  }, []);

  const selectPreset = useCallback(
    (id: PresetId) => {
      if (isUnlocked(id)) {
        setSearchParams(
          (current) => {
            const next = new URLSearchParams(current);
            if (id === DEFAULT_PRESET_ID) next.delete('view');
            else next.set('view', id);
            return next;
          },
          { replace: true },
        );
        setPendingUpgrade(null);
        return;
      }
      requestUpgrade(id);
    },
    [isUnlocked, requestUpgrade, setSearchParams],
  );

  const value = useMemo(
    () => ({
      preset: getPreset(presetId),
      presetId,
      selectPreset,
      isUnlocked,
      pendingUpgrade,
      requestUpgrade,
      dismissUpgrade: () => setPendingUpgrade(null),
    }),
    [presetId, selectPreset, isUnlocked, pendingUpgrade, requestUpgrade],
  );

  return <PresetContext.Provider value={value}>{children}</PresetContext.Provider>;
};
