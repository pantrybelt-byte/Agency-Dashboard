import { describe, expect, it } from 'vitest';
import { alabamaCounties } from '../data/alabamaCounties';
import { countyIdsForNames, normaliseCountyKey, resolveVisibleCounties } from './scoping';

/**
 * The county-scope control speaks in bare names ('Lowndes') while the
 * choropleth speaks in ids ('lowndes'). When this join breaks the map silently
 * stops responding to the scope selector, which is exactly the failure this
 * suite exists to catch.
 */
describe('normaliseCountyKey', () => {
  it('reduces a display name and a scope name to the same key', () => {
    expect(normaliseCountyKey('Lowndes County')).toBe(normaliseCountyKey('Lowndes'));
  });

  it('survives punctuation and internal capitals', () => {
    expect(normaliseCountyKey('St. Clair County')).toBe('stclair');
    expect(normaliseCountyKey('DeKalb')).toBe('dekalb');
  });
});

describe('countyIdsForNames', () => {
  it('maps every assigned county name onto a real county id', () => {
    const assigned = ['Montgomery', 'Autauga', 'Elmore', 'Lowndes', 'Macon', 'Dallas', 'Wilcox', 'Perry'];
    const ids = countyIdsForNames(alabamaCounties, assigned);

    expect(ids).toHaveLength(assigned.length);
    expect(ids).toContain('lowndes');
    // Every id returned must exist in the dataset the map renders from.
    const known = new Set(alabamaCounties.map((county) => county.id));
    expect(ids.every((id) => known.has(id))).toBe(true);
  });

  it('resolves the punctuated and camel-cased names too', () => {
    expect(countyIdsForNames(alabamaCounties, ['St. Clair', 'DeKalb'])).toEqual(['stclair', 'dekalb']);
  });

  it('drops an unknown name rather than passing it through', () => {
    // A name that leaked through would match no county and widen the map back
    // to the whole state, so dropping it is the safe failure.
    expect(countyIdsForNames(alabamaCounties, ['Lowndes', 'Nowhere'])).toEqual(['lowndes']);
  });

  it('narrows to a single id when the dashboard is scoped to one county', () => {
    const assigned = ['Montgomery', 'Lowndes', 'Dallas'];
    const scoped = resolveVisibleCounties(assigned, 'Lowndes');
    expect(countyIdsForNames(alabamaCounties, scoped)).toEqual(['lowndes']);
  });

  it('cannot widen scope beyond the assigned counties', () => {
    // Scoping is a filter, never a grant: asking for a county the agency is
    // not assigned must yield nothing rather than that county.
    const scoped = resolveVisibleCounties(['Montgomery', 'Lowndes'], 'Jefferson');
    expect(countyIdsForNames(alabamaCounties, scoped)).toEqual([]);
  });
});
