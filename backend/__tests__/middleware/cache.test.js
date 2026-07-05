const { cacheMiddleware, clearCache, cacheStats, cacheRoutes } = require('../../middleware/cache');

describe('cache middleware', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    mockReq = { method: 'GET', originalUrl: '/api/test' };
    mockRes = {
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
    nextFn = jest.fn();
    clearCache();
  });

  describe('cacheMiddleware', () => {
    it('wraps res.json on first request and sets MISS on send', () => {
      const middleware = cacheMiddleware(60);
      middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(typeof mockRes.json).toBe('function');

      mockRes.json({ data: 'hello' });
      expect(mockRes.set).toHaveBeenCalledWith('X-Cache', 'MISS');
    });

    it('returns cached response on second request with HIT', () => {
      const middleware = cacheMiddleware(60);
      middleware(mockReq, mockRes, nextFn);
      mockRes.json({ data: 'hello' });

      const req2 = { method: 'GET', originalUrl: '/api/test' };
      const res2 = { json: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis() };
      const next2 = jest.fn();

      middleware(req2, res2, next2);

      expect(next2).not.toHaveBeenCalled();
      expect(res2.set).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(res2.json).toHaveBeenCalledWith({ data: 'hello' });
    });

    it('skips caching for non-GET requests', () => {
      mockReq.method = 'POST';
      const middleware = cacheMiddleware(60);

      middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('accepts function as durationSeconds (legacy overload)', () => {
      const fn = (req, res, next) => next();
      const middleware = cacheMiddleware(fn);

      middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('clears all cache when no pattern given', () => {
      const middleware = cacheMiddleware(60);
      middleware(mockReq, mockRes, nextFn);
      mockRes.json({ data: 'cached' });

      clearCache();

      const req2 = { method: 'GET', originalUrl: '/api/test' };
      const res2 = { json: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis() };
      const next2 = jest.fn();

      middleware(req2, res2, next2);
      expect(next2).toHaveBeenCalled();
      res2.json({ data: 'fresh' });
      expect(res2.set).toHaveBeenCalledWith('X-Cache', 'MISS');
    });
  });

  describe('cacheStats', () => {
    it('returns stats object with keys, hits, misses', () => {
      const stats = cacheStats();
      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
    });
  });

  describe('cacheRoutes', () => {
    it('exports preset cache durations', () => {
      expect(typeof cacheRoutes.dashboardStats).toBe('function');
      expect(typeof cacheRoutes.publicData).toBe('function');
      expect(typeof cacheRoutes.marksConfig).toBe('function');
    });
  });
});
