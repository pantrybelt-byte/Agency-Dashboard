import { describe, expect, it } from 'vitest';
import { alabamaCounties, getStatusFromScore } from './alabamaCounties';
import { alabamaCountyGeometry } from './alabamaGeometry';

describe('alabamaCounties dataset', () => {
  it('covers all 67 Alabama counties', () => {
    expect(alabamaCounties).toHaveLength(67);
  });

  it('has no duplicate FIPS codes', () => {
    const fips = alabamaCounties.map((county) => county.fips);
    expect(new Set(fips).size).toBe(fips.length);
  });

  it('has no duplicate ids', () => {
    const ids = alabamaCounties.map((county) => county.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses well-formed Alabama FIPS codes', () => {
    for (const county of alabamaCounties) {
      expect(county.fips).toMatch(/^01\d{3}$/);
    }
  });
});

describe('geometry join', () => {
  it('has geometry for every county in the dataset', () => {
    const missing = alabamaCounties
      .filter((county) => !alabamaCountyGeometry[county.fips])
      .map((county) => `${county.name} (${county.fips})`);
    expect(missing).toEqual([]);
  });

  it('has a dataset entry for every generated geometry', () => {
    const known = new Set(alabamaCounties.map((county) => county.fips));
    const orphans = Object.keys(alabamaCountyGeometry).filter((fips) => !known.has(fips));
    expect(orphans).toEqual([]);
  });

  it('agrees with the Census county name for every FIPS code', () => {
    const mismatches = alabamaCounties
      .filter((county) => {
        const censusName = alabamaCountyGeometry[county.fips]?.name;
        return censusName !== county.name.replace(/ County$/, '');
      })
      .map((county) => `${county.name} != ${alabamaCountyGeometry[county.fips]?.name}`);
    expect(mismatches).toEqual([]);
  });

  it('produces a non-trivial path for every county', () => {
    for (const [fips, geometry] of Object.entries(alabamaCountyGeometry)) {
      expect(geometry.d.length, `path for ${fips}`).toBeGreaterThan(20);
      expect(geometry.d.startsWith('M'), `path for ${fips}`).toBe(true);
    }
  });
});

describe('status consistency', () => {
  it("matches each county's stored status to its food access score", () => {
    const inconsistent = alabamaCounties
      .filter((county) => getStatusFromScore(county.foodAccessScore) !== county.status)
      .map((county) => `${county.name}: score ${county.foodAccessScore} stored as ${county.status}`);
    expect(inconsistent).toEqual([]);
  });
});
