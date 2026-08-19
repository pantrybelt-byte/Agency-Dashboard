import { createContext } from 'react';
import type { PresetId, ViewPreset } from '../config/presets';

export interface PresetContextValue {
  /** The preset currently driving the dashboard. Always an unlocked one. */
  preset: ViewPreset;
  presetId: PresetId;
  /** Unlocked presets switch the view; locked ones open the upgrade modal. */
  selectPreset: (id: PresetId) => void;
  isUnlocked: (id: PresetId) => boolean;
  /** The locked preset the upgrade modal is currently describing, if any. */
  pendingUpgrade: ViewPreset | null;
  requestUpgrade: (id: PresetId) => void;
  dismissUpgrade: () => void;
}

export const PresetContext = createContext<PresetContextValue | null>(null);
