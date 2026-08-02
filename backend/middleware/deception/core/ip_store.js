function createIpStore(ttlMs = 24 * 60 * 60 * 1000) {
  const entries = new Map();

  function get(key) {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function set(key, value, ttl = ttlMs) {
    entries.set(key, { value, expires: Date.now() + ttl });
  }

  function increment(key, maxEntries = 10000) {
    if (entries.size > maxEntries) {
      const now = Date.now();
      for (const [k, entry] of entries) {
        if (now > entry.expires) entries.delete(k);
      }
    }
    const current = get(key) || 0;
    set(key, current + 1, 60000);
    return current + 1;
  }

  return { get, set, increment };
}

module.exports = { createIpStore };
