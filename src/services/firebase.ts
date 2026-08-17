/**
 * Firebase initialisation.
 *
 * Everything here is lazy and defensive on purpose: the dashboard must run
 * with no Firebase project at all (the demo path), with a partially filled
 * `.env` (a developer mid-setup), and with a live project — without any of
 * those three cases crashing the other two.
 *
 * A note on the API key: `VITE_FIREBASE_API_KEY` is **not** a secret. Firebase
 * web API keys are public identifiers that ship in every client bundle. Access
 * control comes from Firestore security rules and App Check, never from
 * keeping this value hidden.
 */
import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { isFirebaseEnabled, readEnv } from './firebaseStatus';

export {
  getFirebaseStatus,
  checkFirebaseConnectionStatus,
  isFirebaseEnabled,
  type FirebaseStatus,
} from './firebaseStatus';

function buildConfig(): FirebaseOptions {
  return {
    apiKey: readEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('VITE_FIREBASE_APP_ID'),
    measurementId: readEnv('VITE_FIREBASE_MEASUREMENT_ID'),
  };
}

let cachedApp: FirebaseApp | null = null;
let cachedFirestore: Firestore | null = null;
let cachedAuth: Auth | null = null;
let initialisationError: Error | null = null;

/**
 * Initialise (once) and return the Firebase app, or null when live data is
 * not enabled or initialisation failed. Callers fall back to demo data.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseEnabled()) return null;
  if (initialisationError) return null;
  if (cachedApp) return cachedApp;

  try {
    // Vite HMR can re-execute this module; reuse an existing app if present.
    cachedApp = getApps()[0] ?? initializeApp(buildConfig());
    return cachedApp;
  } catch (error) {
    initialisationError = error instanceof Error ? error : new Error(String(error));
    console.error('[firebase] initialisation failed, falling back to demo data:', initialisationError);
    return null;
  }
}

/**
 * Named Firestore database dedicated to this dashboard, separate from the
 * consumer app's `(default)` database (and from the Operator Portal's own
 * `accessbelt-operator` database) so each product's collections stay in
 * their own namespace instead of one shared list.
 */
const DATABASE_ID = 'accessbelt-agency';

export function getDb(): Firestore | null {
  if (cachedFirestore) return cachedFirestore;
  const app = getFirebaseApp();
  if (!app) return null;

  try {
    cachedFirestore = getFirestore(app, DATABASE_ID);
    return cachedFirestore;
  } catch (error) {
    console.error('[firebase] Firestore unavailable, falling back to demo data:', error);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseApp();
  if (!app) return null;

  try {
    cachedAuth = getAuth(app);
    return cachedAuth;
  } catch (error) {
    console.error('[firebase] Auth unavailable:', error);
    return null;
  }
}

/** Test seam — clears the memoised handles. */
export function resetFirebaseForTests(): void {
  cachedApp = null;
  cachedFirestore = null;
  cachedAuth = null;
  initialisationError = null;
}

/**
 * Firestore collections this dashboard reads.
 *
 * These are all *rollup* collections written by Cloud Functions, never the raw
 * event stream the AccessBelt consumer app produces. Reading raw events would
 * mean one document read per check-in, which is both slow and unbounded in
 * cost. See docs/superpowers/plans/2026-08-11-roadmap.md, Phase 3.
 */
export const COLLECTIONS = {
  pantries: 'pantries',
  dailyInteractions: 'rollupsDailyInteractions',
  countyMetrics: 'countyMetrics',
  thresholdAlerts: 'thresholdAlerts',
  scheduledReports: 'scheduledReports',
} as const;
