jest.mock('../../config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  getClient: jest.fn(),
  withTransaction: jest.fn(),
  DatabaseOverloadError: class extends Error {
    constructor(msg) { super(msg || 'Database at capacity'); this.name = 'DatabaseOverloadError'; this.status = 503; }
  },
}));
jest.mock('../../utils/activityLogger', () => ({ saveUserActivity: jest.fn().mockResolvedValue() }));
jest.mock('../../utils/staffPresence', () => ({
  setIO: jest.fn(),
  recordHeartbeat: jest.fn(),
  getOnlineCount: jest.fn(() => 0),
}));
jest.mock('../../utils/userProfilePhoto', () => ({
  ensureUserProfilePhotoColumns: jest.fn(),
  userProfilePhotoUpload: jest.fn((req, res, next) => next()),
  removeStoredUserProfilePhoto: jest.fn(),
  userHasProfilePhoto: jest.fn(() => false),
}));
jest.mock('../../utils/staffUserPhotoSync', () => ({
  syncPhotoFromUserToStaffProfile: jest.fn(() => false),
  clearStaffProfilePhotoForUser: jest.fn(),
}));
jest.mock('../../middleware/bruteForceProtection', () => ({
  protectByUsername: (req, res, next) => next(),
  trackByUsername: (req, res, next) => next(),
  clearFailedAttempts: jest.fn(),
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { app } = require('../../server');
const { query } = require('../../config/database');
const { JWT_SECRET } = require('../../middleware/auth');

function resetQuery() {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
}

describe('POST /api/auth/login', () => {
  beforeEach(resetQuery);

  it('logs in successfully and returns a token', async () => {
    const passwordHash = await bcrypt.hash('testpass123', 4);
    query.mockImplementation((sql) => {
      if (typeof sql === 'string' && sql.includes('FROM users WHERE username')) {
        return Promise.resolve({
          rows: [{ username: 'testuser', full_name: 'Test User', role: 'teacher', status: 'active', permissions: '{}', email: 'test@example.com', password_hash: passwordHash }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass123' })
      .expect(200);

    expect(res.body.user.username).toBe('testuser');
    expect(res.body.user.role).toBe('teacher');
    expect(res.body.token).toBeDefined();
    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    expect(decoded.user_id).toBe('testuser');
  });

  it('rejects invalid username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'testpass123' })
      .expect(401);

    expect(res.body.message).toBe('Invalid username or password');
  });

  it('rejects wrong password', async () => {
    const passwordHash = await bcrypt.hash('correctpass', 4);
    query.mockImplementation((sql) => {
      if (typeof sql === 'string' && sql.includes('FROM users WHERE username')) {
        return Promise.resolve({
          rows: [{ username: 'testuser', full_name: 'Test User', role: 'teacher', status: 'active', permissions: '{}', email: 'test@example.com', password_hash: passwordHash }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'wrongpass' })
      .expect(401);

    expect(res.body.message).toBe('Invalid username or password');
  });

  it('rejects inactive account', async () => {
    const passwordHash = await bcrypt.hash('testpass123', 4);
    query.mockImplementation((sql) => {
      if (typeof sql === 'string' && sql.includes('FROM users WHERE username')) {
        return Promise.resolve({
          rows: [{ username: 'inactiveuser', full_name: 'Inactive', role: 'teacher', status: 'inactive', permissions: '{}', email: 'test@example.com', password_hash: passwordHash }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'inactiveuser', password: 'testpass123' })
      .expect(403);

    expect(res.body.message).toBe('Account is not active');
  });
});

describe('POST /api/auth/logout', () => {
  it('logs out successfully without a token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .expect(200);

    expect(res.body.message).toBe('Logged out successfully');
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign({ user_id: 'testuser', role: 'admin' }, JWT_SECRET);
  });

  beforeEach(resetQuery);

  it('returns user data for authenticated user', async () => {
    query.mockImplementation((sql) => {
      if (typeof sql === 'string' && sql.includes('FROM users WHERE username')) {
        return Promise.resolve({
          rows: [{ username: 'testuser', full_name: 'Test User', role: 'admin', status: 'active', permissions: '{}', email: 'test@example.com', profile_picture: null, phone: null, bio: null, department: null, position: null }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `accessToken=${token}`)
      .expect(200);

    expect(res.body.user.username).toBe('testuser');
    expect(res.body.user.full_name).toBe('Test User');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .expect(401);

    expect(res.body.message).toBe('Authentication required');
  });

  it('returns 404 for non-existent user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `accessToken=${token}`)
      .expect(404);

    expect(res.body.message).toBe('User not found');
  });
});

describe('GET /api/auth/presence/online-count', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign({ user_id: 'testuser', role: 'admin' }, JWT_SECRET);
  });

  it('returns online count for authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/presence/online-count')
      .set('Cookie', `accessToken=${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('count');
    expect(typeof res.body.count).toBe('number');
  });
});
