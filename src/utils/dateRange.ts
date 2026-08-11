import type { CustomDateRange, DateRangePreset } from '../types';

const MS_PER_DAY = 86_400_000;

const PRESET_DAYS: Record<'7d' | '30d' | '90d', number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export interface ResolvedDateRange {
  /** Inclusive start, YYYY-MM-DD. */
  startDate: string;
  /** Inclusive end, YYYY-MM-DD. */
  endDate: string;
  /** Inclusive start of the equally sized window immediately before. */
  previousStartDate: string;
  /** Inclusive end of the equally sized window immediately before. */
  previousEndDate: string;
  dayCount: number;
  label: string;
}

/** Format a Date as YYYY-MM-DD in UTC. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parse YYYY-MM-DD as UTC midnight, avoiding local-timezone drift. */
function fromISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Turn a UI preset into the concrete date window the data layer will query,
 * plus the equally sized preceding window that compare mode charts against.
 *
 * All arithmetic is in UTC so the result does not shift with the viewer's
 * timezone — an agency in Central Time and a reviewer in Eastern Time must see
 * the same numbers for "last 30 days".
 */
export function resolveDateRange(
  preset: DateRangePreset,
  custom: CustomDateRange | null,
  now: Date,
): ResolvedDateRange {
  const today = fromISODate(toISODate(now));

  let start: Date;
  let end: Date;
  let label: string;

  if (preset === 'custom' && custom) {
    start = fromISODate(custom.startDate);
    end = fromISODate(custom.endDate);
    if (start.getTime() > end.getTime()) {
      [start, end] = [end, start];
    }
    label = `${toISODate(start)} – ${toISODate(end)}`;
  } else if (preset === 'ytd') {
    start = fromISODate(`${today.getUTCFullYear()}-01-01`);
    end = today;
    label = 'Year to date';
  } else {
    // 'custom' without a range falls back to the 30d default.
    const days = PRESET_DAYS[preset === 'custom' ? '30d' : preset];
    end = today;
    start = addDays(today, -(days - 1));
    label = `Last ${days} days`;
  }

  const dayCount = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(dayCount - 1));

  return {
    startDate: toISODate(start),
    endDate: toISODate(end),
    previousStartDate: toISODate(previousStart),
    previousEndDate: toISODate(previousEnd),
    dayCount,
    label,
  };
}
