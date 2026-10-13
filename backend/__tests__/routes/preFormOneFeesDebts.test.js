/**
 * Pre-Form One fees announcements + individual debt routes.
 *
 * These reuse the shared fees_announcements / individual_debt tables with
 * level 'PRE-FORM ONE' and key debts by the Pre-Form One student id.
 */
jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  withTransaction: jest.fn(),
  DatabaseOverloadError: class extends Error {},
}));

jest.mock('../../utils/activityLogger', () => ({
  saveUserActivity: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../server');
const { JWT_SECRET } = require('../../middleware/auth');
const { query, withTransaction } = require('../../config/database');

const ADMIN_TOKEN = jwt.sign(
  { user_id: 'headteacher', username: 'headteacher', role: 'superadmin' },
  JWT_SECRET
);

const sqlOf = (call) => String(call[0]).replace(/\s+/g, ' ').trim();

function clientMock(rowsForStudentList = []) {
  return {
    query: jest.fn(async (sql) => {
      const normalized = sqlOf([sql]);
      if (normalized.startsWith('SELECT id FROM preform_one_students')) {
        return { rows: rowsForStudentList, rowCount: rowsForStudentList.length };
      }
      return { rows: [], rowCount: 0 };
    }),
  };
}

describe('Pre-Form One fees + debt routes', () => {
  beforeEach(() => {
    query.mockReset();
    withTransaction.mockReset();
  });

  describe('GET /:year/fees-announcements', () => {
    it('returns the announcement map scoped to PRE-FORM ONE', async () => {
      query.mockImplementation(async (sql) => {
        if (sqlOf([sql]).includes('FROM fees_announcements')) {
          return { rows: [{ announcement_index: '1', announcement_text: 'Lipa ada' }] };
        }
        return { rows: [] };
      });

      const res = await request(app)
        .get('/api/pre-form-one/2026/fees-announcements')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200);

      expect(res.body.announcements).toEqual({ 1: 'Lipa ada' });
      const call = query.mock.calls.find((c) => sqlOf(c).includes('FROM fees_announcements'));
      expect(call[1]).toEqual(['PRE-FORM ONE', 'NA', 2026, 'Second Term']);
    });
  });

  describe('POST /:year/fees-announcements', () => {
    const post = (body) =>
      request(app)
        .post('/api/pre-form-one/2026/fees-announcements')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .send(body);

    it('rejects a missing announcements object', async () => {
      await post({}).expect(400);
      expect(withTransaction).not.toHaveBeenCalled();
    });

    it('upserts filled slots and deletes emptied ones', async () => {
      const client = clientMock();
      withTransaction.mockImplementation(async (fn) => fn(client));

      await post({ announcements: { 1: 'Lipa ada', 2: '   ' } }).expect(200);

      const insert = client.query.mock.calls.find((c) =>
        sqlOf(c).startsWith('INSERT INTO fees_announcements')
      );
      expect(insert[1]).toEqual(['PRE-FORM ONE', 'NA', 2026, 'Second Term', '1', 'Lipa ada']);

      const deletes = client.query.mock.calls.filter((c) =>
        sqlOf(c).startsWith('DELETE FROM fees_announcements')
      );
      // Slot 2 (blank) plus the 8 untouched slots (3-10) are cleared.
      expect(deletes.length).toBeGreaterThanOrEqual(1);
      expect(deletes.map((c) => c[1][4])).toContain('2');
    });
  });

  describe('GET /:year/debts', () => {
    it('returns students and a debt map keyed by student id', async () => {
      query.mockImplementation(async (sql) => {
        const s = sqlOf([sql]);
        if (s.includes('FROM preform_one_students')) {
          return { rows: [{ id: 5, admission_number: 'PF-1', first_name: 'Juma', surname: 'M' }] };
        }
        if (s.includes('FROM individual_debt')) {
          return {
            rows: [{ student_index: '5', amount: '1000', description: 'Ada', due_date: '', status: 'Outstanding' }],
          };
        }
        return { rows: [] };
      });

      const res = await request(app)
        .get('/api/pre-form-one/2026/debts')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200);

      expect(res.body.students).toHaveLength(1);
      expect(res.body.debts['5']).toEqual({ amount: 1000, description: 'Ada', due_date: '', status: 'Outstanding' });
    });
  });

  describe('POST /:year/debts', () => {
    const post = (body) =>
      request(app)
        .post('/api/pre-form-one/2026/debts')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .send(body);

    it('rejects a missing student_id', async () => {
      await post({ amount: 100 }).expect(400);
      expect(withTransaction).not.toHaveBeenCalled();
    });

    it('rejects a negative amount', async () => {
      query.mockImplementation(async (sql) => {
        if (sqlOf([sql]).includes('FROM preform_one_students')) return { rows: [{ id: 5 }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      });
      const res = await post({ student_id: 5, amount: -1 }).expect(400);
      expect(res.body.message).toMatch(/non-negative/i);
    });

    it('returns 404 for a student outside the year', async () => {
      query.mockImplementation(async () => ({ rows: [], rowCount: 0 }));
      await post({ student_id: 999, amount: 100 }).expect(404);
    });

    it('inserts the debt keyed by the student id', async () => {
      query.mockImplementation(async (sql) => {
        if (sqlOf([sql]).includes('FROM preform_one_students')) return { rows: [{ id: 5 }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      });
      const client = clientMock();
      withTransaction.mockImplementation(async (fn) => fn(client));

      await post({ student_id: 5, amount: 1500, description: 'Ada' }).expect(200);

      const insert = client.query.mock.calls.find((c) => sqlOf(c).startsWith('INSERT INTO individual_debt'));
      expect(insert[1]).toEqual(['PRE-FORM ONE', 'NA', 2026, '5', 1500, 'Ada', '', 'Outstanding']);
    });

    it('clears a zero-amount debt with no description without inserting', async () => {
      query.mockImplementation(async (sql) => {
        if (sqlOf([sql]).includes('FROM preform_one_students')) return { rows: [{ id: 5 }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      });

      const res = await post({ student_id: 5, amount: 0, description: '' }).expect(200);
      expect(res.body.deleted).toBe(true);
      expect(withTransaction).not.toHaveBeenCalled();
      const del = query.mock.calls.find((c) => sqlOf(c).startsWith('DELETE FROM individual_debt'));
      expect(del).toBeDefined();
      expect(del[1]).toEqual(['PRE-FORM ONE', 'NA', 2026, '5']);
    });
  });

  describe('POST /:year/debts/bulk', () => {
    it('reports saved and failed counts, skipping unknown students', async () => {
      const client = clientMock([{ id: 1 }]);
      withTransaction.mockImplementation(async (fn) => fn(client));

      const res = await request(app)
        .post('/api/pre-form-one/2026/debts/bulk')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .send({ debts: [{ student_id: 1, amount: 100, description: 'Ada' }, { student_id: 999, amount: 50 }] })
        .expect(200);

      expect(res.body).toMatchObject({ success: true, saved: 1, failed: 1 });
    });

    it('rejects an empty payload', async () => {
      await request(app)
        .post('/api/pre-form-one/2026/debts/bulk')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .send({ debts: [] })
        .expect(400);
    });
  });

  describe('DELETE /:year/debts/:studentId', () => {
    it('deletes the debt for the student', async () => {
      query.mockResolvedValue({ rows: [], rowCount: 0 });

      await request(app)
        .delete('/api/pre-form-one/2026/debts/5')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200);

      const del = query.mock.calls.find((c) => sqlOf(c).startsWith('DELETE FROM individual_debt'));
      expect(del[1]).toEqual(['PRE-FORM ONE', 'NA', 2026, '5']);
    });
  });
});
