import { get, set, del } from 'idb-keyval';

const CACHE_KEY = 'arucase-query-cache';

let queryClientRef = null;

/**
 * Registry so non-component modules (auth context) can reach the live
 * QueryClient without an import cycle through main.jsx.
 */
export function setQueryClient(queryClient) {
  queryClientRef = queryClient;
}

/**
 * Wipe the persisted React Query cache so a fresh login never shows
 * another user's (or a logged-out/expired session's) stale snapshot.
 * Safe to call anywhere; no-ops if storage is unavailable.
 */
export async function clearPersistedQueryCache() {
  try {
    await del(CACHE_KEY);
  } catch (e) {
    console.warn('[QueryCache] Failed to clear persisted cache:', e);
  }
}

/**
 * Drop BOTH the in-memory query cache and its IndexedDB snapshot.
 * Prevents stale/foreign data from rendering after login/logout.
 */
export async function resetQueryCacheOnAuthChange() {
  try {
    queryClientRef?.clear();
  } catch (e) {
    console.warn('[QueryCache] Failed to clear in-memory cache:', e);
  }
  await clearPersistedQueryCache();
}

function serialize(data) {
  return JSON.stringify(data, (key, value) => {
    if (typeof value === 'function') return undefined;
    if (value instanceof Error) return { message: value.message, stack: value.stack };
    return value;
  });
}

function deserialize(data) {
  if (typeof data !== 'string') return undefined;
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}

export function createIndexedDbPersister() {
  return {
    persistClient: async (client) => {
      try {
        const serialized = serialize(client);
        if (serialized) await set(CACHE_KEY, serialized);
      } catch (e) {
        console.warn('[QueryCache] Failed to persist to IndexedDB:', e);
      }
    },
    restoreClient: async () => {
      try {
        const data = await get(CACHE_KEY);
        return deserialize(data);
      } catch {
        return undefined;
      }
    },
    removeClient: clearPersistedQueryCache,
  };
}
