/**
 * Turning county-day rollups into the shapes the charts consume.
 *
 * Every function here is pure and takes the documents it needs, so the maths an
 * agency reports to a funder is testable without a database, a browser or a
 * React tree. Nothing in this file reaches for a store.
 *
 * Two rules hold throughout:
 *
 * - **Counts sum, percentages do not.** Rollups carry counts precisely so they
 *   can be added across counties and days. Shares are computed once, at the
 *   end, from the summed totals.
 * - **Trends come from the previous window, never from a constant.** Every
 *   percentage change on the dashboard is `(current - previous) / previous`
 *   over two equally sized windows the data layer fetched together.
 */
import type { CountyDailyDoc, PantryDailyDoc } from '../data/schema';
import type { ItemCatalogueEntry, PantryProfile, RollupWindow } from '../services/dashboardData';
import type {
  CategoryBreakdown,
  DailyInteractionData,
  DemographicsData,
  PantryMetric,
  RequestedItem,
  TimeSeriesDataPoint,
} from '../types';

// ---------------------------------------------------------------------------
// Presentation constants
// ---------------------------------------------------------------------------

/**
 * Colours and canonical ordering for the composition breakdowns.
 *
 * These live here rather than travelling in the rollup documents: a colour is a
 * property of this dashboard's design, not of the data, and storing it per
 * document would mean a palette change required a backfill.
 */
const AGE_GROUP_ORDER = ['Children (0–17)', 'Adults (18–59)', 'Seniors (60+)'] as const;
const AGE_GROUP_COLORS: Record<string, string> = {
  'Children (0–17)': '#6366f1',
  'Adults (18–59)': '#10b981',
  'Seniors (60+)': '#f59e0b',
};

const VISITOR_ORDER = ['First-Time', 'Repeat (Monthly)', 'Repeat (Weekly)', 'Emergency'] as const;
const VISITOR_COLORS: Record<string, string> = {
  'First-Time': '#3b82f6',
  'Repeat (Monthly)': '#10b981',
  'Repeat (Weekly)': '#8b5cf6',
  Emergency: '#ef4444',
};

const HOUSEHOLD_ORDER = ['1-2 Persons', '3-4 Persons', '5-6 Persons', '7+ Persons'] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  'Canned Goods': '#10b981',
  'Fresh Produce': '#6366f1',
  'Proteins & Meat': '#f59e0b',
  'Dairy & Refrigerated': '#3b82f6',
  'Bakery & Grains': '#ec4899',
  'Baby & Hygiene': '#8b5cf6',
  Beverages: '#14b8a6',
  'Prepared Meals': '#f97316',
};

// ---------------------------------------------------------------------------
// Totals and trends
// ---------------------------------------------------------------------------

export interface PeriodTotals {
  familiesServed: number;
  individualsServed: number;
  itemsDistributed: number;
  visits: number;
  checkIns: number;
  itemScans: number;
  notificationViews: number;
  searches: number;
  directions: number;
  interactions: number;
}

const ZERO_TOTALS: PeriodTotals = {
  familiesServed: 0,
  individualsServed: 0,
  itemsDistributed: 0,
  visits: 0,
  checkIns: 0,
  itemScans: 0,
  notificationViews: 0,
  searches: 0,
  directions: 0,
  interactions: 0,
};

export function totalsFor(docs: CountyDailyDoc[]): PeriodTotals {
  const totals = { ...ZERO_TOTALS };
  for (const doc of docs) {
    totals.familiesServed += doc.familiesServed;
    totals.individualsServed += doc.individualsServed;
    totals.itemsDistributed += doc.itemsDistributed;
    totals.visits += doc.visits;
    totals.checkIns += doc.checkIns;
    totals.itemScans += doc.itemScans;
    totals.notificationViews += doc.notificationViews;
    totals.searches += doc.searches;
    totals.directions += doc.directions;
  }
  totals.interactions =
    totals.checkIns + totals.itemScans + totals.notificationViews + totals.searches + totals.directions;
  return totals;
}

/**
 * Percentage change between two windows, rounded to one decimal.
 *
 * Returns 0 rather than Infinity when the previous window is empty: "up
 * infinity percent" is not a number an agency can put in a report, and a new
 * county with no history is a normal state, not an error.
 */
export function growth(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export interface PeriodSummary extends PeriodTotals {
  familiesTrend: number;
  itemsTrend: number;
  visitsTrend: number;
  interactionsTrend: number;
}

export function summarise(window: RollupWindow<CountyDailyDoc>): PeriodSummary {
  const current = totalsFor(window.current);
  const previous = totalsFor(window.previous);

  return {
    ...current,
    familiesTrend: growth(current.familiesServed, previous.familiesServed),
    itemsTrend: growth(current.itemsDistributed, previous.itemsDistributed),
    visitsTrend: growth(current.visits, previous.visits),
    interactionsTrend: growth(current.interactions, previous.interactions),
  };
}

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

/** Human day label, e.g. "Aug 19". Kept short: these are axis ticks. */
function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function sumByDate(docs: CountyDailyDoc[], pick: (doc: CountyDailyDoc) => number): Map<string, number> {
  const byDate = new Map<string, number>();
  for (const doc of docs) {
    byDate.set(doc.date, (byDate.get(doc.date) ?? 0) + pick(doc));
  }
  return byDate;
}

/**
 * A daily series for the requested window, with the previous window aligned
 * position-by-position rather than by date.
 *
 * Position alignment is the point: comparing "day 1 of this period" against
 * "day 1 of the period before" is what a period-over-period chart means. Date
 * alignment would leave every previous-period point on a date the current
 * window does not contain.
 */
export function dailySeries(
  window: RollupWindow<CountyDailyDoc>,
  pick: (doc: CountyDailyDoc) => number,
): TimeSeriesDataPoint[] {
  const currentByDate = sumByDate(window.current, pick);
  const previousByDate = sumByDate(window.previous, pick);

  const currentDates = [...currentByDate.keys()].sort();
  const previousValues = [...previousByDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);

  return currentDates.map((date, index) => ({
    date: dayLabel(date),
    value: currentByDate.get(date) ?? 0,
    previousValue: previousValues[index],
  }));
}

export function interactionsSeries(docs: CountyDailyDoc[]): DailyInteractionData[] {
  const byDate = new Map<string, DailyInteractionData>();

  for (const doc of docs) {
    const existing = byDate.get(doc.date) ?? {
      date: doc.date,
      checkIns: 0,
      itemScans: 0,
      notificationViews: 0,
      searches: 0,
      directions: 0,
      total: 0,
    };
    existing.checkIns += doc.checkIns;
    existing.itemScans += doc.itemScans;
    existing.notificationViews += doc.notificationViews;
    existing.searches += doc.searches;
    existing.directions += doc.directions;
    existing.total =
      existing.checkIns +
      existing.itemScans +
      existing.notificationViews +
      existing.searches +
      existing.directions;
    byDate.set(doc.date, existing);
  }

  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ ...entry, date: dayLabel(entry.date) }));
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

function mergeMaps(docs: CountyDailyDoc[], pick: (doc: CountyDailyDoc) => Record<string, number>): Map<string, number> {
  const merged = new Map<string, number>();
  for (const doc of docs) {
    for (const [key, value] of Object.entries(pick(doc))) {
      merged.set(key, (merged.get(key) ?? 0) + value);
    }
  }
  return merged;
}

function asPercentage(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

/**
 * Build the demographic composition for whatever counties and days are in the
 * window. ZIP rows carry their own county so the table can still be read by
 * geography once several counties are summed together.
 */
export function demographicsFor(
  window: RollupWindow<CountyDailyDoc>,
  zipDirectory: Map<string, { community: string; county: string }>,
): DemographicsData {
  const ageCounts = mergeMaps(window.current, (doc) => doc.ageGroups);
  const visitorCounts = mergeMaps(window.current, (doc) => doc.visitorTypes);
  const householdCounts = mergeMaps(window.current, (doc) => doc.householdSizes);
  const ethnicityCounts = mergeMaps(window.current, (doc) => doc.ethnicity);

  const ageTotal = [...ageCounts.values()].reduce((sum, value) => sum + value, 0);
  const visitorTotal = [...visitorCounts.values()].reduce((sum, value) => sum + value, 0);
  const householdTotal = [...householdCounts.values()].reduce((sum, value) => sum + value, 0);
  const ethnicityTotal = [...ethnicityCounts.values()].reduce((sum, value) => sum + value, 0);

  // ZIP growth is period-over-period, so a ZIP that appears only in the
  // previous window still has to be reachable when computing its change.
  const zipCurrent = mergeMaps(window.current, (doc) => doc.zips);
  const zipPrevious = mergeMaps(window.previous, (doc) => doc.zips);

  return {
    ageGroups: AGE_GROUP_ORDER.filter((group) => ageCounts.has(group)).map((group) => ({
      group,
      count: ageCounts.get(group) ?? 0,
      percentage: asPercentage(ageCounts.get(group) ?? 0, ageTotal),
      color: AGE_GROUP_COLORS[group] ?? '#64748b',
    })),
    householdSizes: HOUSEHOLD_ORDER.filter((size) => householdCounts.has(size)).map((size) => ({
      size,
      count: householdCounts.get(size) ?? 0,
      percentage: asPercentage(householdCounts.get(size) ?? 0, householdTotal),
    })),
    visitorTypes: VISITOR_ORDER.filter((type) => visitorCounts.has(type)).map((type) => ({
      type: type as DemographicsData['visitorTypes'][number]['type'],
      count: visitorCounts.get(type) ?? 0,
      percentage: asPercentage(visitorCounts.get(type) ?? 0, visitorTotal),
      color: VISITOR_COLORS[type] ?? '#64748b',
    })),
    zipCodeBreakdown: [...zipCurrent.entries()]
      .map(([zip, familiesServed]) => {
        const meta = zipDirectory.get(zip);
        return {
          zip,
          community: meta?.community ?? zip,
          county: meta?.county ?? '',
          familiesServed,
          growthRate: growth(familiesServed, zipPrevious.get(zip) ?? 0),
        };
      })
      .sort((a, b) => b.familiesServed - a.familiesServed),
    ethnicityBreakdown: [...ethnicityCounts.entries()]
      .map(([category, count]) => ({ category, percentage: asPercentage(count, ethnicityTotal) }))
      .sort((a, b) => b.percentage - a.percentage),
  };
}

export function categoryBreakdownFor(docs: CountyDailyDoc[]): CategoryBreakdown[] {
  return [...mergeMaps(docs, (doc) => doc.categories).entries()]
    .map(([category, value]) => ({ category, value, color: CATEGORY_COLORS[category] ?? '#64748b' }))
    .sort((a, b) => b.value - a.value);
}

/** Share of distribution by pantry type, derived from the directory in scope. */
export function distributionByType(pantries: PantryProfile[]): CategoryBreakdown[] {
  const colors: Record<string, string> = {
    'Walk-in': '#10b981',
    'Drive-thru': '#6366f1',
    'Walk-in & Drive-thru': '#3b82f6',
    'Mobile Distribution': '#f59e0b',
  };

  const counts = new Map<string, number>();
  for (const pantry of pantries) counts.set(pantry.type, (counts.get(pantry.type) ?? 0) + 1);
  const total = pantries.length;

  return [...counts.entries()]
    .map(([category, count]) => ({
      category,
      value: asPercentage(count, total),
      color: colors[category] ?? '#64748b',
    }))
    .sort((a, b) => b.value - a.value);
}

// ---------------------------------------------------------------------------
// Pantries
// ---------------------------------------------------------------------------

/**
 * Join the pantry directory onto its per-day rollups for the selected window.
 *
 * A pantry with no rollup rows still appears, at zero. Dropping it would make a
 * pantry that reported nothing indistinguishable from one that does not exist,
 * and "which of my partners went quiet this month" is a question this page
 * should be able to answer.
 */
export function pantryMetricsFor(
  directory: PantryProfile[],
  window: RollupWindow<PantryDailyDoc>,
): PantryMetric[] {
  const current = new Map<string, { visits: number; items: number; families: number; days: Set<string> }>();
  const previous = new Map<string, number>();

  for (const row of window.current) {
    const entry = current.get(row.pantryId) ?? { visits: 0, items: 0, families: 0, days: new Set<string>() };
    entry.visits += row.visits;
    entry.items += row.itemsDistributed;
    entry.families += row.familiesServed;
    entry.days.add(row.date);
    current.set(row.pantryId, entry);
  }

  for (const row of window.previous) {
    previous.set(row.pantryId, (previous.get(row.pantryId) ?? 0) + row.visits);
  }

  return directory.map((pantry) => {
    const totals = current.get(pantry.id);
    const visits = totals?.visits ?? 0;
    const dayCount = totals?.days.size ?? 0;

    return {
      id: pantry.id,
      name: pantry.name,
      county: pantry.county,
      address: pantry.address,
      city: pantry.city,
      state: pantry.state,
      zip: pantry.zip,
      coordinates: pantry.coordinates,
      type: pantry.type,
      totalVisits: visits,
      totalItemsDistributed: totals?.items ?? 0,
      familiesServed: totals?.families ?? 0,
      avgDailyVisits: dayCount > 0 ? Math.round(visits / dayCount) : 0,
      growthRate: growth(visits, previous.get(pantry.id) ?? 0),
      topItems: pantry.topItems,
      isActive: pantry.isActive,
      lastUpdated: pantry.updatedAt,
    };
  });
}

// ---------------------------------------------------------------------------
// Item demand
// ---------------------------------------------------------------------------

/** Classification thresholds for the trend arrow, kept in one place. */
const RISING_AT = 5;
const DECLINING_AT = -5;

/**
 * Item demand for the window, with the trend and the sparkline both derived
 * from the same series that produced the count.
 *
 * Previously the count, the trend, the percentage and the seven-day sparkline
 * were four independent literals in the catalogue, free to disagree with each
 * other and with the period the user selected.
 */
export function requestedItemsFor(
  catalogue: ItemCatalogueEntry[],
  window: RollupWindow<CountyDailyDoc>,
): RequestedItem[] {
  const currentTotals = mergeMaps(window.current, (doc) => doc.items);
  const previousTotals = mergeMaps(window.previous, (doc) => doc.items);

  // Trailing seven days of the selected window, for the sparkline.
  const dates = [...new Set(window.current.map((doc) => doc.date))].sort();
  const tail = dates.slice(-7);
  // Set rather than array membership: this runs once per rollup document, and
  // the window can hold several hundred.
  const tailSet = new Set(tail);
  const perDay = new Map<string, Map<string, number>>();
  for (const doc of window.current) {
    if (!tailSet.has(doc.date)) continue;
    const day = perDay.get(doc.date) ?? new Map<string, number>();
    for (const [itemId, count] of Object.entries(doc.items)) {
      day.set(itemId, (day.get(itemId) ?? 0) + count);
    }
    perDay.set(doc.date, day);
  }

  const lastDate = dates[dates.length - 1];

  return catalogue
    .map((item) => {
      const requestCount = currentTotals.get(item.id) ?? 0;
      const trendPercentage = growth(requestCount, previousTotals.get(item.id) ?? 0);

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        requestCount,
        trend:
          trendPercentage >= RISING_AT
            ? ('rising' as const)
            : trendPercentage <= DECLINING_AT
              ? ('declining' as const)
              : ('steady' as const),
        trendPercentage,
        weeklyData: tail.map((date) => perDay.get(date)?.get(item.id) ?? 0),
        lastRequested: lastDate ? dayLabel(lastDate) : '—',
      };
    })
    .sort((a, b) => b.requestCount - a.requestCount);
}
