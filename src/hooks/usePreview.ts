import { useContext } from 'react';
import { PreviewContext, type PreviewContextValue } from '../context/PreviewContext';

export function usePreview(): PreviewContextValue {
  const ctx = useContext(PreviewContext);
  if (!ctx) throw new Error('usePreview must be used within a PreviewProvider');
  return ctx;
}
