import type { SongSettings } from './settings';

/**
 * Tiny IndexedDB wrapper: one record per song plus a key/value meta store.
 * No runtime dependencies; the `LibraryStore` shape is what the tests fake.
 */

export interface SongEntry {
  id: string;
  source: string;
  settings: SongSettings;
  updatedAt: number;
}

export interface LibraryStore {
  getSongs(): Promise<SongEntry[]>;
  putSong(song: SongEntry): Promise<void>;
  deleteSong(id: string): Promise<void>;
  getMeta<T>(key: string): Promise<T | undefined>;
  putMeta(key: string, value: unknown): Promise<void>;
}

export const DB_NAME = 'spartito';
export const DB_VERSION = 1;

const SONGS = 'songs';
const META = 'meta';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

function wrap(db: IDBDatabase): LibraryStore {
  const run = <T>(store: string, mode: IDBTransactionMode, job: (s: IDBObjectStore) => IDBRequest<T>) =>
    request(job(db.transaction(store, mode).objectStore(store)));

  return {
    getSongs: () => run<SongEntry[]>(SONGS, 'readonly', (s) => s.getAll()),
    putSong: (song) => run<IDBValidKey>(SONGS, 'readwrite', (s) => s.put(song)).then(() => undefined),
    deleteSong: (id) => run<undefined>(SONGS, 'readwrite', (s) => s.delete(id)),
    getMeta: <T>(key: string) => run<T | undefined>(META, 'readonly', (s) => s.get(key)),
    putMeta: (key, value) =>
      run<IDBValidKey>(META, 'readwrite', (s) => s.put(value, key)).then(() => undefined)
  };
}

export function openLibraryDb(name = DB_NAME): Promise<LibraryStore> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(name, DB_VERSION);
    opening.onupgradeneeded = () => {
      const db = opening.result;
      if (!db.objectStoreNames.contains(SONGS)) db.createObjectStore(SONGS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    opening.onsuccess = () => resolve(wrap(opening.result));
    opening.onerror = () => reject(opening.error ?? new Error('IndexedDB open failed'));
    opening.onblocked = () =>
      reject(new Error('IndexedDB blocked: close the app in other tabs and retry.'));
  });
}
