/**
 * Pre-Form One letter PDF util + admin routes (mirror of the admission form).
 */
jest.mock('../../config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  getClient: jest.fn(),
  withTransaction: jest.fn(),
  DatabaseOverloadError: class extends Error {
    constructor(msg) {
      super(msg || 'Database at capacity');
      this.name = 'DatabaseOverloadError';
      this.status = 503;
    }
  },
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../server');
const { JWT_SECRET } = require('../../middleware/auth');
const { query } = require('../../config/database');

function superadminToken() {
  return jwt.sign({ user_id: 'root', role: 'superadmin' }, JWT_SECRET);
}

describe('admin /api/admin/admission-preform-letters', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue({ rows: [] });
  });

  it('returns no form when nothing has been uploaded', async () => {
    const res = await request(app)
      .get('/api/admin/admission-preform-letters')
      .set('Cookie', `accessToken=${superadminToken()}`)
      .expect(200);

    expect(res.body).toEqual({ form: null });
  });

  it('rejects an upload with no PDF file', async () => {
    const res = await request(app)
      .post('/api/admin/admission-preform-letters')
      .set('Cookie', `accessToken=${superadminToken()}`)
      .expect(400);

    expect(res.body.message).toMatch(/No PDF file uploaded/i);
  });

  it('removes the stored Pre-Form letter', async () => {
    const res = await request(app)
      .delete('/api/admin/admission-preform-letters')
      .set('Cookie', `accessToken=${superadminToken()}`)
      .expect(200);

    expect(res.body.message).toMatch(/removed/i);
  });
});
