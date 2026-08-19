/**
 * The dashboard's single data boundary.
 *
 * Every page reads through these subscriptions. When `VITE_USE_FIREBASE=true`
 * and the config is complete they attach Firestore `onSnapshot` listeners;
 * otherwise they serve demonstration rollups generated to the identical shape.
 * The two paths expose the same surface, so no component knows which is active.
 *
 * ---------------------------------------------------------------------------
 * Queries are scoped, not filtered afterwards
 * ---------------------------------------------------------------------------
 *
 * Subscriptions take a `DataQuery` carrying the counties the agency may see and
 * the date window the user picked, and push both into the Firestore query. That
 * matters for three reasons:
 *
 * - **Cost.** A 30-day, eight-county view reads 240 rollup documents rather
 *   than the entire collection.
 * - **Correctness.** County scope stops being a cosmetic filter applied after
 *   the data arrives, which is what made it so easy to forget on a page.
 * - **Security.** The query mirrors what the rules permit, so a rule denial
 *   surfaces as a failed query in development rather than as a silent gap
 *   between what the client asked for and what it was allowed to have.
 *
 * Every window is fetched together with the equally sized window before it, so
 * period-over-period growth is computed from data rather than typed in.
 *
 * Firestore documents are parsed defensively — a malformed document is skipped
 * with a console warning rather than being allowed to white-screen the
 * dashboard. Rollups are written by Cloud Functions, and "written by a job"
 * includes a period where the job is still being changed.
 */
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  type DocumentData,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getDb, isFirebaseEnabled } from './firebase';
import { DemoCollection } from './demoStore';
import {
  COLLECTIONS,
  type CountyDailyDoc,
  type PantryDailyDoc,
  type PantryDoc,
  type RequestedItemDoc,
} from '../data/schema';
import { buildCountyDaily, buildPantryDaily, datesBetween } from '../data/demoRollups';
import { mockPantryMetrics, mockRequestedItems, mockThresholdAlerts } from '../data/mockData';
import { alabamaCounties, type AlabamaCountyData } from '../data/alabamaCounties';
import type { ScheduledReport, ThresholdAlert } from '../types';

export { COLLECTIONS } from '../data/schema';

export type Unsubscribe = () => void;
export type DataSource = 'firestore' | 'demo';

export type Subscribe<T> = (
  onData: (data: T, source: DataSource) => void,
  onError: (error: Error) => void,
) => Unsubscribe;

/**
 * What a page is asking for. Both dimensions are required: omitting either one
 * is how a page ends up quietly reporting on counties or periods the user did
 * not ask about.
 */
export interface DataQuery {
  /** Counties in scope, in display spelling. An empty array legitimately means "nothing". */
  counties: string[];
  startDate: string;
  endDate: string;
  /** The equally sized window immediately before, for period-over-period growth. */
  previousStartDate: string;
  previousEndDate: string;
}

/** A window and its predecessor, so growth never needs a second round trip. */
export interface RollupWindow<T> {
  current: T[];
  previous: T[];
}

/** Firestore caps `in` at 30 values. Beyond that the filter moves client-side. */
const MAX_IN_VALUES = 30;

// ---------------------------------------------------------------------------
// Directory records the UI consumes
// ---------------------------------------------------------------------------

export interface PantryProfile {
  id: string;
  name: string;
  county: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  coordinates: { lat: number; lng: number };
  type: PantryDoc['type'];
  isActive: boolean;
  topItems: string[];
  updatedAt: string;
}

export interface ItemCatalogueEntry extends RequestedItemDoc {
  id: string;
}

// ---------------------------------------------------------------------------
// Defensive parsing
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const bool = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;
const strArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

/** Coerce a `Record<string, number>` map, dropping anything that is not numeric. */
const numMap = (value: unknown): Record<string, number> => {
  if (!isRecord(value)) return {};
  const result: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'number' && Number.isFinite(entry)) result[key] = entry;
  }
  return result;
};

function parseSnapshot<T>(
  snapshot: QuerySnapshot<DocumentData>,
  label: string,
  parse: (id: string, data: DocumentData) => T | null,
): T[] {
  const results: T[] = [];
  let skipped = 0;

  snapshot.forEach((document) => {
    try {
      const parsed = parse(document.id, document.data());
      if (parsed) results.push(parsed);
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  });

  if (skipped > 0) {
    console.warn(`[data] skipped ${skipped} malformed document(s) in ${label}`);
  }
  return results;
}

function parsePantryProfile(id: string, data: DocumentData): PantryProfile | null {
  if (!isRecord(data) || typeof data.name !== 'string') return null;
  const coordinates = isRecord(data.coordinates) ? data.coordinates : {};

  return {
    id,
    name: data.name,
    county: str(data.county),
    address: str(data.address),
    city: str(data.city),
    state: str(data.state, 'AL'),
    zip: typeof data.zip === 'string' ? data.zip : undefined,
    coordinates: { lat: num(coordinates.lat), lng: num(coordinates.lng) },
    type: str(data.type, 'Walk-in') as PantryDoc['type'],
    isActive: bool(data.isActive, true),
    topItems: strArray(data.topItems),
    updatedAt: str(data.updatedAt, ''),
  };
}

function parseCountyDaily(_id: string, data: DocumentData): CountyDailyDoc | null {
  if (!isRecord(data)) return null;
  const county = str(data.county);
  const date = str(data.date);
  // Without both keys the document cannot be placed in a window or a scope,
  // which makes it worse than absent.
  if (!county || !date) return null;

  return {
    county,
    date,
    familiesServed: num(data.familiesServed),
    individualsServed: num(data.individualsServed, num(data.familiesServed)),
    itemsDistributed: num(data.itemsDistributed),
    visits: num(data.visits),
    checkIns: num(data.checkIns),
    itemScans: num(data.itemScans),
    notificationViews: num(data.notificationViews),
    searches: num(data.searches),
    directions: num(data.directions),
    ageGroups: numMap(data.ageGroups),
    visitorTypes: numMap(data.visitorTypes),
    householdSizes: numMap(data.householdSizes),
    ethnicity: numMap(data.ethnicity),
    zips: numMap(data.zips),
    items: numMap(data.items),
    categories: numMap(data.categories),
  };
}

function parsePantryDaily(_id: string, data: DocumentData): PantryDailyDoc | null {
  if (!isRecord(data)) return null;
  const pantryId = str(data.pantryId);
  const date = str(data.date);
  if (!pantryId || !date) return null;

  return {
    pantryId,
    county: str(data.county),
    date,
    visits: num(data.visits),
    itemsDistributed: num(data.itemsDistributed),
    familiesServed: num(data.familiesServed),
  };
}

function parseItemCatalogue(id: string, data: DocumentData): ItemCatalogueEntry | null {
  if (!isRecord(data) || typeof data.name !== 'string') return null;
  return {
    id,
    name: data.name,
    category: str(data.category, 'Canned Goods') as RequestedItemDoc['category'],
  };
}

/**
 * County metrics arrive keyed by FIPS. The static entry supplies geometry,
 * region and naming; the live document supplies the measures. Merging rather
 * than replacing means a partial rollup cannot blank out the map.
 */
function parseCountyMetric(id: string, data: DocumentData): AlabamaCountyData | null {
  if (!isRecord(data)) return null;
  const fips = str(data.fips, id);
  const base = alabamaCounties.find((county) => county.fips === fips);
  if (!base) return null;

  const foodAccessScore = num(data.foodAccessScore, base.foodAccessScore);
  return {
    ...base,
    foodAccessScore,
    status: statusFromScore(foodAccessScore),
    population: num(data.population, base.population),
    povertyRate: num(data.povertyRate, base.povertyRate),
    medianIncome: num(data.medianIncome, base.medianIncome),
    nearestPantryMiles: num(data.nearestPantryMiles, base.nearestPantryMiles),
    activePantries: num(data.activePantries, base.activePantries),
    familiesServed: num(data.familiesServed, base.familiesServed),
    topRequestedItem: str(data.topRequestedItem, base.topRequestedItem),
  };
}

/** Kept local so a live score can never disagree with its own status label. */
function statusFromScore(score: number): AlabamaCountyData['status'] {
  if (score < 25) return 'Critical';
  if (score < 40) return 'At Risk';
  if (score < 60) return 'Moderate';
  return 'Adequate';
}

function parseThresholdAlert(id: string, data: DocumentData): ThresholdAlert | null {
  if (!isRecord(data) || typeof data.metric !== 'string') return null;
  const thresholdValue = data.thresholdValue;

  return {
    id,
    orgId: str(data.orgId),
    metric: data.metric,
    countyOrPantry: str(data.countyOrPantry),
    condition: str(data.condition, 'less_than') as ThresholdAlert['condition'],
    thresholdValue:
      typeof thresholdValue === 'number' || typeof thresholdValue === 'string' ? thresholdValue : 0,
    notifyEmail: str(data.notifyEmail),
    isTriggered: bool(data.isTriggered),
    lastTriggered: typeof data.lastTriggered === 'string' ? data.lastTriggered : undefined,
  };
}

function parseScheduledReport(id: string, data: DocumentData): ScheduledReport | null {
  if (!isRecord(data) || typeof data.templateId !== 'string') return null;

  return {
    id,
    orgId: str(data.orgId),
    templateId: data.templateId,
    templateName: str(data.templateName, data.templateId),
    frequency: str(data.frequency, 'monthly') as ScheduledReport['frequency'],
    format: str(data.format, 'csv') as ScheduledReport['format'],
    sendOnDay: num(data.sendOnDay, 1),
    recipients: strArray(data.recipients),
    countyScope: str(data.countyScope, 'all'),
    isActive: bool(data.isActive, true),
    createdBy: str(data.createdBy),
    createdAt: str(data.createdAt),
    nextRunAt: str(data.nextRunAt),
    lastRunAt: typeof data.lastRunAt === 'string' ? data.lastRunAt : undefined,
  };
}

// ---------------------------------------------------------------------------
// Demonstration stores
// ---------------------------------------------------------------------------

const demoCounties = new DemoCollection<AlabamaCountyData>(alabamaCounties);
const demoAlerts = new DemoCollection<ThresholdAlert>(mockThresholdAlerts);
const demoScheduledReports = new DemoCollection<ScheduledReport>([]);

/** The pantry directory, reduced to the attributes that genuinely do not vary by day. */
const demoPantryDirectory: PantryProfile[] = mockPantryMetrics.map((pantry) => ({
  id: pantry.id,
  name: pantry.name,
  county: pantry.county,
  address: pantry.address,
  city: pantry.city,
  state: pantry.state,
  zip: pantry.zip,
  coordinates: pantry.coordinates,
  type: pantry.type,
  isActive: pantry.isActive,
  topItems: pantry.topItems,
  updatedAt: pantry.lastUpdated,
}));

const demoItemCatalogue: ItemCatalogueEntry[] = mockRequestedItems.map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
}));

// ---------------------------------------------------------------------------
// Subscription plumbing
// ---------------------------------------------------------------------------

/** Emit a fixed value asynchronously, so demo and Firestore share the same timing shape. */
function emitOnce<T>(value: T, onData: (data: T, source: DataSource) => void): Unsubscribe {
  let cancelled = false;
  queueMicrotask(() => {
    if (!cancelled) onData(value, 'demo');
  });
  return () => {
    cancelled = true;
  };
}

/**
 * Apply the county constraint to a Firestore query when it fits in an `in`
 * filter. Above 30 counties the filter is dropped and applied on arrival —
 * security rules still bound what can come back, so this trades read volume for
 * a query Firestore will actually accept.
 */
function withCountyFilter(
  base: Query<DocumentData>,
  counties: string[],
): { q: Query<DocumentData>; needsClientFilter: boolean } {
  if (counties.length === 0 || counties.length > MAX_IN_VALUES) {
    if (counties.length > MAX_IN_VALUES) {
      console.warn(
        `[data] ${counties.length} counties exceeds Firestore's ${MAX_IN_VALUES}-value "in" limit; ` +
          'narrowing on the client instead.',
      );
    }
    return { q: base, needsClientFilter: counties.length > 0 };
  }
  return { q: query(base, where('county', 'in', counties)), needsClientFilter: false };
}

/** Split a combined fetch back into the requested window and its predecessor. */
function splitWindow<T extends { date: string }>(rows: T[], q: DataQuery): RollupWindow<T> {
  const current: T[] = [];
  const previous: T[] = [];
  for (const row of rows) {
    if (row.date >= q.startDate && row.date <= q.endDate) current.push(row);
    else if (row.date >= q.previousStartDate && row.date <= q.previousEndDate) previous.push(row);
  }
  return { current, previous };
}

/**
 * Build a windowed rollup subscription.
 *
 * Both windows are fetched in one listener spanning `previousStartDate` to
 * `endDate`, then split on arrival. Two listeners would double the cost of
 * answering what is really one range query.
 */
function createWindowedSubscription<T extends { date: string; county: string }>(
  collectionName: string,
  parse: (id: string, data: DocumentData) => T | null,
  buildDemo: (q: DataQuery) => T[],
): (q: DataQuery) => Subscribe<RollupWindow<T>> {
  return (q) => (onData, onError) => {
    const db = isFirebaseEnabled() ? getDb() : null;

    if (!db) {
      return emitOnce(splitWindow(buildDemo(q), q), onData);
    }

    try {
      const { q: scoped, needsClientFilter } = withCountyFilter(collection(db, collectionName), q.counties);
      const ranged = query(
        scoped,
        where('date', '>=', q.previousStartDate),
        where('date', '<=', q.endDate),
        orderBy('date'),
      );

      const permitted = new Set(q.counties);

      return onSnapshot(
        ranged,
        (snapshot) => {
          let rows = parseSnapshot(snapshot, collectionName, parse);
          if (needsClientFilter) rows = rows.filter((row) => permitted.has(row.county));
          onData(splitWindow(rows, q), 'firestore');
        },
        (error) => {
          console.error(`[data] ${collectionName} listener failed, serving demo data:`, error);
          onError(error instanceof Error ? error : new Error(String(error)));
          onData(splitWindow(buildDemo(q), q), 'demo');
        },
      );
    } catch (error) {
      console.error(`[data] could not attach ${collectionName} listener:`, error);
      onError(error instanceof Error ? error : new Error(String(error)));
      return emitOnce(splitWindow(buildDemo(q), q), onData);
    }
  };
}

/** Build a plain, unwindowed subscription over a whole collection. */
function createSubscription<T>(
  collectionName: string,
  parse: (id: string, data: DocumentData) => T | null,
  demo: DemoCollection<T>,
  sortField?: string,
): Subscribe<T[]> {
  return (onData, onError) => {
    const db = isFirebaseEnabled() ? getDb() : null;

    if (!db) {
      return demo.subscribe((items) => onData(items, 'demo'));
    }

    try {
      const reference = collection(db, collectionName);
      const q = sortField ? query(reference, orderBy(sortField)) : query(reference);

      return onSnapshot(
        q,
        (snapshot) => onData(parseSnapshot(snapshot, collectionName, parse), 'firestore'),
        (error) => {
          console.error(`[data] ${collectionName} listener failed, serving demo data:`, error);
          onError(error instanceof Error ? error : new Error(String(error)));
          demo.subscribe((items) => onData(items, 'demo'));
        },
      );
    } catch (error) {
      console.error(`[data] could not attach ${collectionName} listener:`, error);
      onError(error instanceof Error ? error : new Error(String(error)));
      return demo.subscribe((items) => onData(items, 'demo'));
    }
  };
}

// ---------------------------------------------------------------------------
// Windowed rollups
// ---------------------------------------------------------------------------

export const countyRollupQuery = createWindowedSubscription<CountyDailyDoc>(
  COLLECTIONS.countyDaily,
  parseCountyDaily,
  (q) => {
    const dates = datesBetween(q.previousStartDate, q.endDate);
    return q.counties.flatMap((county) => dates.map((date) => buildCountyDaily(county, date)));
  },
);

export const pantryRollupQuery = createWindowedSubscription<PantryDailyDoc>(
  COLLECTIONS.pantryDaily,
  parsePantryDaily,
  (q) => {
    const dates = datesBetween(q.previousStartDate, q.endDate);
    const inScope = new Set(q.counties);
    return demoPantryDirectory
      .filter((pantry) => inScope.has(pantry.county))
      .flatMap((pantry) => dates.map((date) => buildPantryDaily(pantry, date)));
  },
);

// ---------------------------------------------------------------------------
// Directory subscriptions
// ---------------------------------------------------------------------------

export function pantryDirectoryQuery(counties: string[]): Subscribe<PantryProfile[]> {
  const inScope = new Set(counties);
  const demoRows = () => demoPantryDirectory.filter((pantry) => inScope.has(pantry.county));

  return (onData, onError) => {
    const db = isFirebaseEnabled() ? getDb() : null;
    if (!db) return emitOnce(demoRows(), onData);

    try {
      const { q, needsClientFilter } = withCountyFilter(collection(db, COLLECTIONS.pantries), counties);

      return onSnapshot(
        query(q, orderBy('name')),
        (snapshot) => {
          let rows = parseSnapshot(snapshot, COLLECTIONS.pantries, parsePantryProfile);
          if (needsClientFilter) rows = rows.filter((row) => inScope.has(row.county));
          onData(rows, 'firestore');
        },
        (error) => {
          console.error('[data] pantry directory listener failed, serving demo data:', error);
          onError(error instanceof Error ? error : new Error(String(error)));
          onData(demoRows(), 'demo');
        },
      );
    } catch (error) {
      console.error('[data] could not attach pantry directory listener:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
      return emitOnce(demoRows(), onData);
    }
  };
}

export const subscribeItemCatalogue: Subscribe<ItemCatalogueEntry[]> = (onData, onError) => {
  const db = isFirebaseEnabled() ? getDb() : null;
  if (!db) return emitOnce(demoItemCatalogue, onData);

  try {
    return onSnapshot(
      query(collection(db, COLLECTIONS.requestedItems), orderBy('name')),
      (snapshot) =>
        onData(parseSnapshot(snapshot, COLLECTIONS.requestedItems, parseItemCatalogue), 'firestore'),
      (error) => {
        console.error('[data] item catalogue listener failed, serving demo data:', error);
        onError(error instanceof Error ? error : new Error(String(error)));
        onData(demoItemCatalogue, 'demo');
      },
    );
  } catch (error) {
    console.error('[data] could not attach item catalogue listener:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
    return emitOnce(demoItemCatalogue, onData);
  }
};

/**
 * County census measures for the whole state.
 *
 * Deliberately *not* county-filtered: the choropleth draws all 67 counties for
 * geographic context and marks the ones outside the agency's coverage as
 * locked. Filtering here would leave holes in the map instead.
 *
 * Deliberately *not* date-filtered either: these are annual ACS and USDA
 * figures with a published vintage, and they must not appear to move when
 * someone picks "last 7 days".
 */
export const subscribeCountyMetrics: Subscribe<AlabamaCountyData[]> = createSubscription(
  COLLECTIONS.countyMetrics,
  parseCountyMetric,
  demoCounties,
);

export const subscribeThresholdAlerts: Subscribe<ThresholdAlert[]> = createSubscription(
  COLLECTIONS.thresholdAlerts,
  parseThresholdAlert,
  demoAlerts,
);

export const subscribeScheduledReports: Subscribe<ScheduledReport[]> = createSubscription(
  COLLECTIONS.scheduledReports,
  parseScheduledReport,
  demoScheduledReports,
);

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

async function writeDoc(collectionName: string, id: string, payload: object): Promise<boolean> {
  const db = isFirebaseEnabled() ? getDb() : null;
  if (!db) return false;
  await setDoc(doc(db, collectionName, id), payload);
  return true;
}

async function removeDoc(collectionName: string, id: string): Promise<boolean> {
  const db = isFirebaseEnabled() ? getDb() : null;
  if (!db) return false;
  await deleteDoc(doc(db, collectionName, id));
  return true;
}

export async function saveScheduledReport(report: ScheduledReport): Promise<void> {
  const { id, ...payload } = report;
  const persisted = await writeDoc(COLLECTIONS.scheduledReports, id, payload);
  if (!persisted) demoScheduledReports.add(report);
}

export async function deleteScheduledReport(id: string): Promise<void> {
  const persisted = await removeDoc(COLLECTIONS.scheduledReports, id);
  if (!persisted) demoScheduledReports.remove((report) => report.id === id);
}

export async function saveThresholdAlert(alert: ThresholdAlert): Promise<void> {
  const { id, ...payload } = alert;
  const persisted = await writeDoc(COLLECTIONS.thresholdAlerts, id, payload);
  if (!persisted) demoAlerts.add(alert);
}

export async function deleteThresholdAlert(id: string): Promise<void> {
  const persisted = await removeDoc(COLLECTIONS.thresholdAlerts, id);
  if (!persisted) demoAlerts.remove((alert) => alert.id === id);
}
