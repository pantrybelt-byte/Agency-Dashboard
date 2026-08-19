/**
 * The single upgrade path.
 *
 * Previously there were two of these — one inline in the header, one inline
 * in FeatureGate — with different copy, different buttons, and one of them
 * confirming via `alert()`. A buyer who hits the gate from the preset menu
 * and again from a locked chart should not see two different products.
 *
 * Accessibility: this is a real dialog. It traps focus, restores it on close,
 * closes on Escape, and labels itself from its own heading. A div with a
 * dark overlay is not a modal to a screen reader.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, Check, CalendarClock, ArrowRight, X, FileText } from 'lucide-react';
import { ACCENTS, formatPriceBand, type ViewPreset } from '../../config/presets';

interface UpgradeModalProps {
  preset: ViewPreset | null;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ preset, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [demoRequested, setDemoRequested] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  const open = preset !== null;

  const handleClose = useCallback(() => {
    setSubmitted(false);
    setDemoRequested(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restoreFocusTo.current?.focus();
    };
  }, [open, handleClose]);

  if (!preset) return null;

  const accent = ACCENTS[preset.accent];
  const PresetIcon = preset.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        aria-describedby="upgrade-modal-description"
        onClick={(event) => event.stopPropagation()}
        className="animate-fade-in-up w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#161926] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
              <Lock className="h-5 w-5 text-amber-400" aria-hidden="true" />
            </span>
            <div>
              <h2 id="upgrade-modal-title" className="text-base font-bold tracking-tight text-white">
                Unlock premium analytics module
              </h2>
              <p id="upgrade-modal-description" className="mt-0.5 text-[12px] text-slate-300">
                Real-time compliance reporting, SDOH audit feeds, and automated grant exports.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close upgrade dialog"
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Which module, and who it is built for */}
        <div className={`rounded-xl border ${accent.border} ${accent.bg} p-4`}>
          <div className="flex items-center gap-2">
            <PresetIcon className={`h-4 w-4 shrink-0 ${accent.text}`} aria-hidden="true" />
            <h3 className={`text-[13px] font-bold ${accent.text}`}>{preset.name}</h3>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-slate-300">{preset.summary}</p>
          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-white/[0.08] pt-3 text-[11px] sm:grid-cols-2">
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-slate-400">Built for</dt>
              <dd className="text-right text-slate-200 sm:mt-0.5 sm:text-left">{preset.buyer}</dd>
            </div>
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-slate-400">Typical contract</dt>
              <dd className="text-right font-mono text-slate-200 sm:mt-0.5 sm:text-left">
                {formatPriceBand(preset)}
              </dd>
            </div>
          </dl>
        </div>

        <ul className="my-5 space-y-2">
          {preset.focus.map((item) => (
            <li key={item} className="flex items-center gap-2 text-[12px] text-slate-300">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mb-5 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-[12px]">
          <span className="text-slate-400">Invoicing</span>
          <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            QuickBooks Net-30 or Stripe
          </span>
        </div>

        {submitted ? (
          <p
            role="status"
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center text-[12px] font-semibold text-emerald-300"
          >
            Upgrade request sent. Our account team will issue your QuickBooks Net-30 invoice.
          </p>
        ) : demoRequested ? (
          <p
            role="status"
            className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 text-center text-[12px] font-semibold text-sky-300"
          >
            Demo request received. We will email you scheduling options within one business day.
          </p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-[13px] font-bold text-[#04140d] transition-colors hover:bg-emerald-400"
            >
              Request module upgrade
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setDemoRequested(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[13px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Schedule 15-min demo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
