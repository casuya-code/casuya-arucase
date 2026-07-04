const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL_SECONDS, 10) || 300,
  checkperiod: 120,
  maxKeys: parseInt(process.env.CACHE_MAX_KEYS, 10) || 500,
});

function cacheMiddleware(durationSeconds) {
  if (typeof durationSeconds === 'function') {
    const fn = durationSeconds;
    return (req, res, next) => {
      if (req.method !== 'GET') return next();
      const key = `cache:${req.originalUrl}`;
      const cached = cache.get(key);
      if (cached !== undefined) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        cache.set(key, body, 300);
        res.set('X-Cache', 'MISS');
        return originalJson(body);
      };
      next();
    };
  }
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    const key = `cache:${req.originalUrl}`;
    const cached = cache.get(key);
    if (cached !== undefined) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      cache.set(key, body, durationSeconds);
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };
    next();
  };
}

function clearCache(pattern) {
  if (!pattern) {
    cache.flushAll();
    return;
  }
  const keys = cache.keys().filter((k) => k.includes(pattern));
  keys.forEach((k) => cache.del(k));
}

function cacheStats() {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ...cache.getStats(),
  };
}

const cacheRoutes = {
  dashboardStats: cacheMiddleware(300),
  publicData: cacheMiddleware(60),
  marksConfig: cacheMiddleware(600),
};

const clearCachePattern = clearCache;

module.exports = { cacheMiddleware, clearCache, cacheStats, cacheRoutes, clearCachePattern };
