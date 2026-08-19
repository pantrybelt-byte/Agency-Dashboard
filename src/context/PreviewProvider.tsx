/**
 * Demo preview mode.
 *
 * Two jobs. While building out the offerings, `review` unlocks every module so
 * the work is not blocked behind an entitlement check. To see the product as a
 * customer meets it, selecting an agency applies that agency's real
 * entitlements — and the three demo agencies deliberately own different
 * mixes, so "what an agency sees" has three genuinely different answers.
 *
 * ── Why this cannot leak into production ──────────────────────────────────
 *
 * `available` is false whenever live Firestore data is on. A control that can
 * unlock paid modules from the browser is only safe while nothing is real;
 * once entitlements are enforced against actual customers, this must not
 * exist. Tying it to the data source means that happens automatically rather
 * than depending on someone remembering.
 *
 * Scope note: this overrides entitlements only. County scope and the account
 * name still follow the signed-in user, so previewing as USDA shows USDA's
 * modules against your own assigned counties.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PreviewContext, type PreviewPersona, type PreviewSelection } from './PreviewContext';
import { mockAgencyUsers } from '../data/mockData';
import { getFirebaseStatus } from '../services/firebaseStatus';
import { getPreset } from '../config/presets';
import type { ModuleId } from '../types';

const STORAGE_KEY = 'accessbelt.preview.v1';

const REVIEW_PERSONA: PreviewPersona = {
  id: 'review',
  label: 'All modules unlocked',
  detail: 'Review mode — every module open for editing',
  entitlements: 'all',
};

function describe(entitlements: ModuleId[]): string {
  if (entitlements.length === 0) return 'Base platform only';
  return entitlements.map((id) => getPreset(id).shortName).join(' + ');
}

export const PreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const available = !getFirebaseStatus().enabled;

  const personas = useMemo<PreviewPersona[]>(
    () => [
      REVIEW_PERSONA,
      ...mockAgencyUsers.map((agency) => ({
        id: agency.id,
        label: agency.organization,
        detail: describe(agency.entitlements ?? []),
        entitlements: agency.entitlements ?? [],
      })),
    ],
    [],
  );

  // Defaults to review mode: the point of demo mode is to be able to work on
  // every module without buying one.
  const [selection, setSelectionState] = useState<PreviewSelection>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) ?? 'review';
    } catch {
      return 'review';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, selection);
    } catch {
      /* Private browsing blocks storage; the selection just will not persist. */
    }
  }, [selection]);

  const setSelection = useCallback((id: PreviewSelection) => setSelectionState(id), []);

  const persona = personas.find((p) => p.id === selection) ?? REVIEW_PERSONA;

  const value = useMemo(
    () => ({
      available,
      selection,
      persona,
      personas,
      setSelection,
      // With live data on, the override is inert regardless of what is stored.
      effectiveEntitlements: available ? persona.entitlements : ([] as ModuleId[]),
    }),
    [available, selection, persona, personas, setSelection],
  );

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
};
