import { useContext } from 'react';
import { PresetContext, type PresetContextValue } from '../context/PresetContext';

export function usePreset(): PresetContextValue {
  const ctx = useContext(PresetContext);
  if (!ctx) throw new Error('usePreset must be used within a PresetProvider');
  return ctx;
}
