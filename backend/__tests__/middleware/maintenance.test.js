jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
jest.mock('../../middleware/auth', () => ({ JWT_SECRET: 'test-secret' }));
jest.mock('../../utils/adminModuleAccess', () => ({ getFreshUserCached: jest.fn() }));
jest.mock('../../utils/maintenance', () => ({ getMaintenanceState: jest.fn() }));

const jwt = require('jsonwebtoken');
const { getFreshUserCached } = require('../../utils/adminModuleAccess');
const { getMaintenanceState } = require('../../utils/maintenance');
const { maintenanceGuard, isExemptPath } = require('../../middleware/maintenance');

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    setHeader(name, value) { this.headers[name] = value; },
  };
  return res;
}

describe('maintenance guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exempts auth, status and health paths', () => {
    expect(isExemptPath('/auth/login')).toBe(true);
    expect(isExemptPath('/maintenance/status')).toBe(true);
    expect(isExemptPath('/health/database')).toBe(true);
    expect(isExemptPath('/students')).toBe(false);
  });

  it('lets traffic through when maintenance is inactive', async () => {
    getMaintenanceState.mockResolvedValue({ active: false, mode: 'everyone' });
    const next = jest.fn();
    await maintenanceGuard({ method: 'GET', path: '/students', headers: {}, cookies: {} }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks public traffic in everyone mode', async () => {
    getMaintenanceState.mockResolvedValue({
      active: true, mode: 'everyone', message: 'Down', startsAt: null, endsAt: null,
    });
    const res = mockRes();
    const next = jest.fn();
    await maintenanceGuard({ method: 'GET', path: '/students', headers: {}, cookies: {} }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ maintenance: true, message: 'Down' });
  });

  it('lets a superadmin through while maintenance is active', async () => {
    getMaintenanceState.mockResolvedValue({ active: true, mode: 'everyone' });
    jwt.verify.mockReturnValue({ user_id: 'SUPERADMIN', role: 'superadmin' });
    getFreshUserCached.mockResolvedValue({ role: 'superadmin', status: 'active' });
    const next = jest.fn();
    await maintenanceGuard(
      { method: 'GET', path: '/students', headers: { authorization: 'Bearer token' }, cookies: {} },
      mockRes(),
      next
    );
    expect(next).toHaveBeenCalled();
  });

  it('leaves the public site open in logged_in mode', async () => {
    getMaintenanceState.mockResolvedValue({ active: true, mode: 'logged_in' });
    const next = jest.fn();
    await maintenanceGuard({ method: 'GET', path: '/students', headers: {}, cookies: {} }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks a logged-in normal user in logged_in mode', async () => {
    getMaintenanceState.mockResolvedValue({
      active: true, mode: 'logged_in', message: 'Down', startsAt: null, endsAt: null,
    });
    jwt.verify.mockReturnValue({ user_id: 'teacher1', role: 'teacher' });
    getFreshUserCached.mockResolvedValue({ role: 'teacher', status: 'active' });
    const res = mockRes();
    const next = jest.fn();
    await maintenanceGuard(
      { method: 'GET', path: '/students', headers: { authorization: 'Bearer token' }, cookies: {} },
      res,
      next
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
  });

  it('treats an expired token as logged out (so refresh/login still works)', async () => {
    getMaintenanceState.mockResolvedValue({ active: true, mode: 'logged_in' });
    jwt.verify.mockImplementation(() => { throw new Error('expired'); });
    const next = jest.fn();
    await maintenanceGuard(
      { method: 'GET', path: '/students', headers: { authorization: 'Bearer old' }, cookies: {} },
      mockRes(),
      next
    );
    expect(next).toHaveBeenCalled();
  });
});
