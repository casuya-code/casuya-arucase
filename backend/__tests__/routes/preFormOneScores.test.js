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

const ALLOCATION_PERMISSIONS = JSON.stringify({
  modules: ['pre_form_one_scores'],
  preformone_score_subjects: { 2026: ['interview:1'] },
});
const TEACHER_TOKEN = jwt.sign(
  { user_id: 'teacher1', username: 'teacher1', role: 'teacher', permissions: ALLOCATION_PERMISSIONS },
  JWT_SECRET
);

function sqlOf(call) {
  return String(call[0]).replace(/\s+/g, ' ').trim();
}

function findCall(matcher) {
  return query.mock.calls.find((call) => sqlOf(call).includes(matcher));
}

// The request logger and the fresh-permissions lookup also use the shared
// query helper, so "no query" has to mean "no Pre-Form One query".
function preFormOneCalls() {
  return query.mock.calls.filter((call) => /preform|preformone/i.test(sqlOf(call)));
}

describe('Pre-Form One score routes', () => {
  beforeEach(() => {
    query.mockReset();
    withTransaction.mockReset();
  });

  describe('GET /subject/:subjectId year isolation', () => {
    it('scopes the score query to the authorized year', async () => {
      query.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .get('/api/preformone-scores/subject/1?type=interview&year=2026')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200);

      const call = findCall('sc.subject_id = $1 AND sc.subject_type = $2');
      expect(call).toBeDefined();
      expect(sqlOf(call)).toContain('st.year = $3');
      expect(call[1]).toEqual(['1', 'interview', 2026]);
      expect(res.body.success).toBe(true);
    });

    it('rejects an invalid subject type', async () => {
      const res = await request(app)
        .get('/api/preformone-scores/subject/1?type=bogus&year=2026')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(400);

      expect(res.body.message).toMatch(/Invalid subject type/i);
      expect(preFormOneCalls()).toHaveLength(0);
    });

    it('requires a year', async () => {
      await request(app)
        .get('/api/preformone-scores/subject/1?type=interview')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(400);
    });

    it('refuses a subject outside the user allocation', async () => {
      const res = await request(app)
        .get('/api/preformone-scores/subject/7?type=interview&year=2026')
        .set('Cookie', `accessToken=${TEACHER_TOKEN}`)
        .expect(403);

      expect(res.body.message).toMatch(/not allocated/i);
      expect(preFormOneCalls()).toHaveLength(0);
    });
  });

  describe('POST / strict score validation', () => {
    const post = (body) =>
      request(app)
        .post('/api/preformone-scores')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .send(body);

    it('rejects a fractional score', async () => {
      const res = await post({
        student_id: 1,
        subject_id: 1,
        subject_type: 'interview',
        score: 72.5,
      }).expect(400);

      expect(res.body.message).toMatch(/whole number/i);
      expect(preFormOneCalls()).toHaveLength(0);
      expect(withTransaction).not.toHaveBeenCalled();
    });

    it('rejects an out-of-range score', async () => {
      await post({ student_id: 1, subject_id: 1, subject_type: 'interview', score: 140 }).expect(400);
    });

    it('rejects a non-numeric score', async () => {
      const res = await post({
        student_id: 1,
        subject_id: 1,
        subject_type: 'interview',
        score: 'eighty',
      }).expect(400);
      expect(res.body.message).toMatch(/whole number|between 0 and 100/i);
    });

    it('rejects an unknown subject type', async () => {
      const res = await post({
        student_id: 1,
        subject_id: 1,
        subject_type: 'other',
        score: 50,
      }).expect(400);
      expect(res.body.message).toMatch(/interview or continuing/i);
    });

    it('rejects a missing score', async () => {
      await post({ student_id: 1, subject_id: 1, subject_type: 'interview' }).expect(400);
    });

    it('stores the canonical grade and the resolved numeric created_by', async () => {
      query.mockImplementation(async (sql) => {
        if (String(sql).includes('FROM preform_one_students WHERE id = $1')) {
          return { rows: [{ id: 1, year: 2026 }], rowCount: 1 };
        }
        if (String(sql).includes('FROM users WHERE username = $1')) {
          return { rows: [{ id: 42 }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });

      const client = {
        query: jest.fn(async (sql) => {
          const normalized = sqlOf([sql]);
          if (normalized.includes('SELECT id FROM preform_one_scores')) {
            return { rows: [], rowCount: 0 };
          }
          if (normalized.startsWith('INSERT INTO preform_one_scores')) {
            return { rows: [{ id: 5 }], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        }),
      };
      withTransaction.mockImplementation(async (fn) => fn(client));

      const res = await post({
        student_id: 1,
        subject_id: 1,
        subject_type: 'interview',
        score: 83,
      }).expect(200);

      const insertCall = client.query.mock.calls.find((c) => sqlOf(c).startsWith('INSERT INTO preform_one_scores'));
      expect(insertCall[1]).toEqual([1, 1, 'interview', 83, 'A', undefined, 42]);
      expect(res.body.success).toBe(true);
    });

    it('does not fall back to user id 1 when the username cannot be resolved', async () => {
      query.mockImplementation(async (sql) => {
        if (String(sql).includes('FROM preform_one_students WHERE id = $1')) {
          return { rows: [{ id: 1, year: 2026 }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });

      const client = {
        query: jest.fn(async (sql) => {
          if (sqlOf([sql]).includes('SELECT id FROM preform_one_scores')) return { rows: [], rowCount: 0 };
          return { rows: [{ id: 5 }], rowCount: 1 };
        }),
      };
      withTransaction.mockImplementation(async (fn) => fn(client));

      await post({ student_id: 1, subject_id: 1, subject_type: 'interview', score: 50 }).expect(200);

      const insertCall = client.query.mock.calls.find((c) => sqlOf(c).startsWith('INSERT INTO preform_one_scores'));
      expect(insertCall[1][6]).toBeNull();
    });

    it('requires an explicit subject type instead of silently defaulting to interview', async () => {
      const res = await post({ student_id: 1, subject_id: 1, score: 70 }).expect(400);
      expect(res.body.message).toMatch(/subject type is required/i);
      expect(withTransaction).not.toHaveBeenCalled();
    });
  });

  describe('POST /bulk reporting', () => {
    const bulk = (scores) =>
      request(app)
        .post('/api/preformone-scores/bulk')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .send({ scores });

    it('reports accurate saved and skipped counts', async () => {
      query.mockResolvedValue({ rows: [], rowCount: 0 });

      const client = {
        query: jest.fn(async (sql) => {
          const normalized = sqlOf([sql]);
          if (normalized.includes('SELECT id FROM preform_one_scores')) {
            return { rows: [], rowCount: 0 };
          }
          if (normalized.startsWith('SELECT id, year FROM preform_one_students WHERE id = ANY')) {
            return { rows: [{ id: 1, year: 2026 }, { id: 2, year: 2026 }], rowCount: 2 };
          }
          if (normalized.includes('FROM users WHERE username = $1')) {
            return { rows: [{ id: 42 }], rowCount: 1 };
          }
          return { rows: [{ id: 9 }], rowCount: 1 };
        }),
      };
      withTransaction.mockImplementation(async (fn) => fn(client));

      const res = await bulk([
        { student_id: 1, subject_id: 1, subject_type: 'interview', score: 70 },
        { student_id: 2, subject_id: 1, subject_type: 'interview', score: 70.4 },
        { student_id: 999, subject_id: 1, subject_type: 'interview', score: 70 },
      ]).expect(200);

      expect(res.body.summary).toEqual({ received: 3, saved: 1, skipped: 2 });
      expect(res.body.skipped).toHaveLength(2);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.message).toMatch(/1 saved, 2 skipped/);
    });

    it('rejects an empty payload', async () => {
      await bulk([]).expect(400);
    });
  });

  describe('GET /stats/:subjectId year isolation', () => {
    it('scopes the statistics join to the requested year', async () => {
      query.mockResolvedValue({
        rows: [
          {
            total_students: 2,
            scored_students: 1,
            average_score: '70.00',
            highest_score: 70,
            lowest_score: 70,
            passed_students: 1,
            grade_a: 0,
            grade_b: 1,
            grade_c: 0,
            grade_d: 0,
            grade_f: 0,
          },
        ],
      });

      await request(app)
        .get('/api/preformone-scores/stats/1?type=interview&year=2026')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200);

      const call = findCall('COUNT(sc.score) as scored_students');
      expect(sqlOf(call)).toContain('WHERE st.year = $3');
      expect(sqlOf(call)).toContain('sc.score >= 65');
      expect(call[1]).toEqual(['1', 'interview', 2026]);
    });
  });
});
