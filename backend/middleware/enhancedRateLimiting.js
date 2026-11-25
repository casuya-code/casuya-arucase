/**
 * Enhanced Rate Limiting for Authentication
 * Provides progressive delays and account lockdowns.
 *
 * Lockouts use an explicit `lockoutUntil` timestamp. The cache TTL is derived
 * from that timestamp (plus a short retention window for violation history), so
 * a user is never blocked longer than the advertised lockout duration.
 *
 * NOTE: this store is process-local. Multi-instance deployments should replace
 * it with a shared Redis/DB-backed store while preserving this expiry logic.
 */
const NodeCache = require('node-cache');

// Cache for rate limiting. TTL is set per key below; the default is only a
// fallback for entries without an explicit lockout.
const rateLimitCache = new NodeCache({ stdTTL: 3600, checkperiod: 60 });

// Configuration
const BASE_ATTEMPTS = 5;
const BASE_LOCKOUT = 15 * 60; // 15 minutes
const MAX_LOCKOUT = 24 * 60 * 60; // 24 hours maximum
const PROGRESSIVE_MULTIPLIER = 2;
const HISTORY_RETENTION_SECONDS = 60 * 60; // keep violation history for 1 hour

// Track rate limit violations
const trackRateLimit = (identifier) => {
  const key = `rate_limit_${identifier}`;
  const now = Date.now();
  const current = normalizeStatus(rateLimitCache.get(key), now);

  current.count += 1;
  current.totalViolations += 1;

  // Calculate lockout level (progressive)
  if (current.count >= BASE_ATTEMPTS) {
    current.lockoutLevel += 1;
    current.count = 0; // Reset count for next cycle
    current.lockoutUntil = now + getLockoutDuration(current.lockoutLevel) * 1000;
  }

  rateLimitCache.set(key, current, getCacheTtl(current, now));
  return current;
};

// Normalize and expire stale lockout state
const normalizeStatus = (status, now = Date.now()) => {
  const current = status || { count: 0, lockoutLevel: 0, totalViolations: 0, lockoutUntil: 0 };

  if (current.lockoutUntil && now >= current.lockoutUntil) {
    current.lockoutLevel = 0;
    current.count = 0;
    current.lockoutUntil = 0;
  }

  return {
    count: current.count || 0,
    lockoutLevel: current.lockoutLevel || 0,
    totalViolations: current.totalViolations || 0,
    lockoutUntil: current.lockoutUntil || 0,
  };
};

// Get current rate limit status
const getRateLimitStatus = (identifier) => {
  const key = `rate_limit_${identifier}`;
  const now = Date.now();
  const status = normalizeStatus(rateLimitCache.get(key), now);

  // Persist the expired-state cleanup so stale lockouts do not linger.
  if (rateLimitCache.has(key)) {
    rateLimitCache.set(key, status, getCacheTtl(status, now));
  }

  return status;
};

// Check if user is rate limited
const isRateLimited = (identifier) => {
  const status = getRateLimitStatus(identifier);
  return status.lockoutLevel > 0 && Date.now() < status.lockoutUntil;
};

// Calculate lockout duration (progressive)
const getLockoutDuration = (lockoutLevel) => {
  if (lockoutLevel <= 0) return 0;
  const duration = BASE_LOCKOUT * Math.pow(PROGRESSIVE_MULTIPLIER, lockoutLevel - 1);
  return Math.min(duration, MAX_LOCKOUT);
};

// Clear rate limit on successful authentication
const clearRateLimit = (identifier) => {
  const key = `rate_limit_${identifier}`;
  rateLimitCache.del(key);
};

// Cache TTL: long enough to cover the active lockout plus a short history window.
const getCacheTtl = (status, now = Date.now()) => {
  const lockoutRemaining = status.lockoutUntil ? Math.max(0, status.lockoutUntil - now) : 0;
  return Math.ceil((lockoutRemaining + HISTORY_RETENTION_SECONDS * 1000) / 1000);
};

// Enhanced rate limiting middleware
const enhancedRateLimit = (identifierExtractor) => {
  return (req, res, next) => {
    const identifier = identifierExtractor(req);

    if (!identifier) {
      return next();
    }

    const status = getRateLimitStatus(identifier);

    if (isRateLimited(identifier)) {
      const lockoutDuration = getLockoutDuration(status.lockoutLevel);
      const remainingSeconds = Math.max(0, Math.ceil((status.lockoutUntil - Date.now()) / 1000));

      return res.status(429).json({
        message: 'Too many authentication attempts. Account temporarily locked.',
        lockoutLevel: status.lockoutLevel,
        lockoutDuration: lockoutDuration,
        remainingTime: remainingSeconds,
        totalViolations: status.totalViolations,
        retryAfter: remainingSeconds
      });
    }

    next();
  };
};

// Track failed authentication attempts
const trackAuthFailure = (identifierExtractor) => {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function(data) {
      // If response indicates authentication failure
      if (res.statusCode === 401 || res.statusCode === 403) {
        const identifier = identifierExtractor(req);
        if (identifier && identifier !== 'unknown') {
          const status = trackRateLimit(identifier);

          // Add rate limit info to response
          if (typeof data === 'object' && data !== null) {
            data.rateLimitInfo = {
              attempts: status.count,
              maxAttempts: BASE_ATTEMPTS,
              lockoutLevel: status.lockoutLevel,
              totalViolations: status.totalViolations
            };

            if (status.lockoutLevel > 0) {
              const lockoutDuration = getLockoutDuration(status.lockoutLevel);
              data.rateLimitInfo.nextLockoutDuration = lockoutDuration;
              data.rateLimitInfo.lockoutUntil = status.lockoutUntil;
            }
          }
        }
      }

      originalSend.call(this, data);
    };

    next();
  };
};

// Clear rate limit on success
const clearAuthRateLimit = (identifierExtractor) => {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function(data) {
      // If response indicates successful authentication
      if (res.statusCode === 200) {
        const identifier = identifierExtractor(req);
        if (identifier) {
          clearRateLimit(identifier);
        }
      }

      originalSend.call(this, data);
    };

    next();
  };
};

// Global rate limiting for all requests
const globalRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new NodeCache({ stdTTL: Math.floor(windowMs / 1000) });

  return (req, res, next) => {
    const key = `global_${req.ip}`;
    const current = requests.get(key) || 0;

    if (current >= maxRequests) {
      return res.status(429).json({
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.floor(requests.getTtl(key) / 1000)
      });
    }

    requests.set(key, current + 1);
    next();
  };
};

// Extractors
const extractUsername = (req) => req.body?.username || req.params?.username || 'unknown';
const extractIp = (req) => req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';

// Pre-configured middleware
const enhancedAuthRateLimit = enhancedRateLimit(extractUsername);
const trackAuthFailures = trackAuthFailure(extractUsername);
const clearAuthSuccess = clearAuthRateLimit(extractUsername);
const globalApiRateLimit = globalRateLimit(4000, 15 * 60 * 1000); // 4000 requests per 15 minutes

module.exports = {
  enhancedRateLimit,
  trackAuthFailure,
  clearAuthRateLimit,
  globalRateLimit,
  enhancedAuthRateLimit,
  trackAuthFailures,
  clearAuthSuccess,
  globalApiRateLimit,
  getRateLimitStatus,
  trackRateLimit,
  clearRateLimit,
  isRateLimited,
  getLockoutDuration,
  BASE_ATTEMPTS,
  BASE_LOCKOUT,
  MAX_LOCKOUT
};
