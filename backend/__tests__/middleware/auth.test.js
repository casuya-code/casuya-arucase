const jwt = require('jsonwebtoken');

jest.mock('../../utils/adminModuleAccess', () => ({
  getAdminAllowedModules: jest.fn(),
  getFreshUserCached: jest.fn(),
  clearAdminModuleCache: jest.fn(),
}));
const { getAdminAllowedModules, getFreshUserCached } = require('../../utils/adminModuleAccess');

const {
  requireAuth,
  requireRole,
  requirePermission,
  requireModule,
  JWT_SECRET,
} = require('../../middleware/auth');

describe('auth middleware', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    mockReq = {
      cookies: {},
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFn = jest.fn();
    getAdminAllowedModules.mockReset();
    getAdminAllowedModules.mockResolvedValue(null);
    getFreshUserCached.mockReset();
    getFreshUserCached.mockResolvedValue(null);
  });

  describe('requireAuth', () => {
    it('passes with valid accessToken cookie', async () => {
      const token = jwt.sign({ id: 1, role: 'admin' }, JWT_SECRET);
      mockReq.cookies.accessToken = token;

      await requireAuth(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.role).toBe('admin');
    });

    it('passes with valid legacy token cookie', async () => {
      const token = jwt.sign({ id: 2, role: 'teacher' }, JWT_SECRET);
      mockReq.cookies.token = token;

      await requireAuth(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.user.id).toBe(2);
    });

    it('passes with valid Authorization header', async () => {
      const token = jwt.sign({ id: 3, role: 'superadmin' }, JWT_SECRET);
      mockReq.headers.authorization = `Bearer ${token}`;

      await requireAuth(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.user.role).toBe('superadmin');
    });

    it('applies fresh role/status/permissions from the DB', async () => {
      const token = jwt.sign({ user_id: 'admin1', role: 'admin', permissions: {} }, JWT_SECRET);
      mockReq.cookies.accessToken = token;
      getFreshUserCached.mockResolvedValue({
        role: 'teacher',
        status: 'active',
        permissions: { modules: ['individual_scores'] },
      });

      await requireAuth(mockReq, mockRes, nextFn);

      expect(getFreshUserCached).toHaveBeenCalledWith('admin1');
      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.user.role).toBe('teacher');
      expect(mockReq.user.permissions.modules).toEqual(['individual_scores']);
    });

    it('rejects a deactivated account even with a valid token', async () => {
      const token = jwt.sign({ user_id: 'inactive1', role: 'teacher', permissions: {} }, JWT_SECRET);
      mockReq.cookies.accessToken = token;
      getFreshUserCached.mockResolvedValue({ role: 'teacher', status: 'inactive', permissions: {} });

      await requireAuth(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Account is not active' });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('rejects when no token provided', async () => {
      await requireAuth(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('rejects expired token', async () => {
      const token = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '0s' });
      mockReq.cookies.accessToken = token;

      await requireAuth(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token expired' });
    });

    it('rejects invalid token', async () => {
      mockReq.cookies.accessToken = 'invalid-token';

      await requireAuth(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    });
  });

  describe('requireRole', () => {
    it('passes when user has matching role', () => {
      mockReq.user = { role: 'admin' };

      const middleware = requireRole('admin', 'superadmin');
      middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('rejects when user has non-matching role', () => {
      mockReq.user = { role: 'teacher' };

      const middleware = requireRole('admin', 'superadmin');
      middleware(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
    });

    it('is case-insensitive', () => {
      mockReq.user = { role: 'Admin' };

      const middleware = requireRole('admin');
      middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('rejects when no user', () => {
      const middleware = requireRole('admin');
      middleware(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requirePermission', () => {
    it('passes when user has the permission', () => {
      mockReq.user = { permissions: { canManageUsers: true } };

      const middleware = requirePermission('canManageUsers');
      middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('rejects when user lacks the permission', () => {
      mockReq.user = { permissions: {} };

      const middleware = requirePermission('canManageUsers');
      middleware(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('rejects when no user', () => {
      const middleware = requirePermission('canManageUsers');
      middleware(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireModule', () => {
    it('passes for superadmin regardless of modules', async () => {
      mockReq.user = { role: 'superadmin', permissions: {} };

      const middleware = requireModule('academic');
      await middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(getAdminAllowedModules).not.toHaveBeenCalled();
    });

    it('passes for admin with unrestricted (null) allowlist', async () => {
      mockReq.user = { user_id: 'admin1', role: 'admin', permissions: {} };
      getAdminAllowedModules.mockResolvedValue(null);

      const middleware = requireModule('academic');
      await middleware(mockReq, mockRes, nextFn);

      expect(getAdminAllowedModules).toHaveBeenCalledWith('admin1');
      expect(nextFn).toHaveBeenCalled();
    });

    it('passes for admin with empty allowlist (backwards compatible)', async () => {
      mockReq.user = { user_id: 'admin1', role: 'admin', permissions: {} };
      getAdminAllowedModules.mockResolvedValue([]);

      const middleware = requireModule('academic');
      await middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('passes for admin whose allowlist includes the module', async () => {
      mockReq.user = { user_id: 'admin1', role: 'admin', permissions: {} };
      getAdminAllowedModules.mockResolvedValue(['academic', 'students']);

      const middleware = requireModule('academic');
      await middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('rejects for admin whose allowlist excludes the module', async () => {
      mockReq.user = { user_id: 'admin1', role: 'admin', permissions: {} };
      getAdminAllowedModules.mockResolvedValue(['students']);

      const middleware = requireModule('academic');
      await middleware(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('passes when user has the module', async () => {
      mockReq.user = { role: 'teacher', permissions: { modules: ['academic', 'students'] } };

      const middleware = requireModule('students');
      await middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('passes when user has "all" module', async () => {
      mockReq.user = { role: 'teacher', permissions: { modules: ['all'] } };

      const middleware = requireModule('any-module');
      await middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('rejects when user lacks the module', async () => {
      mockReq.user = { role: 'teacher', permissions: { modules: ['students'] } };

      const middleware = requireModule('academic');
      await middleware(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('passes when fresh DB permissions include the module (grant applies without re-login)', async () => {
      mockReq.user = { user_id: 'teacher1', role: 'teacher', permissions: { modules: [] } };
      getFreshUserCached.mockResolvedValue({
        role: 'teacher',
        status: 'active',
        permissions: { modules: ['academic'] },
      });

      const middleware = requireModule('academic');
      await middleware(mockReq, mockRes, nextFn);

      expect(getFreshUserCached).toHaveBeenCalledWith('teacher1');
      expect(nextFn).toHaveBeenCalled();
    });

    it('rejects when fresh DB permissions exclude the module', async () => {
      mockReq.user = { user_id: 'teacher1', role: 'teacher', permissions: { modules: ['academic'] } };
      getFreshUserCached.mockResolvedValue({
        role: 'teacher',
        status: 'active',
        permissions: { modules: ['students'] },
      });

      const middleware = requireModule('academic');
      await middleware(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('falls back to JWT permissions when fresh lookup is unavailable', async () => {
      mockReq.user = { user_id: 'teacher1', role: 'teacher', permissions: { modules: ['academic'] } };
      getFreshUserCached.mockResolvedValue(null);

      const middleware = requireModule('academic');
      await middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('rejects when no user', async () => {
      const middleware = requireModule('academic');
      await middleware(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
