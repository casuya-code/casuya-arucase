const {
  trackRateLimit,
  getRateLimitStatus,
  isRateLimited,
  clearRateLimit,
  getLockoutDuration,
  BASE_ATTEMPTS,
  BASE_LOCKOUT,
} = require('../../middleware/enhancedRateLimiting');

describe('enhanced rate limiting', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('progressive lockout expires at the advertised duration, not cache TTL', () => {
    const id = `lockout-expiry-${Date.now()}`;
    for (let i = 0; i < BASE_ATTEMPTS; i += 1) {
      trackRateLimit(id);
    }

    const status = getRateLimitStatus(id);
    expect(status.lockoutLevel).toBe(1);
    expect(status.lockoutUntil).toBeGreaterThan(Date.now());
    expect(isRateLimited(id)).toBe(true);

    const future = status.lockoutUntil + 1000;
    jest.spyOn(Date, 'now').mockReturnValue(future);

    const expired = getRateLimitStatus(id);
    expect(expired.lockoutLevel).toBe(0);
    expect(isRateLimited(id)).toBe(false);

    clearRateLimit(id);
  });

  test('lockout duration follows the configured base lockout', () => {
    expect(getLockoutDuration(1)).toBe(BASE_LOCKOUT);
  });
});
