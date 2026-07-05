const jwt = require('jsonwebtoken');
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
  });

  describe('requireAuth', () => {
    it('passes with valid accessToken cookie', () => {
      const token = jwt.sign({ id: 1, role: 'admin' }, JWT_SECRET);
      mockReq.cookies.accessToken = token;

      requireAuth(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.role).toBe('admin');
    });

    it('passes with valid legacy token cookie', () => {
      const token = jwt.sign({ id: 2, role: 'teacher' }, JWT_SECRET);
      mockReq.cookies.token = token;

      requireAuth(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.user.id).toBe(2);
    });

    it('passes with valid Authorization header', () => {
      const token = jwt.sign({ id: 3, role: 'superadmin' }, JWT_SECRET);
      mockReq.headers.authorization = `Bearer ${token}`;

      requireAuth(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.user.role).toBe('superadmin');
    });

    it('rejects when no token provided', () => {
      requireAuth(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('rejects expired token', () => {
      const token = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '0s' });
      mockReq.cookies.accessToken = token;

      requireAuth(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token expired' });
    });

    it('rejects invalid token', () => {
      mockReq.cookies.accessToken = 'invalid-token';

      requireAuth(mockReq, mockRes, nextFn);

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
    it('passes for admin/superadmin regardless of modules', () => {
      mockReq.user = { role: 'admin', permissions: {} };

      const middleware = requireModule('academic');
      middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('passes when user has the module', () => {
      mockReq.user = { role: 'teacher', permissions: { modules: ['academic', 'students'] } };

      const middleware = requireModule('students');
      middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('passes when user has "all" module', () => {
      mockReq.user = { role: 'teacher', permissions: { modules: ['all'] } };

      const middleware = requireModule('any-module');
      middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('rejects when user lacks the module', () => {
      mockReq.user = { role: 'teacher', permissions: { modules: ['students'] } };

      const middleware = requireModule('academic');
      middleware(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('rejects when no user', () => {
      const middleware = requireModule('academic');
      middleware(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
