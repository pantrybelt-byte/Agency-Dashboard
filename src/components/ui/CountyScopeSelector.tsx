import { useId } from 'react';
import { MapPin } from 'lucide-react';
import { ALL_COUNTIES } from '../../utils/scoping';

interface CountyScopeSelectorProps {
  /** Counties the signed-in user is permitted to see. */
  assignedCounties: string[];
  /** The user's region, used to name the "everything" option. */
  regionLabel: string;
  value: string;
  onChange: (county: string) => void;
  className?: string;
}

/**
 * Narrows the whole dashboard to one county, or widens it back to every
 * county the user is assigned.
 *
 * A native `<select>` is deliberate: it is keyboard- and screen-reader-correct
 * for free, and on mobile it gets the platform picker rather than a custom
 * popover that would need its own focus management.
 */
export const CountyScopeSelector = ({
  assignedCounties,
  regionLabel,
  value,
  onChange,
  className = '',
}: CountyScopeSelectorProps) => {
  const selectId = useId();
  const isScoped = value !== ALL_COUNTIES;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor={selectId} className="sr-only">
        Limit the dashboard to a single county
      </label>
      <div
        className={`flex items-center gap-1.5 rounded-xl border transition-colors ${
          isScoped
            ? 'bg-emerald-500/15 border-emerald-500/40'
            : 'bg-white/[0.04] border-white/[0.08]'
        }`}
      >
        <MapPin
          className={`w-3.5 h-3.5 ml-2.5 shrink-0 ${isScoped ? 'text-emerald-300' : 'text-slate-300'}`}
          aria-hidden="true"
        />
        <select
          id={selectId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`bg-transparent border-0 pr-2 py-2 pl-0 text-[12px] font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
            isScoped ? 'text-emerald-200' : 'text-slate-200'
          }`}
        >
          <option value={ALL_COUNTIES} className="bg-[#1a1d2e] text-white">
            All Assigned Counties ({regionLabel})
          </option>
          {assignedCounties.map((county) => (
            <option key={county} value={county} className="bg-[#1a1d2e] text-white">
              {county} County
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
