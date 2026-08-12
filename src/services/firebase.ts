import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, type Firestore } from 'firebase/firestore';
import type { PantryMetric, FoodDesertZone, ThresholdAlert } from '../types';
import { mockPantryMetrics, mockFoodDesertZones, mockThresholdAlerts } from '../data/mockData';

// Firebase environment configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseEnabled =
  import.meta.env.VITE_USE_FIREBASE === 'true' &&
  Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isFirebaseEnabled) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    console.log('[AccessBelt Firebase] Firestore initialized successfully.');
  } catch (error) {
    console.warn('[AccessBelt Firebase] Initialization fallback to mock data:', error);
  }
}

export const COLLECTIONS = {
  PANTRIES: 'pantries',
  FOOD_DESERTS: 'foodDeserts',
  ALERTS: 'thresholdAlerts',
  VISITS: 'dailyVisits',
};

export function getDb(): Firestore | null {
  return db;
}

export function getFirebaseStatus(): { isConnected: boolean; mode: 'Firestore Live' | 'Mock Stream' } {
  return {
    isConnected: isFirebaseEnabled && db !== null,
    mode: isFirebaseEnabled && db !== null ? 'Firestore Live' : 'Mock Stream',
  };
}

/**
 * Subscribe to Pantries in Firestore (or fallback to Mock Data)
 */
export function subscribeToPantries(callback: (pantries: PantryMetric[]) => void): () => void {
  if (db && isFirebaseEnabled) {
    const q = query(collection(db, COLLECTIONS.PANTRIES));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const pantries: PantryMetric[] = [];
        snapshot.forEach((doc) => {
          pantries.push({ id: doc.id, ...doc.data() } as PantryMetric);
        });
        callback(pantries.length > 0 ? pantries : mockPantryMetrics);
      },
      (err) => {
        console.warn('[Firebase Firestore] Error fetching pantries, using mock:', err);
        callback(mockPantryMetrics);
      }
    );
    return unsubscribe;
  }

  callback(mockPantryMetrics);
  return () => {};
}

/**
 * Subscribe to Food Desert Zones
 */
export function subscribeToFoodDeserts(callback: (zones: FoodDesertZone[]) => void): () => void {
  if (db && isFirebaseEnabled) {
    const q = query(collection(db, COLLECTIONS.FOOD_DESERTS));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const zones: FoodDesertZone[] = [];
        snapshot.forEach((doc) => {
          zones.push({ id: doc.id, ...doc.data() } as FoodDesertZone);
        });
        callback(zones.length > 0 ? zones : mockFoodDesertZones);
      },
      (err) => {
        console.warn('[Firebase Firestore] Error fetching food deserts, using mock:', err);
        callback(mockFoodDesertZones);
      }
    );
    return unsubscribe;
  }

  callback(mockFoodDesertZones);
  return () => {};
}

/**
 * Subscribe to Threshold Alerts
 */
export function subscribeToThresholdAlerts(callback: (alerts: ThresholdAlert[]) => void): () => void {
  if (db && isFirebaseEnabled) {
    const q = query(collection(db, COLLECTIONS.ALERTS));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const alerts: ThresholdAlert[] = [];
        snapshot.forEach((doc) => {
          alerts.push({ id: doc.id, ...doc.data() } as ThresholdAlert);
        });
        callback(alerts.length > 0 ? alerts : mockThresholdAlerts);
      },
      (err) => {
        console.warn('[Firebase Firestore] Error fetching alerts, using mock:', err);
        callback(mockThresholdAlerts);
      }
    );
    return unsubscribe;
  }

  callback(mockThresholdAlerts);
  return () => {};
}

export function checkFirebaseConnectionStatus(): { isConnected: boolean; mode: 'Firestore Live' | 'Mock Stream' } {
  return getFirebaseStatus();
}
