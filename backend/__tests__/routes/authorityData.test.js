/**
 * POST /api/admin/authority-data — authorization date handling.
 *
 * The save route is the single write path for the authorization date, so it
 * must accept DD.MM.YYYY / DD/MM/YYYY (1-2 digit day/month) and refuse anything
 * the individual report, the bulk report and the PDFs could not print back
 * exactly as the admin meant it.
 */
jest.mock('../../config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
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

const sqlOf = (call) => String(call[0]).replace(/\s+/g, ' ').trim();

function makeToken() {
  return jwt.sign(
    { user_id: 'headteacher', username: 'headteacher', role: 'superadmin' },
    JWT_SECRET
  );
}

async function saveAuthority(body) {
  query.mockClear();
  return request(app)
    .post('/api/admin/authority-data')
    .set('Cookie', `accessToken=${makeToken()}`)
    .send({ name: 'Fr. Moses Assey', title: 'Rector', ...body });
}

function savedParams() {
  const call = query.mock.calls.find((c) => sqlOf(c).includes('INSERT INTO authority_data'));
  return call ? call[1] : null;
}

const insertCount = () =>
  query.mock.calls.filter((c) => sqlOf(c).includes('INSERT INTO authority_data')).length;

describe('POST /api/admin/authority-data authorization date', () => {
  it('stores a DD.MM.YYYY date exactly as typed', async () => {
    const res = await saveAuthority({ date: '02.05.2025' });
    expect(res.status).toBe(200);
    expect(savedParams()[4]).toBe('02.05.2025');
  });

  it('stores a DD/MM/YYYY date exactly as typed', async () => {
    const res = await saveAuthority({ date: '02/05/2026' });
    expect(res.status).toBe(200);
    expect(savedParams()[4]).toBe('02/05/2026');
  });

  it('zero-pads a date typed with single digit day and month', async () => {
    const res = await saveAuthority({ date: '2.5.2026' });
    expect(res.status).toBe(200);
    expect(savedParams()[4]).toBe('02.05.2026');

    const res2 = await saveAuthority({ date: '2/5/2026' });
    expect(res2.status).toBe(200);
    expect(savedParams()[4]).toBe('02/05/2026');
  });

  it('converts a legacy YYYY-MM-DD value to DD/MM/YYYY', async () => {
    const res = await saveAuthority({ date: '2025-05-02' });
    expect(res.status).toBe(200);
    expect(savedParams()[4]).toBe('02/05/2025');
  });

  it('saves an empty date because the field is optional', async () => {
    const res = await saveAuthority({ date: '' });
    expect(res.status).toBe(200);
    expect(savedParams()[4]).toBe('');

    const res2 = await saveAuthority({});
    expect(res2.status).toBe(200);
    expect(savedParams()[4]).toBe('');
  });

  it('rejects a date the reports could not print correctly', async () => {
    const res = await saveAuthority({ date: 'May 2025' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('DD.MM.YYYY');
    expect(res.body.message).toContain('DD/MM/YYYY');
    expect(insertCount()).toBe(0);
  });

  it('rejects a calendar date that does not exist', async () => {
    const res = await saveAuthority({ date: '31.02.2025' });
    expect(res.status).toBe(400);
    expect(insertCount()).toBe(0);
  });

  it('reads the stored date back unchanged for the admin form', async () => {
    query.mockImplementation(async (sql) => {
      if (sqlOf([sql]).includes('SELECT * FROM authority_data')) {
        return {
          rows: [
            {
              id: 1,
              name: 'Fr. Moses Assey',
              title: 'Rector',
              signature: '',
              signature_image_path: '',
              date: '02.05.2025',
            },
          ],
        };
      }
      return { rows: [], rowCount: 0 };
    });

    const res = await request(app)
      .get('/api/admin/authority-data')
      .set('Cookie', `accessToken=${makeToken()}`)
      .expect(200);

    expect(res.body.authority.date).toBe('02.05.2025');
  });
});
