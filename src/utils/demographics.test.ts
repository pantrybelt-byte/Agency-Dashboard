import { describe, expect, it } from 'vitest';
import type { DemographicsData } from '../types';
import { mockDemographics } from '../data/mockData';
import {
  AGE_GROUP_CHILDREN,
  AGE_GROUP_SENIORS,
  VISITOR_TYPE_FIRST_TIME,
  averageHouseholdSize,
  countByAgeGroup,
  countByVisitorType,
  parseHouseholdBandMidpoint,
  totalIndividualsServed,
} from './demographics';

describe('parseHouseholdBandMidpoint', () => {
  it('averages a hyphenated range', () => {
    expect(parseHouseholdBandMidpoint('1-2 Persons')).toBe(1.5);
    expect(parseHouseholdBandMidpoint('3-4 Persons')).toBe(3.5);
  });

  it('averages an en-dashed range', () => {
    expect(parseHouseholdBandMidpoint('5–6 Persons')).toBe(5.5);
  });

  it('treats an open-ended band as half a person above its floor', () => {
    expect(parseHouseholdBandMidpoint('7+ Persons')).toBe(7.5);
  });

  it('returns null for an unparseable label', () => {
    expect(parseHouseholdBandMidpoint('Unknown')).toBeNull();
  });
});

describe('countByAgeGroup', () => {
  it('returns the count for a known group', () => {
    expect(countByAgeGroup(mockDemographics, AGE_GROUP_CHILDREN)).toBe(5486);
    expect(countByAgeGroup(mockDemographics, AGE_GROUP_SENIORS)).toBe(3114);
  });

  it('returns zero for a group that is absent', () => {
    expect(countByAgeGroup(mockDemographics, 'Martians')).toBe(0);
  });
});

describe('countByVisitorType', () => {
  it('returns the count for a known visitor type', () => {
    expect(countByVisitorType(mockDemographics, VISITOR_TYPE_FIRST_TIME)).toBe(2817);
  });
});

describe('totalIndividualsServed', () => {
  it('sums every age group', () => {
    expect(totalIndividualsServed(mockDemographics)).toBe(14827);
  });
});

describe('averageHouseholdSize', () => {
  it('weights band midpoints by household count', () => {
    // (3855*1.5 + 6672*3.5 + 3262*5.5 + 1038*7.5) / 14827 = 3.6999…
    expect(averageHouseholdSize(mockDemographics)).toBe(3.7);
  });

  it('ignores bands whose label cannot be parsed', () => {
    const data: DemographicsData = {
      ...mockDemographics,
      householdSizes: [
        { size: '1-2 Persons', count: 100, percentage: 50 },
        { size: 'Unknown', count: 100, percentage: 50 },
      ],
    };
    expect(averageHouseholdSize(data)).toBe(1.5);
  });

  it('returns zero rather than NaN when there are no households', () => {
    const data: DemographicsData = { ...mockDemographics, householdSizes: [] };
    expect(averageHouseholdSize(data)).toBe(0);
  });
});
