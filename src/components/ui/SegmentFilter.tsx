import { Users } from 'lucide-react';
import type { DemographicSegment } from '../../types';
import { DEMOGRAPHIC_SEGMENTS } from '../../utils/scoping';

interface SegmentFilterProps {
  value: DemographicSegment;
  onChange: (segment: DemographicSegment) => void;
  className?: string;
}

/**
 * Narrows a page's figures to one demographic cohort.
 *
 * Rendered as a labelled radio group rather than a row of buttons: the options
 * are mutually exclusive, so radio semantics let a screen-reader user hear
 * "3 of 5" and arrow between them, which `aria-pressed` buttons do not give.
 */
export const SegmentFilter = ({ value, onChange, className = '' }: SegmentFilterProps) => (
  <fieldset
    className={`flex flex-wrap items-center gap-2 border-0 p-0 m-0 ${className}`}
  >
    <legend className="sr-only">Filter figures by demographic segment</legend>
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
      <Users className="w-3.5 h-3.5" aria-hidden="true" />
      Segment:
    </span>

    {DEMOGRAPHIC_SEGMENTS.map((segment) => {
      const isActive = value === segment.value;
      return (
        <label
          key={segment.value}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer border has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-400 ${
            isActive
              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
              : 'text-slate-300 hover:text-white bg-white/[0.03] border-white/[0.08] hover:border-white/[0.16]'
          }`}
          title={segment.description}
        >
          <input
            type="radio"
            name="demographic-segment"
            value={segment.value}
            checked={isActive}
            onChange={() => onChange(segment.value)}
            className="sr-only"
          />
          {segment.label}
        </label>
      );
    })}
  </fieldset>
);
