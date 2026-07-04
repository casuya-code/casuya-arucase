import { get, set, del } from 'idb-keyval';

const CACHE_KEY = 'arucase-query-cache';

export function createIndexedDbPersister() {
  return {
    persistClient: async (client) => {
      try {
        await set(CACHE_KEY, client);
      } catch (e) {
        console.warn('[QueryCache] Failed to persist to IndexedDB:', e);
      }
    },
    restoreClient: async () => {
      try {
        return await get(CACHE_KEY);
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(CACHE_KEY);
      } catch {}
    },
  };
}
