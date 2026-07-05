jest.mock('../../config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  getClient: jest.fn(),
  withTransaction: jest.fn(),
  DatabaseOverloadError: class extends Error {
    constructor(msg) { super(msg || 'Database at capacity'); this.name = 'DatabaseOverloadError'; this.status = 503; }
  },
}));
jest.mock('../../utils/activityLogger', () => ({ saveUserActivity: jest.fn().mockResolvedValue() }));
jest.mock('../../middleware/bruteForceProtection', () => ({
  protectByUsername: (req, res, next) => next(),
  trackByUsername: (req, res, next) => next(),
  clearFailedAttempts: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { app } = require('../../server');
const { query } = require('../../config/database');

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET_KEY || 'dev-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || ACCESS_TOKEN_SECRET;

function resetQuery() {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
}

describe('POST /api/auth/refresh', () => {
  beforeEach(resetQuery);

  it('rejects missing refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .expect(401);

    expect(res.body.message).toBe('Refresh token required');
  });

  it('refreshes tokens successfully', async () => {
    const refreshToken = jwt.sign({ user_id: 'testuser', type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    query.mockImplementation((sql) => {
      if (typeof sql === 'string' && sql.includes('FROM refresh_tokens WHERE token')) {
        return Promise.resolve({ rows: [{ user_id: 'testuser' }] });
      }
      if (typeof sql === 'string' && sql.includes('FROM users WHERE username')) {
        return Promise.resolve({
          rows: [{ username: 'testuser', full_name: 'Test User', role: 'teacher', status: 'active', permissions: '{}', email: 'test@example.com', profile_picture: null }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body.message).toBe('Token refreshed successfully');
    expect(res.body.expiresIn).toBe(900);
  });
});

describe('POST /api/auth/logout-enhanced', () => {
  beforeEach(resetQuery);

  it('logs out successfully without a token', async () => {
    const res = await request(app)
      .post('/api/auth/logout-enhanced')
      .expect(200);

    expect(res.body.message).toBe('Logged out successfully');
  });

  it('logs out and cleans up refresh token', async () => {
    const refreshToken = jwt.sign({ user_id: 'testuser', type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    const res = await request(app)
      .post('/api/auth/logout-enhanced')
      .send({ refreshToken })
      .expect(200);

    expect(res.body.message).toBe('Logged out successfully');
  });
});

describe('POST /api/auth/login-enhanced', () => {
  beforeEach(resetQuery);

  it('logs in and returns enhanced tokens', async () => {
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
      .post('/api/auth/login-enhanced')
      .send({ username: 'testuser', password: 'testpass123' })
      .expect(200);

    expect(res.body.user.username).toBe('testuser');
    expect(res.body.user.role).toBe('teacher');
    expect(res.body.expiresIn).toBe(900);
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login-enhanced')
      .send({ username: 'nobody', password: 'testpass123' })
      .expect(401);

    expect(res.body.message).toBe('Invalid username or password');
  });
});
