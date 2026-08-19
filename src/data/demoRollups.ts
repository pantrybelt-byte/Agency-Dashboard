/**
 * Demonstration rollups, generated to the same shape Cloud Functions will write.
 *
 * Two things make this worth having rather than shipping a static array:
 *
 * 1. **The date picker becomes real without a database.** Rollups are produced
 *    per county per day on demand, so "last 7 days" genuinely reads seven days
 *    and "year to date" genuinely reads the year. Previously the picker moved
 *    one chart because the demo data was a fixed 30-point array.
 *
 * 2. **The demo never goes stale.** Everything is generated relative to the
 *    current date, so a demo opened next March shows this March. The old fixed
 *    July 2026 strings would have quietly aged into an obvious liability.
 *
 * Values are deterministic: the seed for a document is derived from its county
 * and date, so the same day always produces the same numbers for everyone
 * looking at the same dashboard, and any window can be generated without
 * materialising the ones around it.
 */
import type { CountyDailyDoc, PantryDailyDoc } from './schema';
import { mockCategoryBreakdown, mockDemographics, mockPantryMetrics, mockRequestedItems } from './mockData';

// ---------------------------------------------------------------------------
// Deterministic noise
// ---------------------------------------------------------------------------

/** FNV-1a. Cheap, well-distributed, and stable across runs and machines. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A repeatable value in [0, 1) for one named quantity on one document. */
function jitter(key: string): number {
  const h = hash(key);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

const MS_PER_DAY = 86_400_000;

function fromISO(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Inclusive list of ISO dates. Guards against an inverted or absurd range. */
export function datesBetween(startDate: string, endDate: string): string[] {
  const start = fromISO(startDate).getTime();
  const end = fromISO(endDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];

  const days = Math.min(Math.round((end - start) / MS_PER_DAY) + 1, 400);
  return Array.from({ length: days }, (_, i) => toISO(new Date(start + i * MS_PER_DAY)));
}

// ---------------------------------------------------------------------------
// Region-level baselines, taken from the figures the dashboard already shows
// ---------------------------------------------------------------------------

/**
 * Daily regional averages chosen so a default 30-day, all-counties view lands
 * on the same order of magnitude the dashboard displayed before rollups
 * existed. Changing what the demo *says* was not part of this work; only where
 * it comes from.
 */
const REGION_DAILY = {
  families: 494,
  items: 6_214,
  visits: 810,
  checkIns: 180,
  itemScans: 320,
  notificationViews: 450,
  searches: 95,
  directions: 65,
} as const;

/**
 * Share of regional activity per county, weighted by the families each
 * county's pantries serve. Derived rather than typed so adding a pantry to the
 * directory automatically shifts the county mix.
 */
const COUNTY_WEIGHTS: Record<string, number> = (() => {
  const totals: Record<string, number> = {};
  let sum = 0;
  for (const pantry of mockPantryMetrics) {
    totals[pantry.county] = (totals[pantry.county] ?? 0) + pantry.familiesServed;
    sum += pantry.familiesServed;
  }
  if (sum === 0) return {};
  for (const county of Object.keys(totals)) totals[county] /= sum;
  return totals;
})();

export const DEMO_COUNTIES: string[] = Object.keys(COUNTY_WEIGHTS).sort();

/** ZIP codes belonging to each county, from the demographic breakdown. */
const ZIPS_BY_COUNTY: Record<string, { zip: string; share: number }[]> = (() => {
  const byCounty: Record<string, { zip: string; families: number }[]> = {};
  for (const entry of mockDemographics.zipCodeBreakdown) {
    (byCounty[entry.county] ??= []).push({ zip: entry.zip, families: entry.familiesServed });
  }

  const result: Record<string, { zip: string; share: number }[]> = {};
  for (const [county, entries] of Object.entries(byCounty)) {
    const total = entries.reduce((sum, entry) => sum + entry.families, 0) || 1;
    result[county] = entries.map((entry) => ({ zip: entry.zip, share: entry.families / total }));
  }
  return result;
})();

/** Composition shares, normalised from the demographic mock so they total 1. */
function shares(entries: { key: string; count: number }[]): { key: string; share: number }[] {
  const total = entries.reduce((sum, entry) => sum + entry.count, 0) || 1;
  return entries.map((entry) => ({ key: entry.key, share: entry.count / total }));
}

const AGE_SHARES = shares(mockDemographics.ageGroups.map((e) => ({ key: e.group, count: e.count })));
const VISITOR_SHARES = shares(mockDemographics.visitorTypes.map((e) => ({ key: e.type, count: e.count })));
const HOUSEHOLD_SHARES = shares(mockDemographics.householdSizes.map((e) => ({ key: e.size, count: e.count })));
const ETHNICITY_SHARES = shares(
  mockDemographics.ethnicityBreakdown.map((e) => ({ key: e.category, count: e.percentage })),
);
const CATEGORY_SHARES = shares(mockCategoryBreakdown.map((e) => ({ key: e.category, count: e.value })));
const ITEM_SHARES = shares(mockRequestedItems.map((e) => ({ key: e.id, count: e.requestCount })));

/**
 * Per-item growth, so the trend arrows on Most Requested are computed from the
 * series rather than typed next to it. Expressed as a multiplier applied per
 * day of age: an item flagged "rising 18%" in the catalogue grows across the
 * window instead of merely claiming to.
 */
const ITEM_DRIFT: Record<string, number> = Object.fromEntries(
  mockRequestedItems.map((item) => [item.id, item.trendPercentage / 100 / 30]),
);

// ---------------------------------------------------------------------------
// Day shaping
// ---------------------------------------------------------------------------

/**
 * Weekday rhythm and a slow upward drift. Pantry traffic is genuinely lower at
 * weekends, and a flat series reads as synthetic the moment anyone looks at it.
 */
function dayShape(date: string, seedKey: string): number {
  const day = fromISO(date).getUTCDay();
  const isWeekend = day === 0 || day === 6;
  const weekday = isWeekend ? 0.62 : 1.0;

  // Drift is anchored to the calendar, not to the window, so a 7-day view and
  // a 90-day view agree about what happened on any given day.
  const ageDays = Math.round((Date.now() - fromISO(date).getTime()) / MS_PER_DAY);
  const drift = 1 + Math.max(-0.25, Math.min(0.25, -ageDays / 900));

  const noise = 0.86 + jitter(seedKey) * 0.28;
  return weekday * drift * noise;
}

function spread(total: number, entries: { key: string; share: number }[], seedKey: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const entry of entries) {
    const wobble = 0.92 + jitter(`${seedKey}|${entry.key}`) * 0.16;
    result[entry.key] = Math.round(total * entry.share * wobble);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Document builders
// ---------------------------------------------------------------------------

/** One `rollupsCountyDaily` document, generated on demand. */
export function buildCountyDaily(county: string, date: string): CountyDailyDoc {
  const weight = COUNTY_WEIGHTS[county] ?? 0;
  const key = `${county}|${date}`;
  const shape = dayShape(date, key);

  const familiesServed = Math.round(REGION_DAILY.families * weight * shape);
  const itemsDistributed = Math.round(REGION_DAILY.items * weight * shape);
  const visits = Math.round(REGION_DAILY.visits * weight * shape);

  // Individuals track families at the magnitude the dashboard already reports,
  // so the age breakdown keeps summing to the figure people recognise.
  const individualsServed = familiesServed;

  const zipEntries = ZIPS_BY_COUNTY[county] ?? [];
  const zips: Record<string, number> = {};
  for (const entry of zipEntries) {
    zips[entry.zip] = Math.round(familiesServed * entry.share * (0.9 + jitter(`${key}|${entry.zip}`) * 0.2));
  }

  // Item demand drifts per item across the window, which is what makes the
  // Most Requested trends and sparklines real rather than decorative.
  const ageDays = Math.round((Date.now() - fromISO(date).getTime()) / MS_PER_DAY);
  const items: Record<string, number> = {};
  for (const entry of ITEM_SHARES) {
    const drift = Math.max(0.2, 1 - (ITEM_DRIFT[entry.key] ?? 0) * ageDays);
    const wobble = 0.9 + jitter(`${key}|item|${entry.key}`) * 0.2;
    items[entry.key] = Math.round(itemsDistributed * entry.share * drift * wobble * 0.35);
  }

  return {
    county,
    date,
    familiesServed,
    individualsServed,
    itemsDistributed,
    visits,
    checkIns: Math.round(REGION_DAILY.checkIns * weight * shape),
    itemScans: Math.round(REGION_DAILY.itemScans * weight * shape),
    notificationViews: Math.round(REGION_DAILY.notificationViews * weight * shape),
    searches: Math.round(REGION_DAILY.searches * weight * shape),
    directions: Math.round(REGION_DAILY.directions * weight * shape),
    ageGroups: spread(individualsServed, AGE_SHARES, `${key}|age`),
    visitorTypes: spread(familiesServed, VISITOR_SHARES, `${key}|visitor`),
    householdSizes: spread(familiesServed, HOUSEHOLD_SHARES, `${key}|household`),
    ethnicity: spread(familiesServed, ETHNICITY_SHARES, `${key}|ethnicity`),
    zips,
    items,
    categories: spread(itemsDistributed, CATEGORY_SHARES, `${key}|category`),
  };
}

/**
 * One `rollupsPantryDaily` document. Each pantry's share of its county's
 * activity is fixed by the directory, so the leaderboard ordering is stable
 * while the magnitudes follow the selected window.
 */
const PANTRY_SHARE_OF_COUNTY: Record<string, number> = (() => {
  const countyTotals: Record<string, number> = {};
  for (const pantry of mockPantryMetrics) {
    countyTotals[pantry.county] = (countyTotals[pantry.county] ?? 0) + pantry.familiesServed;
  }
  return Object.fromEntries(
    mockPantryMetrics.map((pantry) => [
      pantry.id,
      pantry.familiesServed / (countyTotals[pantry.county] || 1),
    ]),
  );
})();

export function buildPantryDaily(
  pantry: { id: string; county: string; isActive: boolean },
  date: string,
): PantryDailyDoc {
  const county = buildCountyDaily(pantry.county, date);
  const share = PANTRY_SHARE_OF_COUNTY[pantry.id] ?? 0;
  const wobble = 0.9 + jitter(`${pantry.id}|${date}`) * 0.2;
  const scale = pantry.isActive ? 1 : 0;

  return {
    pantryId: pantry.id,
    county: pantry.county,
    date,
    visits: Math.round(county.visits * share * wobble * scale),
    itemsDistributed: Math.round(county.itemsDistributed * share * wobble * scale),
    familiesServed: Math.round(county.familiesServed * share * wobble * scale),
  };
}
