const { securityMonitor } = require('../../middleware/securityHeaders');

describe('securityMonitor', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  const invoke = (req) => {
    const next = jest.fn();
    const res = { on: jest.fn() };
    securityMonitor(req, res, next);
    return next;
  };

  test('logs only a redacted summary for suspicious requests', () => {
    const req = {
      ip: '203.0.113.10',
      method: 'POST',
      url: '/api/login?token=query-secret',
      originalUrl: '/api/login?token=query-secret',
      headers: { 'user-agent': 'test-agent' },
      body: {
        email: 'student@example.com',
        password: 'super-secret-password',
        comment: '<script>alert(1)</script>',
      },
      query: { token: 'query-secret' },
    };

    const next = invoke(req);

    expect(next).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(warnSpy.mock.calls[0]);
    expect(logged).toContain('bodyKeys');
    expect(logged).toContain('queryKeys');
    expect(logged).not.toContain('super-secret-password');
    expect(logged).not.toContain('student@example.com');
    expect(logged).not.toContain('query-secret');
  });

  test('does not throw on circular request bodies', () => {
    const body = { note: '../etc/passwd' };
    body.self = body;
    const req = {
      ip: '203.0.113.11',
      method: 'POST',
      url: '/api/../upload',
      originalUrl: '/api/../upload',
      headers: {},
      body,
      query: {},
    };

    expect(() => invoke(req)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
