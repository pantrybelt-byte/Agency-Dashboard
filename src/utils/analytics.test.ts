import { describe, expect, it } from 'vitest';
import type { CountyDailyDoc, PantryDailyDoc } from '../data/schema';
import type { ItemCatalogueEntry, PantryProfile, RollupWindow } from '../services/dashboardData';
import {
  categoryBreakdownFor,
  dailySeries,
  demographicsFor,
  growth,
  interactionsSeries,
  pantryMetricsFor,
  requestedItemsFor,
  summarise,
  totalsFor,
} from './analytics';

function countyDay(county: string, date: string, over: Partial<CountyDailyDoc> = {}): CountyDailyDoc {
  return {
    county,
    date,
    familiesServed: 100,
    individualsServed: 100,
    itemsDistributed: 1000,
    visits: 200,
    checkIns: 40,
    itemScans: 70,
    notificationViews: 90,
    searches: 20,
    directions: 10,
    ageGroups: { 'Children (0–17)': 37, 'Adults (18–59)': 42, 'Seniors (60+)': 21 },
    visitorTypes: { 'First-Time': 19, 'Repeat (Monthly)': 50, 'Repeat (Weekly)': 22, Emergency: 9 },
    householdSizes: { '1-2 Persons': 26, '3-4 Persons': 45, '5-6 Persons': 22, '7+ Persons': 7 },
    ethnicity: { 'Black or African American': 60, White: 30 },
    zips: { '36040': 60, '36104': 40 },
    items: { ri_01: 300, ri_02: 200 },
    categories: { 'Canned Goods': 600, 'Fresh Produce': 400 },
    ...over,
  };
}

describe('growth', () => {
  it('reports the percentage change between two windows', () => {
    expect(growth(120, 100)).toBe(20);
    expect(growth(80, 100)).toBe(-20);
  });

  it('returns zero rather than Infinity when the previous window is empty', () => {
    // A county that only started reporting this period is a normal state, and
    // "up infinity percent" is not a figure an agency can put in a report.
    expect(growth(500, 0)).toBe(0);
    expect(Number.isFinite(growth(500, 0))).toBe(true);
  });
});

describe('totalsFor', () => {
  it('sums across both counties and days', () => {
    const totals = totalsFor([
      countyDay('Lowndes', '2026-08-01'),
      countyDay('Lowndes', '2026-08-02'),
      countyDay('Dallas', '2026-08-01'),
    ]);
    expect(totals.familiesServed).toBe(300);
    expect(totals.itemsDistributed).toBe(3000);
  });

  it('derives total interactions from its five parts', () => {
    const totals = totalsFor([countyDay('Lowndes', '2026-08-01')]);
    expect(totals.interactions).toBe(40 + 70 + 90 + 20 + 10);
  });

  it('is zero for an empty window rather than NaN', () => {
    expect(totalsFor([]).familiesServed).toBe(0);
    expect(totalsFor([]).interactions).toBe(0);
  });
});

describe('summarise', () => {
  it('computes trends against the previous window', () => {
    const window: RollupWindow<CountyDailyDoc> = {
      current: [countyDay('Lowndes', '2026-08-02', { familiesServed: 150 })],
      previous: [countyDay('Lowndes', '2026-08-01', { familiesServed: 100 })],
    };
    expect(summarise(window).familiesTrend).toBe(50);
  });
});

describe('dailySeries', () => {
  it('produces one point per day in the window', () => {
    const window: RollupWindow<CountyDailyDoc> = {
      current: [
        countyDay('Lowndes', '2026-08-01'),
        countyDay('Dallas', '2026-08-01'),
        countyDay('Lowndes', '2026-08-02'),
      ],
      previous: [],
    };
    const series = dailySeries(window, (doc) => doc.familiesServed);
    expect(series).toHaveLength(2);
    // Both counties on 1 Aug are summed into one point.
    expect(series[0].value).toBe(200);
  });

  it('aligns the previous window by position, not by date', () => {
    // Comparing "day 1 of this period" to "day 1 of the period before" is what
    // a period-over-period chart means. Aligning by date would leave every
    // previous point on a date the current window does not contain.
    const window: RollupWindow<CountyDailyDoc> = {
      current: [countyDay('Lowndes', '2026-08-08', { familiesServed: 120 })],
      previous: [countyDay('Lowndes', '2026-08-01', { familiesServed: 100 })],
    };
    const series = dailySeries(window, (doc) => doc.familiesServed);
    expect(series[0].previousValue).toBe(100);
  });
});

describe('interactionsSeries', () => {
  it('merges counties into one row per day', () => {
    const series = interactionsSeries([
      countyDay('Lowndes', '2026-08-01'),
      countyDay('Dallas', '2026-08-01'),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].checkIns).toBe(80);
    // 40 + 70 + 90 + 20 + 10 per county, both counties on the same day.
    expect(series[0].total).toBe(460);
  });
});

describe('demographicsFor', () => {
  const zipDirectory = new Map([
    ['36040', { community: 'Hayneville South', county: 'Lowndes' }],
    ['36104', { community: 'Downtown Montgomery', county: 'Montgomery' }],
  ]);

  it('derives shares from summed counts, not by averaging percentages', () => {
    const window: RollupWindow<CountyDailyDoc> = {
      current: [countyDay('Lowndes', '2026-08-01'), countyDay('Dallas', '2026-08-01')],
      previous: [],
    };
    const demographics = demographicsFor(window, zipDirectory);
    const children = demographics.ageGroups.find((g) => g.group === 'Children (0–17)');

    expect(children?.count).toBe(74);
    expect(children?.percentage).toBeCloseTo(37, 1);
  });

  it('names ZIP rows from the directory and computes their period growth', () => {
    const window: RollupWindow<CountyDailyDoc> = {
      current: [countyDay('Lowndes', '2026-08-02', { zips: { '36040': 120 } })],
      previous: [countyDay('Lowndes', '2026-08-01', { zips: { '36040': 100 } })],
    };
    const row = demographicsFor(window, zipDirectory).zipCodeBreakdown[0];

    expect(row.community).toBe('Hayneville South');
    expect(row.county).toBe('Lowndes');
    expect(row.growthRate).toBe(20);
  });

  it('falls back to the bare ZIP when it is not in the directory', () => {
    const window: RollupWindow<CountyDailyDoc> = {
      current: [countyDay('Lowndes', '2026-08-01', { zips: { '99999': 10 } })],
      previous: [],
    };
    expect(demographicsFor(window, zipDirectory).zipCodeBreakdown[0].community).toBe('99999');
  });
});

describe('categoryBreakdownFor', () => {
  it('sums categories and orders them by volume', () => {
    const rows = categoryBreakdownFor([countyDay('Lowndes', '2026-08-01')]);
    expect(rows[0].category).toBe('Canned Goods');
    expect(rows[0].value).toBe(600);
  });
});

describe('pantryMetricsFor', () => {
  const directory: PantryProfile[] = [
    {
      id: 'pm_01',
      name: 'Hope Community',
      county: 'Lowndes',
      address: '1 Main St',
      city: 'Hayneville',
      state: 'AL',
      coordinates: { lat: 32.1, lng: -86.5 },
      type: 'Walk-in',
      isActive: true,
      topItems: [],
      updatedAt: '',
    },
    {
      id: 'pm_02',
      name: 'Quiet Partner',
      county: 'Lowndes',
      address: '2 Main St',
      city: 'Hayneville',
      state: 'AL',
      coordinates: { lat: 32.2, lng: -86.6 },
      type: 'Walk-in',
      isActive: true,
      topItems: [],
      updatedAt: '',
    },
  ];

  function pantryDay(pantryId: string, date: string, visits: number): PantryDailyDoc {
    return { pantryId, county: 'Lowndes', date, visits, itemsDistributed: visits * 5, familiesServed: visits };
  }

  it('sums the window and averages over the days that reported', () => {
    const metrics = pantryMetricsFor(directory, {
      current: [pantryDay('pm_01', '2026-08-01', 100), pantryDay('pm_01', '2026-08-02', 200)],
      previous: [],
    });
    const hope = metrics.find((m) => m.id === 'pm_01');

    expect(hope?.totalVisits).toBe(300);
    expect(hope?.avgDailyVisits).toBe(150);
  });

  it('keeps a pantry that reported nothing, at zero', () => {
    // "Which of my partners went quiet this month" is a question this page
    // must be able to answer, so a silent pantry cannot be indistinguishable
    // from one that does not exist.
    const metrics = pantryMetricsFor(directory, {
      current: [pantryDay('pm_01', '2026-08-01', 100)],
      previous: [],
    });
    const quiet = metrics.find((m) => m.id === 'pm_02');

    expect(quiet).toBeDefined();
    expect(quiet?.totalVisits).toBe(0);
    expect(quiet?.avgDailyVisits).toBe(0);
  });

  it('computes growth against the previous window', () => {
    const metrics = pantryMetricsFor(directory, {
      current: [pantryDay('pm_01', '2026-08-02', 150)],
      previous: [pantryDay('pm_01', '2026-08-01', 100)],
    });
    expect(metrics.find((m) => m.id === 'pm_01')?.growthRate).toBe(50);
  });
});

describe('requestedItemsFor', () => {
  const catalogue: ItemCatalogueEntry[] = [
    { id: 'ri_01', name: 'Canned Black Beans', category: 'Canned Goods' },
    { id: 'ri_02', name: 'Whole Milk', category: 'Dairy & Refrigerated' },
  ];

  it('ranks by request count within the window', () => {
    const items = requestedItemsFor(catalogue, {
      current: [countyDay('Lowndes', '2026-08-01')],
      previous: [],
    });
    expect(items[0].id).toBe('ri_01');
    expect(items[0].requestCount).toBe(300);
  });

  it('derives the trend direction from the measured change', () => {
    const items = requestedItemsFor(catalogue, {
      current: [countyDay('Lowndes', '2026-08-02', { items: { ri_01: 200, ri_02: 100 } })],
      previous: [countyDay('Lowndes', '2026-08-01', { items: { ri_01: 100, ri_02: 200 } })],
    });

    expect(items.find((i) => i.id === 'ri_01')?.trend).toBe('rising');
    expect(items.find((i) => i.id === 'ri_02')?.trend).toBe('declining');
  });

  it('builds the sparkline from the trailing seven days of the same series', () => {
    const current = Array.from({ length: 10 }, (_, i) =>
      countyDay('Lowndes', `2026-08-${String(i + 1).padStart(2, '0')}`, { items: { ri_01: i + 1 } }),
    );
    const item = requestedItemsFor(catalogue, { current, previous: [] }).find((i) => i.id === 'ri_01');

    expect(item?.weeklyData).toHaveLength(7);
    // Days 4..10 of the window, in order.
    expect(item?.weeklyData).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });
});
