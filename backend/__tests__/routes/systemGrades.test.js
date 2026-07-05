jest.mock('../../config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  getClient: jest.fn(),
  withTransaction: jest.fn(),
  DatabaseOverloadError: class extends Error {
    constructor(msg) { super(msg || 'Database at capacity'); this.name = 'DatabaseOverloadError'; this.status = 503; }
  },
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../server');
const { JWT_SECRET } = require('../../middleware/auth');

describe('GET /api/system/grade-config', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign({ id: 1, role: 'admin' }, JWT_SECRET);
  });

  it('returns grade config for authenticated user', async () => {
    const res = await request(app)
      .get('/api/system/grade-config')
      .set('Cookie', `accessToken=${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('oLevel');
    expect(res.body.data).toHaveProperty('aLevel');
    expect(res.body.data.oLevel).toHaveLength(5);
    expect(res.body.data.aLevel).toHaveLength(7);
    expect(res.body.data.oLevel[0].grade).toBe('A');
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .get('/api/system/grade-config')
      .expect(401);

    expect(res.body.message).toBe('Authentication required');
  });

  it('returns grades with correct score ranges', async () => {
    const res = await request(app)
      .get('/api/system/grade-config')
      .set('Cookie', `accessToken=${token}`)
      .expect(200);

    const oLevel = res.body.data.oLevel;
    expect(oLevel[0].min).toBe(85);
    expect(oLevel[0].max).toBe(100);
    expect(oLevel[4].min).toBe(0);
    expect(oLevel[4].max).toBe(39);
  });
});
