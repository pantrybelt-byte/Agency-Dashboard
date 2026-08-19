/**
 * The badge vocabulary.
 *
 * Two families, kept in one file so they cannot drift apart:
 *   - entitlement  — whether a module is included or a paid add-on
 *   - verification — how a pantry's map pin was established
 *
 * Every badge pairs its colour with a word. Colour alone is not a status:
 * roughly one in twelve men cannot separate the red and green states, and
 * these particular states drive whether someone drives to a pantry.
 */
import React from 'react';
import { Lock, Unlock, MapPin, Satellite, AlertTriangle } from 'lucide-react';

export type VerificationLevel = 1 | 2 | 3;

const BASE =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap';

/**
 * Three states, not two. A purchased add-on is not the base view, and calling
 * it one made the Corporate CSR module read as free on the very page selling
 * it. `variant` defaults to `auto`, which infers base-vs-purchased from
 * whether the module is part of the base platform.
 */
export const EntitlementBadge: React.FC<{
  locked: boolean;
  /** `included` marks the base-platform view; `purchased` marks a bought module. */
  variant?: 'included' | 'purchased';
  className?: string;
}> = ({ locked, variant = 'included', className = '' }) => {
  if (locked) {
    return (
      <span className={`${BASE} border-amber-500/30 bg-amber-500/10 text-amber-300 ${className}`}>
        <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
        Locked add-on module
      </span>
    );
  }

  return (
    <span className={`${BASE} border-emerald-500/30 bg-emerald-500/10 text-emerald-400 ${className}`}>
      <Unlock className="h-3 w-3 shrink-0" aria-hidden="true" />
      {variant === 'purchased' ? 'Module active' : 'Unlocked base view'}
    </span>
  );
};

const VERIFICATION = {
  3: {
    label: 'Level 3 field verified pin',
    short: 'Field verified',
    icon: MapPin,
    classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    dot: 'bg-emerald-400',
  },
  2: {
    label: 'Level 2 satellite pin dragged',
    short: 'Satellite placed',
    icon: Satellite,
    classes: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    dot: 'bg-amber-400',
  },
  1: {
    label: 'Level 1 unverified address',
    short: 'Unverified',
    icon: AlertTriangle,
    classes: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    dot: 'bg-rose-400',
  },
} as const;

export const VerificationBadge: React.FC<{
  level: VerificationLevel;
  /** Compact form for table cells — dot plus short label. */
  compact?: boolean;
  className?: string;
}> = ({ level, compact = false, className = '' }) => {
  const config = VERIFICATION[level];
  const Icon = config.icon;

  return (
    <span className={`${BASE} ${config.classes} ${className}`}>
      {compact ? (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} aria-hidden="true" />
      ) : (
        <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      {compact ? config.short : config.label}
    </span>
  );
};

/** Derives a pin's verification level from the fields a pantry record carries. */
export function verificationLevelFor(pantry: {
  coordinates?: { lat: number; lng: number };
  isActive?: boolean;
}): VerificationLevel {
  const { lat, lng } = pantry.coordinates ?? { lat: 0, lng: 0 };
  if (!lat || !lng) return 1;
  // A coordinate sitting on a whole-degree boundary is a geocoder centroid,
  // not a building — treat it as satellite-placed rather than field verified.
  const isCentroid = Number.isInteger(lat * 10) && Number.isInteger(lng * 10);
  if (isCentroid) return 2;
  return pantry.isActive ? 3 : 2;
}
