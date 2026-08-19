/**
 * The entitlement gate for a purchasable module.
 *
 * Replaces FeatureGate, which was dead code carrying the retired tier
 * vocabulary and a second, divergent upgrade path. This one reads the same
 * entitlement source as the preset switcher and opens the same modal, so a
 * buyer meets one consistent story wherever they hit the wall.
 *
 * The locked state shows a blurred preview of the real module. Seeing the
 * shape of what you would get is the argument for buying it; an empty card
 * saying "upgrade" is not.
 *
 * The preview is height-capped. Left at its natural height the overlay
 * centred inside a two-thousand-pixel container, which put the pricing
 * button below the fold — the one control the locked state exists to offer.
 */
import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { UpgradeModal } from './UpgradeModal';
import { ACCENTS, formatPriceBand, getPreset, type PresetId } from '../../config/presets';
import { usePreset } from '../../hooks/usePreset';

interface ModuleGateProps {
  moduleId: PresetId;
  children: React.ReactNode;
}

export const ModuleGate: React.FC<ModuleGateProps> = ({ moduleId, children }) => {
  const { isUnlocked } = usePreset();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const preset = getPreset(moduleId);

  if (isUnlocked(moduleId)) return <>{children}</>;

  const accent = ACCENTS[preset.accent];
  const Icon = preset.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-[#12141f]">
      {/* Preview of the real module, blurred, inert, and height-capped. */}
      <div
        aria-hidden="true"
        className="pointer-events-none max-h-[440px] select-none overflow-hidden opacity-[0.12] blur-[3px]"
      >
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-[#0f1117]/70 p-6">
        <div className="max-w-md space-y-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
            <Lock className="h-6 w-6 text-amber-400" aria-hidden="true" />
          </span>

          <div>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
              Locked add-on module
            </span>
            <h2 className="mt-2.5 flex items-center justify-center gap-2 text-lg font-bold text-white">
              <Icon className={`h-4 w-4 ${accent.text}`} aria-hidden="true" />
              {preset.name}
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-300">{preset.summary}</p>
            <p className="mt-2 font-mono text-[12px] text-slate-400">{formatPriceBand(preset)}</p>
          </div>

          <button
            type="button"
            onClick={() => setShowUpgrade(true)}
            className="mx-auto flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-[13px] font-bold text-[#180f00] transition-colors hover:bg-amber-400 cursor-pointer"
          >
            View module pricing
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <UpgradeModal preset={showUpgrade ? preset : null} onClose={() => setShowUpgrade(false)} />
    </div>
  );
};
