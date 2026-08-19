/**
 * The Firestore wire contract for the agency analytics dashboard.
 *
 * These are the shapes Cloud Functions must write and this client will read.
 * Nothing in `src/types` is a wire shape — those are the *derived* shapes the
 * UI consumes, produced by joining and aggregating the documents below. Keeping
 * the two apart is what lets the rollup granularity change without touching a
 * single page.
 *
 * ---------------------------------------------------------------------------
 * The one design decision worth understanding
 * ---------------------------------------------------------------------------
 *
 * Almost everything on this dashboard is scoped by two dimensions at once:
 * which counties the agency may see, and which date window the user picked.
 * The naive model — one collection per chart — makes that a fan-out of
 * separate queries, each with its own index and its own read bill.
 *
 * Instead there is *one* rollup grain: **county × day**. A single
 * `rollupsCountyDaily` document carries that county's volume for that day, its
 * demographic composition, its item demand and its app interactions. Overview,
 * Demographics, Most Requested and Pantry Interactions all read the same
 * documents and aggregate them differently.
 *
 * The read cost is bounded and easy to reason about:
 *
 *     documents read = counties in scope × days in window
 *
 * An eight-county agency on the default 30-day view reads 240 documents for
 * the entire dashboard. A 90-day view reads 720. If that ever becomes the
 * bottleneck, the fix is a monthly pre-aggregate written by the same function,
 * not a change to any page.
 *
 * Two things deliberately sit outside that grain:
 *
 * - `pantries` is a *directory*, not a rollup. Name, address, coordinates and
 *   type do not vary by day, so storing them per day would multiply them by
 *   the window length for no benefit. Per-pantry volume lives in
 *   `rollupsPantryDaily` and is joined onto the directory at read time.
 *
 * - `countyMetrics` holds census and USDA measures — poverty rate, median
 *   income, food access score. These are annual figures with a published
 *   vintage. They must NOT move when someone picks "last 7 days", and the
 *   dashboard says so on screen rather than silently implying otherwise.
 */

/**
 * Collections this dashboard reads and writes.
 *
 * Everything prefixed `rollups` is written by Cloud Functions from the
 * consumer app's raw event stream. The client never reads raw events: that
 * would be one document read per check-in, which is unbounded in both latency
 * and cost.
 */
export const COLLECTIONS = {
  /** Pantry directory. Stable attributes only. */
  pantries: 'pantries',
  /** Item catalogue: name and category, no counts. */
  requestedItems: 'requestedItems',
  /** Census and USDA county measures, keyed by FIPS. Annual, not period-scoped. */
  countyMetrics: 'countyMetrics',
  /** The primary rollup: one document per county per day. */
  countyDaily: 'rollupsCountyDaily',
  /** Per-pantry volume, one document per pantry per day. */
  pantryDaily: 'rollupsPantryDaily',
  /** Agency-configured alerting. Written by this client. */
  thresholdAlerts: 'thresholdAlerts',
  /** Scheduled report rules. Written by this client. */
  scheduledReports: 'scheduledReports',
} as const;

/** Composite document ids. Deterministic so a rollup rerun overwrites in place. */
export const docId = {
  countyDaily: (county: string, date: string) => `${slug(county)}__${date}`,
  pantryDaily: (pantryId: string, date: string) => `${pantryId}__${date}`,
} as const;

/**
 * County names appear in document ids, so they need a stable, filesystem-safe
 * form. Kept here rather than in `utils/scoping` because this is the *storage*
 * spelling, which must never drift even if the display spelling changes.
 */
export function slug(county: string): string {
  return county.toLowerCase().replace(/\s+county$/, '').replace(/[^a-z0-9]/g, '');
}

// ---------------------------------------------------------------------------
// Directory documents
// ---------------------------------------------------------------------------

export interface PantryDoc {
  name: string;
  /** Display spelling, e.g. "Lowndes". Matched against the agency's assigned counties. */
  county: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  coordinates: { lat: number; lng: number };
  type: 'Walk-in' | 'Drive-thru' | 'Mobile Distribution' | 'Walk-in & Drive-thru';
  isActive: boolean;
  /** Ranked item names. A denormalised convenience, refreshed by the rollup job. */
  topItems: string[];
  /** ISO instant of the last write. Drives the "last updated" line in the UI. */
  updatedAt: string;
}

export interface RequestedItemDoc {
  name: string;
  category:
    | 'Proteins & Meat'
    | 'Fresh Produce'
    | 'Canned Goods'
    | 'Dairy & Refrigerated'
    | 'Bakery & Grains'
    | 'Baby & Hygiene'
    | 'Prepared Meals'
    | 'Beverages';
}

/**
 * Census and USDA measures for one county.
 *
 * `vintage` is not decoration: an agency citing a poverty rate in a filing has
 * to say which year's ACS release it came from. Storing it next to the number
 * means the export can carry it without anyone having to remember.
 */
export interface CountyMetricDoc {
  fips: string;
  county: string;
  foodAccessScore: number;
  population: number;
  povertyRate: number;
  medianIncome: number;
  nearestPantryMiles: number;
  activePantries: number;
  familiesServed: number;
  topRequestedItem: string;
  /** e.g. "ACS 2024 5-year". Shown wherever these figures are surfaced. */
  vintage: string;
}

// ---------------------------------------------------------------------------
// Rollup documents
// ---------------------------------------------------------------------------

/**
 * One county, one day. The workhorse of the whole dashboard.
 *
 * The `Record<string, number>` maps are counts, never percentages — a
 * percentage cannot be summed across counties or days, and every page here
 * needs to do exactly that. Shares are derived at read time.
 */
export interface CountyDailyDoc {
  county: string;
  /** YYYY-MM-DD. Lexicographic order is chronological order, which is why range queries work. */
  date: string;

  // Volume
  familiesServed: number;
  individualsServed: number;
  itemsDistributed: number;
  visits: number;

  // App interactions
  checkIns: number;
  itemScans: number;
  notificationViews: number;
  searches: number;
  directions: number;

  // Composition, as counts keyed by the category label
  ageGroups: Record<string, number>;
  visitorTypes: Record<string, number>;
  householdSizes: Record<string, number>;
  ethnicity: Record<string, number>;
  /** Families served, keyed by ZIP code. */
  zips: Record<string, number>;
  /** Request counts keyed by document id in `requestedItems`. */
  items: Record<string, number>;
  /** Items distributed, keyed by the category label used in the charts. */
  categories: Record<string, number>;
}

export interface PantryDailyDoc {
  pantryId: string;
  /** Duplicated from the pantry directory so this collection can be queried by county alone. */
  county: string;
  date: string;
  visits: number;
  itemsDistributed: number;
  familiesServed: number;
}

// ---------------------------------------------------------------------------
// Indexes the queries above require
// ---------------------------------------------------------------------------

/**
 * Composite indexes Firestore will need. Listed here so the deploy step is a
 * transcription rather than a guess — Firestore will otherwise fail the first
 * query at runtime with a console link, which is a poor way to find out.
 *
 * `in` filters are capped at 30 values. An agency assigned more counties than
 * that falls back to an unfiltered query narrowed client-side; security rules
 * still constrain what comes back. See `dashboardData.ts`.
 */
export const REQUIRED_INDEXES = [
  { collection: COLLECTIONS.countyDaily, fields: ['county ASC', 'date ASC'] },
  { collection: COLLECTIONS.pantryDaily, fields: ['county ASC', 'date ASC'] },
  { collection: COLLECTIONS.pantries, fields: ['county ASC', 'name ASC'] },
] as const;
