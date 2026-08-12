/**
 * County-scope and demographic-segment maths.
 *
 * Kept as pure functions so the narrowing rules are testable on their own —
 * these are the numbers an agency reports to a funder, so "roughly right" is
 * not good enough.
 */
import type {
  DailyInteractionData,
  DemographicSegment,
  DemographicsData,
  PantryMetric,
  RegionSummary,
  TimeSeriesDataPoint,
} from '../types';
import { AGE_GROUP_CHILDREN, AGE_GROUP_SENIORS } from './demographics';

/** Sentinel meaning "every county the signed-in user is assigned to". */
export const ALL_COUNTIES = 'all';

export interface SegmentDefinition {
  value: DemographicSegment;
  label: string;
  /** Short description used as the accessible hint on the filter control. */
  description: string;
}

export const DEMOGRAPHIC_SEGMENTS: SegmentDefinition[] = [
  { value: 'all', label: 'All Families', description: 'Every household served' },
  { value: 'children', label: 'Children 0–17', description: 'Households including a child under 18' },
  { value: 'seniors', label: 'Seniors 60+', description: 'Households including an adult aged 60 or over' },
  { value: 'first-time', label: 'First-Time', description: 'Households receiving assistance for the first time' },
  { value: 'emergency', label: 'Emergency', description: 'Households served through emergency distribution' },
];

export function segmentLabel(segment: DemographicSegment): string {
  return DEMOGRAPHIC_SEGMENTS.find((entry) => entry.value === segment)?.label ?? 'All Families';
}

/**
 * The age-group slice each segment maps onto, for highlighting. `undefined`
 * means the segment is not defined by age, so no age slice should be singled
 * out.
 */
export const AGE_GROUP_FOR_SEGMENT: Record<DemographicSegment, string | undefined> = {
  all: undefined,
  children: AGE_GROUP_CHILDREN,
  seniors: AGE_GROUP_SENIORS,
  'first-time': undefined,
  emergency: undefined,
};

/** The visitor-type slice each segment maps onto, for highlighting. */
export const VISITOR_TYPE_FOR_SEGMENT: Record<DemographicSegment, string | undefined> = {
  all: undefined,
  children: undefined,
  seniors: undefined,
  'first-time': 'First-Time',
  emergency: 'Emergency',
};

/**
 * Share of the served population a segment represents, derived from the
 * demographic breakdown rather than hardcoded.
 *
 * Returns 1 for 'all'. Segments are *overlapping* cohorts of the same
 * population (a first-time household may also include a child), so these
 * shares intentionally do not sum to 1.
 */
export function segmentShare(data: DemographicsData, segment: DemographicSegment): number {
  if (segment === 'all') return 1;

  const totalIndividuals = data.ageGroups.reduce((sum, entry) => sum + entry.count, 0);
  const totalVisitors = data.visitorTypes.reduce((sum, entry) => sum + entry.count, 0);

  const shareOfAgeGroup = (group: string) => {
    if (totalIndividuals === 0) return 0;
    return (data.ageGroups.find((entry) => entry.group === group)?.count ?? 0) / totalIndividuals;
  };

  const shareOfVisitorType = (type: string) => {
    if (totalVisitors === 0) return 0;
    return (data.visitorTypes.find((entry) => entry.type === type)?.count ?? 0) / totalVisitors;
  };

  switch (segment) {
    case 'children':
      return shareOfAgeGroup(AGE_GROUP_CHILDREN);
    case 'seniors':
      return shareOfAgeGroup(AGE_GROUP_SENIORS);
    case 'first-time':
      return shareOfVisitorType('First-Time');
    case 'emergency':
      return shareOfVisitorType('Emergency');
    default:
      return 1;
  }
}

/** Counties the user may see, narrowed by the active scope. */
export function resolveVisibleCounties(assignedCounties: string[], countyScope: string): string[] {
  if (countyScope === ALL_COUNTIES) return assignedCounties;
  return assignedCounties.includes(countyScope) ? [countyScope] : [];
}

export function filterPantriesByScope(pantries: PantryMetric[], visibleCounties: string[]): PantryMetric[] {
  return pantries.filter((pantry) => visibleCounties.includes(pantry.county));
}

/**
 * Recompute the region summary from whatever pantries are in scope.
 *
 * The trend percentages stay as supplied: a trend is a property of the time
 * series, not something that can be re-derived from a single period's totals.
 */
export function summarisePantries(
  pantries: PantryMetric[],
  base: RegionSummary,
  segment: DemographicSegment,
  segmentFraction: number,
): RegionSummary {
  const totalFamiliesServed = pantries.reduce((sum, pantry) => sum + pantry.familiesServed, 0);
  const totalItemsDistributed = pantries.reduce((sum, pantry) => sum + pantry.totalItemsDistributed, 0);
  const activePantries = pantries.filter((pantry) => pantry.isActive).length;
  const scale = segment === 'all' ? 1 : segmentFraction;

  return {
    ...base,
    totalPantries: pantries.length,
    activePantries,
    totalFamiliesServed: Math.round(totalFamiliesServed * scale),
    totalItemsDistributed: Math.round(totalItemsDistributed * scale),
  };
}

/**
 * Narrow a time series to the requested window and cohort.
 *
 * Demonstration data holds a fixed 30-point series, so a 7-day request takes
 * the trailing 7 points and a 90-day request cannot invent more than 30. Live
 * rollups will be queried by date instead; this keeps the control meaningful
 * in the meantime.
 */
export function scaleSeries(
  series: TimeSeriesDataPoint[],
  dayCount: number,
  segmentFraction: number,
): TimeSeriesDataPoint[] {
  const windowed = series.slice(Math.max(0, series.length - dayCount));
  if (segmentFraction === 1) return windowed;

  return windowed.map((point) => ({
    ...point,
    value: Math.round(point.value * segmentFraction),
    previousValue:
      point.previousValue === undefined ? undefined : Math.round(point.previousValue * segmentFraction),
  }));
}

/** Same windowing rule as `scaleSeries`, for the interaction rollups. */
export function windowInteractions(
  interactions: DailyInteractionData[],
  dayCount: number,
): DailyInteractionData[] {
  return interactions.slice(Math.max(0, interactions.length - dayCount));
}

/**
 * Proportion of a whole-region figure attributable to the counties in scope,
 * weighted by families served. Used for figures the dashboard only has at
 * region level.
 */
export function countyWeight(allPantries: PantryMetric[], scopedPantries: PantryMetric[]): number {
  const total = allPantries.reduce((sum, pantry) => sum + pantry.familiesServed, 0);
  if (total === 0) return 0;
  const scoped = scopedPantries.reduce((sum, pantry) => sum + pantry.familiesServed, 0);
  return scoped / total;
}
