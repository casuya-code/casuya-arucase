jest.mock('../../config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  getClient: jest.fn(),
  withTransaction: jest.fn(),
  DatabaseOverloadError: class extends Error {
    constructor(msg) { super(msg || 'Database at capacity'); this.name = 'DatabaseOverloadError'; this.status = 503; }
  },
}));

const request = require('supertest');
const { app } = require('../../server');

describe('POST /api/cloudinary/signature', () => {
  it('rejects missing folder parameter', async () => {
    const res = await request(app)
      .post('/api/cloudinary/signature')
      .send({ timestamp: Date.now() })
      .expect(400);

    expect(res.body.error).toContain('folder');
  });

  it('rejects missing timestamp parameter', async () => {
    const res = await request(app)
      .post('/api/cloudinary/signature')
      .send({ folder: 'uploads' })
      .expect(400);

    expect(res.body.error).toContain('timestamp');
  });

  it('rejects empty body', async () => {
    const res = await request(app)
      .post('/api/cloudinary/signature')
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });
});
