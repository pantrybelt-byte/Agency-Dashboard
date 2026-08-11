import type { DemographicsData } from '../types';

// The dataset uses en-dashes (U+2013) inside these labels, not hyphens.
export const AGE_GROUP_CHILDREN = 'Children (0–17)';
export const AGE_GROUP_ADULTS = 'Adults (18–59)';
export const AGE_GROUP_SENIORS = 'Seniors (60+)';

export const VISITOR_TYPE_FIRST_TIME = 'First-Time';

/**
 * Turn a household-size band label into the representative size used for
 * weighted averaging. Handles '1-2 Persons', '5–6 Persons' and '7+ Persons'.
 * Returns null when the label cannot be interpreted, so callers can skip it
 * rather than poisoning the average with NaN.
 */
export function parseHouseholdBandMidpoint(label: string): number | null {
  const openEnded = /^(\d+)\+/.exec(label);
  if (openEnded) return Number(openEnded[1]) + 0.5;

  const range = /^(\d+)\s*[-–]\s*(\d+)/.exec(label);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;

  const single = /^(\d+)/.exec(label);
  if (single) return Number(single[1]);

  return null;
}

export function countByAgeGroup(data: DemographicsData, group: string): number {
  return data.ageGroups.find((entry) => entry.group === group)?.count ?? 0;
}

export function countByVisitorType(data: DemographicsData, type: string): number {
  return data.visitorTypes.find((entry) => entry.type === type)?.count ?? 0;
}

export function totalIndividualsServed(data: DemographicsData): number {
  return data.ageGroups.reduce((sum, entry) => sum + entry.count, 0);
}

/** Weighted mean household size, rounded to one decimal place. */
export function averageHouseholdSize(data: DemographicsData): number {
  let weighted = 0;
  let households = 0;

  for (const band of data.householdSizes) {
    const midpoint = parseHouseholdBandMidpoint(band.size);
    if (midpoint === null) continue;
    weighted += midpoint * band.count;
    households += band.count;
  }

  if (households === 0) return 0;
  return Math.round((weighted / households) * 10) / 10;
}
