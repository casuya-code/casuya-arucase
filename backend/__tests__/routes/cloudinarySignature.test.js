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

function makeToken() {
  return jwt.sign({ user_id: 'testuser', role: 'admin' }, JWT_SECRET);
}

describe('POST /api/cloudinary/signature', () => {
  it('rejects missing folder parameter', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/cloudinary/signature')
      .set('Cookie', `accessToken=${token}`)
      .send({ timestamp: Date.now() })
      .expect(400);

    expect(res.body.error).toContain('folder');
  });

  it('rejects missing timestamp parameter', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/cloudinary/signature')
      .set('Cookie', `accessToken=${token}`)
      .send({ folder: 'uploads' })
      .expect(400);

    expect(res.body.error).toContain('timestamp');
  });

  it('rejects empty body', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/cloudinary/signature')
      .set('Cookie', `accessToken=${token}`)
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });
});
