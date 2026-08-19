import { createContext } from 'react';
import type { ModuleId } from '../types';

/**
 * `review` unlocks every module so the offerings can be worked on.
 * An agency id previews the entitlements that customer actually holds.
 */
export type PreviewSelection = 'review' | string;

export interface PreviewPersona {
  id: PreviewSelection;
  label: string;
  /** What this persona owns, spelled out rather than implied. */
  detail: string;
  entitlements: ModuleId[] | 'all';
}

export interface PreviewContextValue {
  /** False once live data is on — the switcher is not rendered at all then. */
  available: boolean;
  selection: PreviewSelection;
  persona: PreviewPersona;
  personas: PreviewPersona[];
  setSelection: (id: PreviewSelection) => void;
  /** Entitlements the rest of the app should treat as in force. */
  effectiveEntitlements: ModuleId[] | 'all';
}

export const PreviewContext = createContext<PreviewContextValue | null>(null);
