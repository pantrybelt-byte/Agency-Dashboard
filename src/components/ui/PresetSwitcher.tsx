/**
 * The buyer-view switcher.
 *
 * Built as a real listbox rather than a div stack: arrow keys move, Enter and
 * Space select, Escape closes and returns focus to the trigger.
 *
 * Locked options are deliberately NOT marked `aria-disabled`. They are fully
 * operable — activating one opens the upgrade dialog, which is how a buyer
 * finds out what the module costs. Announcing "dimmed" or "unavailable" would
 * tell a screen-reader user the control does nothing, when in fact it is the
 * entire sales path. The lock is carried in the accessible name and by
 * `aria-haspopup="dialog"` instead.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Lock, Check } from 'lucide-react';
import { ACCENTS, VIEW_PRESETS, formatPriceBand, type PresetId } from '../../config/presets';
import { usePreset } from '../../hooks/usePreset';

export const PresetSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { preset, presetId, selectPreset, isUnlocked } = usePreset();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const accent = ACCENTS[preset.accent];
  const TriggerIcon = preset.icon;

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const openMenu = () => {
    setActiveIndex(Math.max(0, VIEW_PRESETS.findIndex((p) => p.id === presetId)));
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (id: PresetId) => {
    selectPreset(id);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onListKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % VIEW_PRESETS.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + VIEW_PRESETS.length) % VIEW_PRESETS.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(VIEW_PRESETS.length - 1);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closeMenu() : openMenu())}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors cursor-pointer ${accent.border} ${accent.bg} ${accent.text} hover:brightness-125`}
      >
        <TriggerIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="max-w-[9rem] truncate">{preset.shortName}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Dashboard view preset"
          onKeyDown={onListKeyDown}
          className="absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161926] p-2 shadow-2xl"
        >
          <p className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Subscription view presets
          </p>

          {VIEW_PRESETS.map((item, index) => {
            const unlocked = isUnlocked(item.id);
            const selected = item.id === presetId;
            const itemAccent = ACCENTS[item.accent];
            const ItemIcon = item.icon;

            return (
              <button
                key={item.id}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type="button"
                role="option"
                aria-selected={selected}
                aria-haspopup={unlocked ? undefined : 'dialog'}
                aria-label={
                  unlocked
                    ? `${item.name}, included, ${formatPriceBand(item)}`
                    : `${item.name}, locked add-on module, ${formatPriceBand(item)}, opens upgrade options`
                }
                tabIndex={index === activeIndex ? 0 : -1}
                onClick={() => choose(item.id)}
                onFocus={() => setActiveIndex(index)}
                className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors cursor-pointer ${
                  selected ? `${itemAccent.bg}` : 'hover:bg-white/[0.04]'
                }`}
              >
                <ItemIcon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${unlocked ? itemAccent.text : 'text-slate-500'}`}
                  aria-hidden="true"
                />

                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[12px] font-semibold ${selected ? itemAccent.text : 'text-slate-200'}`}
                  >
                    {item.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                    {formatPriceBand(item)}
                  </span>
                </span>

                <span className="shrink-0 pt-0.5">
                  {selected ? (
                    <Check className={`h-3.5 w-3.5 ${itemAccent.text}`} aria-hidden="true" />
                  ) : unlocked ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      Included
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                      Locked
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
