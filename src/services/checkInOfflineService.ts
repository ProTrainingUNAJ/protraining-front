/**
 * Offline storage service for athlete check-ins using native IndexedDB.
 * Complies with KAN-330 requirements: saves check-ins when offline and synchronizes when network recovers.
 */

export interface OfflineCheckInPayload {
  sleepHours: number;
  sleepQuality: number;
  muscleSoreness: number;
  fatigueLevel: number;
  moodRate: number;
  stressLevel: number;
  effortRate?: number | null;
  isSick: boolean;
  painZones?: string | null;
  hasActiveInjury: boolean;
}

export interface OfflineCheckInRecord {
  id?: number;
  athleteId: string;
  payload: OfflineCheckInPayload;
  timestamp: string;
  synced: boolean;
}

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  records: Array<{
    id: number;
    success: boolean;
    error?: string;
  }>;
}

const DB_NAME = 'ProTrainingOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_checkins';

let dbInstance: IDBDatabase | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('athleteId', 'athleteId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Saves a check-in payload into IndexedDB when offline.
 */
export async function saveOfflineCheckIn(
  athleteId: string,
  payload: OfflineCheckInPayload,
): Promise<number> {
  const db = await getDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: OfflineCheckInRecord = {
      athleteId,
      payload,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    const request = store.add(record);

    request.onsuccess = () => {
      resolve(request.result as number);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Retrieves all pending unsynced check-ins for an athlete or all athletes.
 */
export async function getPendingCheckIns(athleteId?: string): Promise<OfflineCheckInRecord[]> {
  const db = await getDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const all: OfflineCheckInRecord[] = request.result || [];
      if (athleteId) {
        resolve(all.filter((item) => item.athleteId === athleteId));
      } else {
        resolve(all);
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Deletes a synced check-in from IndexedDB.
 */
export async function deletePendingCheckIn(id: number): Promise<void> {
  const db = await getDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Counts total pending offline check-ins.
 */
export async function countPendingCheckIns(athleteId?: string): Promise<number> {
  const items = await getPendingCheckIns(athleteId);
  return items.length;
}
