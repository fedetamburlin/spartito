/**
 * Durable storage: ask the browser to keep the library when it can.
 * `persist()` is a request, not a guarantee, so the UI still recommends
 * backups when the answer is no or the API is unavailable.
 */

export type PersistenceState = 'pending' | 'granted' | 'denied' | 'unsupported' | 'error';

export interface PersistenceApi {
  persisted(): Promise<boolean>;
  persist(): Promise<boolean>;
}

function defaultApi(): Partial<PersistenceApi> | undefined {
  return typeof navigator === 'undefined'
    ? undefined
    : (navigator.storage as Partial<PersistenceApi> | undefined);
}

/** Read-only check: never prompts the user. */
export async function checkPersistentStorage(
  api?: Partial<PersistenceApi> | null
): Promise<PersistenceState> {
  const storage = api ?? defaultApi();
  if (!storage || typeof storage.persisted !== 'function') return 'unsupported';

  try {
    return (await storage.persisted()) ? 'granted' : 'denied';
  } catch {
    return 'error';
  }
}

/**
 * Ask the browser to keep the library. Call this after the first real user
 * write, not on load: some browsers show a permission prompt.
 */
export async function ensurePersistentStorage(
  api?: Partial<PersistenceApi> | null
): Promise<PersistenceState> {
  const storage = api ?? defaultApi();
  if (
    !storage ||
    typeof storage.persist !== 'function' ||
    typeof storage.persisted !== 'function'
  ) {
    return 'unsupported';
  }

  try {
    if (await storage.persisted()) return 'granted';
    return (await storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'error';
  }
}
