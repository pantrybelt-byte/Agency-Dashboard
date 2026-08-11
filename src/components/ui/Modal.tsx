import React, { useCallback, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional icon rendered beside the title. */
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Accessible dialog: labelled, modal to assistive technology, focus-trapped,
 * dismissible with Escape or a backdrop click, and returns focus to whatever
 * opened it.
 */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, icon, children, className = '' }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Remember the opener so focus can go back to it, and move focus into the
  // dialog so the next Tab lands inside rather than behind it.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialogRef.current)?.focus();

    return () => {
      previouslyFocused.current?.focus();
    };
  }, [open]);

  // While a modal is open the page behind it must not scroll.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Wrap at both ends so Tab can never escape the dialog.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`bg-[#1a1d2e] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/[0.12] animate-fade-in-up ${className}`}
      >
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <h2 id={titleId} className="text-base font-semibold text-white truncate">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};
