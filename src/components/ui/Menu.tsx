import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

interface MenuProps {
  /** Accessible name for the trigger button. */
  label: string;
  /** Visual content of the trigger. */
  trigger: React.ReactNode;
  triggerClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  /**
   * Receives a `close` callback so items can dismiss the menu when activated.
   * Pass `false` when the action moves focus elsewhere (a route change, say)
   * so focus is not yanked back to the trigger.
   */
  children: (close: (returnFocus?: boolean) => void) => React.ReactNode;
}

/**
 * Accessible popover menu.
 *
 * Closes on Escape and on outside click, returns focus to the trigger, and
 * supports arrow-key navigation between items. Items should carry
 * role="menuitem" — `Menu.Item` below does that for you.
 */
export const Menu = ({
  label,
  trigger,
  triggerClassName = '',
  menuClassName = '',
  align = 'right',
  children,
}: MenuProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(
    (returnFocus = true) => {
      setOpen(false);
      if (returnFocus) triggerRef.current?.focus();
    },
    [],
  );

  // Dismiss when a click or focus lands outside the menu entirely.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  // Move focus to the first item once the menu is on screen.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Tab') return;

    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (items.length === 0) return;

    // Tab out of a menu closes it, which is what screen-reader users expect.
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }

    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const next = (current + delta + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 bg-[#1a1d2e] border border-white/[0.12] rounded-xl shadow-xl z-50 overflow-hidden ${menuClassName}`}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
};

interface MenuItemProps {
  onSelect?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}

export const MenuItem: React.FC<MenuItemProps> = ({ onSelect, icon, children, variant = 'default' }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onSelect}
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-400 ${
      variant === 'danger'
        ? 'text-red-300 hover:bg-red-500/10'
        : 'text-slate-200 hover:bg-white/[0.06]'
    }`}
  >
    {icon}
    {children}
  </button>
);
