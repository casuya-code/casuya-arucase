import { get, set, del } from 'idb-keyval';

const CACHE_KEY = 'arucase-query-cache';

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
    removeClient: async () => {
      try {
        await del(CACHE_KEY);
      } catch { /* ignore */ }
    },
  };
}
