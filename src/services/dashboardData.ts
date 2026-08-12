/**
 * The dashboard's single data boundary.
 *
 * Every page reads through these subscriptions. When `VITE_USE_FIREBASE=true`
 * and the config is complete they attach Firestore `onSnapshot` listeners;
 * otherwise they serve demonstration data from an in-memory store. The two
 * paths expose an identical surface, so no component knows which is active.
 *
 * Firestore documents are parsed defensively — a malformed document is skipped
 * with a console warning rather than being allowed to white-screen the
 * dashboard. Real rollup data will eventually be written by Cloud Functions,
 * but "eventually" includes a period where the schema is still moving.
 */
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { COLLECTIONS, getDb, isFirebaseEnabled } from './firebase';
import { DemoCollection } from './demoStore';
import { mockDailyInteractions, mockPantryMetrics, mockThresholdAlerts } from '../data/mockData';
import { alabamaCounties, type AlabamaCountyData } from '../data/alabamaCounties';
import type {
  DailyInteractionData,
  PantryMetric,
  ScheduledReport,
  ThresholdAlert,
} from '../types';

export type Unsubscribe = () => void;
export type DataSource = 'firestore' | 'demo';

export type Subscribe<T> = (
  onData: (data: T, source: DataSource) => void,
  onError: (error: Error) => void,
) => Unsubscribe;

// ---------------------------------------------------------------------------
// Demonstration stores
// ---------------------------------------------------------------------------

const demoPantries = new DemoCollection<PantryMetric>(mockPantryMetrics);
const demoInteractions = new DemoCollection<DailyInteractionData>(mockDailyInteractions);
const demoCounties = new DemoCollection<AlabamaCountyData>(alabamaCounties);
const demoAlerts = new DemoCollection<ThresholdAlert>(mockThresholdAlerts);
const demoScheduledReports = new DemoCollection<ScheduledReport>([]);

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

/**
 * Map a Firestore snapshot through a parser, dropping documents the parser
 * rejects. One bad document must not take down a whole collection.
 */
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

function parsePantry(id: string, data: DocumentData): PantryMetric | null {
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
    type: str(data.type, 'Walk-in') as PantryMetric['type'],
    totalVisits: num(data.totalVisits),
    totalItemsDistributed: num(data.totalItemsDistributed),
    familiesServed: num(data.familiesServed),
    avgDailyVisits: num(data.avgDailyVisits),
    growthRate: num(data.growthRate),
    topItems: strArray(data.topItems),
    isActive: bool(data.isActive, true),
    lastUpdated: str(data.lastUpdated, 'unknown'),
  };
}

function parseInteraction(id: string, data: DocumentData): DailyInteractionData | null {
  if (!isRecord(data)) return null;
  const date = str(data.date, id);
  if (!date) return null;

  const checkIns = num(data.checkIns);
  const itemScans = num(data.itemScans);
  const notificationViews = num(data.notificationViews);
  const searches = num(data.searches);
  const directions = num(data.directions);

  return {
    date,
    checkIns,
    itemScans,
    notificationViews,
    searches,
    directions,
    total: num(data.total, checkIns + itemScans + notificationViews + searches + directions),
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
// Subscription plumbing
// ---------------------------------------------------------------------------

/**
 * Build a subscription that prefers Firestore and falls back to the demo
 * store. The fallback also catches a listener that errors *after* attaching —
 * a revoked rule or dropped connection leaves the dashboard populated rather
 * than blank.
 */
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

export const subscribePantries: Subscribe<PantryMetric[]> = createSubscription(
  COLLECTIONS.pantries,
  parsePantry,
  demoPantries,
);

export const subscribeDailyInteractions: Subscribe<DailyInteractionData[]> = createSubscription(
  COLLECTIONS.dailyInteractions,
  parseInteraction,
  demoInteractions,
  'date',
);

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
