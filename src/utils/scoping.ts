/**
 * County-scope and demographic-segment maths.
 *
 * Kept as pure functions so the narrowing rules are testable on their own —
 * these are the numbers an agency reports to a funder, so "roughly right" is
 * not good enough.
 */
import type { DemographicSegment, DemographicsData } from '../types';
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

/**
 * The per-pantry summing, series windowing and county weighting that used to
 * live here are gone: they existed because the dashboard held one fixed
 * 30-point series and had to approximate any other window from it. The data
 * layer now queries the requested window directly, so those approximations
 * would only be a second, disagreeing answer. See `utils/analytics.ts`.
 */

/**
 * County-scope names and choropleth county records use different vocabularies:
 * `assignedCounties` holds bare names ('Lowndes'), the map dataset holds
 * `id: 'lowndes'` and `name: 'Lowndes County'`. Normalising both sides means
 * the join survives punctuation ('St. Clair') and casing ('DeKalb') without
 * depending on the id convention holding.
 */
export function normaliseCountyKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+county$/, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Translate county-scope names into the ids used by the choropleth dataset.
 * Names with no matching county are dropped rather than passed through, so a
 * typo narrows the map to nothing visible instead of silently widening it.
 */
export function countyIdsForNames(
  counties: { id: string; name: string }[],
  names: string[],
): string[] {
  const byKey = new Map(counties.map((county) => [normaliseCountyKey(county.name), county.id]));
  const ids: string[] = [];
  for (const name of names) {
    const id = byKey.get(normaliseCountyKey(name));
    if (id) ids.push(id);
  }
  return ids;
}
