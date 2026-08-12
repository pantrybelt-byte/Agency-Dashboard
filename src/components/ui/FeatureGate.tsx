import React, { useState } from 'react';
import { Lock, Sparkles, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import type { SubscriptionTier } from '../../types';

interface FeatureGateProps {
  requiredTier: 'pro' | 'enterprise';
  userTier?: SubscriptionTier;
  featureName: string;
  featureDescription: string;
  children: React.ReactNode;
}

const tierHierarchy: Record<SubscriptionTier, number> = {
  community: 1,
  pro: 2,
  enterprise: 3,
};

export const FeatureGate: React.FC<FeatureGateProps> = ({
  requiredTier,
  // Default to the lowest tier: an unset subscription must not unlock paid
  // features. Failing closed is the only safe default for an entitlement gate.
  userTier = 'community',
  featureName,
  featureDescription,
  children,
}) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const userLevel = tierHierarchy[userTier];
  const requiredLevel = tierHierarchy[requiredTier];

  // If user has sufficient tier, render feature normally!
  if (userLevel >= requiredLevel) {
    return <>{children}</>;
  }

  // If locked, render sleek Glass Lock Overlay!
  return (
    <div className="relative rounded-2xl border border-amber-500/30 bg-[#12141f] p-6 text-center overflow-hidden">
      {/* Blurred background preview */}
      <div className="absolute inset-0 opacity-15 pointer-events-none filter blur-sm">
        {children}
      </div>

      <div className="relative z-10 max-w-md mx-auto py-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
          <Lock className="w-6 h-6" />
        </div>

        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            {requiredTier.toUpperCase()} TIER FEATURE
          </span>
          <h3 className="text-lg font-bold text-white mt-2">{featureName}</h3>
          <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">{featureDescription}</p>
        </div>

        <button
          onClick={() => setShowUpgradeModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[13px] font-bold hover:from-amber-600 hover:to-orange-700 transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mx-auto"
        >
          <Sparkles className="w-4 h-4" />
          Unlock {requiredTier === 'pro' ? 'Regional Pro' : 'Enterprise'} Tier
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Upgrade Request Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1a1d2e] border border-white/[0.12] rounded-2xl max-w-lg w-full p-6 text-left shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Upgrade Agency Plan</h3>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-[13px] text-slate-300 mb-4">
              Your account is currently on the <span className="text-amber-400 font-bold uppercase">{userTier}</span> tier. Upgrade to <span className="text-emerald-400 font-bold uppercase">{requiredTier}</span> to unlock:
            </p>

            <div className="space-y-2 mb-6 text-[12px] text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Multi-County Regional Scoping (Up to 10 Counties)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Statewide 67-County Alabama SVG Vector Heatmap</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automated Email Report Scheduling & USDA Grant PDF Export</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Real-Time GIS Pantry Coordinate Mapping & Live Alerts</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
              <div>
                <p className="text-[13px] font-bold text-white">Regional Pro Plan</p>
                <p className="text-[11px] text-slate-400">$1,500 / month ($18,000/yr)</p>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg">
                Grant Eligible
              </span>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2 text-[12px] text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert('Upgrade request sent to AccessBelt Partner Success team!');
                  setShowUpgradeModal(false);
                }}
                className="px-4 py-2 text-[12px] font-bold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Request Agency Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
