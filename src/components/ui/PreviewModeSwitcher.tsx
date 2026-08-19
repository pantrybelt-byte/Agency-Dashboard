/**
 * Demo preview switcher.
 *
 * Sits beside the data-source pill because both answer "what am I looking
 * at". Renders nothing once live data is on — see PreviewProvider for why
 * that boundary matters.
 *
 * Review mode is visually distinct from the agency personas on purpose. It is
 * the state where the product is lying to you (everything unlocked), so it
 * should never be mistaken for a customer's view.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Eye, ChevronDown, Check, Wrench, Building2 } from 'lucide-react';
import { usePreview } from '../../hooks/usePreview';

export const PreviewModeSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { available, personas, persona, selection, setSelection } = usePreview();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!available) return null;

  const isReview = selection === 'review';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Preview mode: ${persona.label}. Change what the dashboard shows.`}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
          isReview
            ? 'border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
            : 'border-white/[0.12] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
        }`}
      >
        {isReview ? (
          <Wrench className="h-3 w-3 shrink-0" aria-hidden="true" />
        ) : (
          <Eye className="h-3 w-3 shrink-0" aria-hidden="true" />
        )}
        <span className="max-w-[10rem] truncate">
          {isReview ? 'All modules' : `As ${persona.label}`}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Preview mode"
          className="absolute left-0 z-50 mt-2 w-[19rem] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161926] p-2 shadow-2xl"
        >
          <p className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Demo preview
          </p>

          {personas.map((option) => {
            const selected = option.id === selection;
            const review = option.id === 'review';

            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setSelection(option.id);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className={`flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition-colors cursor-pointer ${
                  selected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                }`}
              >
                {review ? (
                  <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" aria-hidden="true" />
                ) : (
                  <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                )}

                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[12px] font-semibold ${review ? 'text-violet-200' : 'text-slate-200'}`}
                  >
                    {option.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                    {option.detail}
                  </span>
                </span>

                {selected && (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                )}
              </button>
            );
          })}

          <p className="mt-1 border-t border-white/[0.08] px-3 pb-1 pt-2.5 text-[10px] leading-relaxed text-slate-500">
            Demo only. This control disappears once live data is connected, so it can never unlock
            a module for a real agency. County scope still follows your signed-in account.
          </p>
        </div>
      )}
    </div>
  );
};
