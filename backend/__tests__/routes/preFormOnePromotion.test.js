jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../../utils/activityLogger', () => ({
  saveUserActivity: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../server');
const { JWT_SECRET } = require('../../middleware/auth');
const { query, withTransaction } = require('../../config/database');
const { saveUserActivity } = require('../../utils/activityLogger');

const ADMIN_TOKEN = jwt.sign(
  { user_id: 'headteacher', username: 'headteacher', role: 'superadmin' },
  JWT_SECRET
);

const NO_YEAR_PERMISSIONS = JSON.stringify({
  modules: ['pre_form_one_promotion'],
  preformone_score_subjects: { 2026: ['interview:1'] },
});
const OTHER_YEAR_TOKEN = jwt.sign(
  { user_id: 'teacher9', username: 'teacher9', role: 'teacher', permissions: NO_YEAR_PERMISSIONS },
  JWT_SECRET
);

const COHORT = [
  { id: 1, admission_number: 'P1001', first_name: 'A', middle_name: null, surname: 'One', sex: 'Male', parish: 'X', year: 2026, serial_number: 'S1' },
  { id: 2, admission_number: 'P1002', first_name: 'B', middle_name: 'M', surname: 'Two', sex: 'Female', parish: 'Y', year: 2026, serial_number: 'S2' },
  { id: 3, admission_number: 'P1003', first_name: 'C', middle_name: null, surname: 'Three', sex: 'Male', parish: 'Z', year: 2026, serial_number: 'S3' },
];

function sqlOf(call) {
  return String(call[0]).replace(/\s+/g, ' ').trim();
}

// The shared query helper also serves the auth/permission refresh lookup, which
// rejects a row without status: 'active'. Every test therefore starts from an
// empty base and only declares the Pre-Form One rows it cares about.
function mockQuery(handlers = []) {
  query.mockImplementation(async (sql, params = []) => {
    const normalized = sqlOf([sql]);
    const handler = handlers.find((h) => normalized.includes(h.matcher));
    if (handler) return handler.run(params);
    return { rows: [], rowCount: 0 };
  });
}

function buildPromotionClient({
  promoteAll = false,
  selected = COHORT,
  existingStudentIds = [],
  auditFails = false,
  insertFailsFor = [],
} = {}) {
  const calls = { inserted: [], audit: [], selectExplicit: null };
  let nextStudentId = 500;

  const client = {
    calls,
    query: jest.fn(async (sql, params = []) => {
      const normalized = sqlOf([sql]);

      if (normalized.startsWith('CREATE TABLE IF NOT EXISTS promotion_activities')) {
        return { rows: [], rowCount: 0 };
      }
      if (normalized.startsWith('INSERT INTO promotion_activities')) {
        if (auditFails) throw new Error('promotion_activities is unavailable');
        calls.audit.push(params);
        return { rows: [], rowCount: 1 };
      }
      if (normalized.includes('FROM preform_one_students p') && normalized.includes('NOT EXISTS')) {
        return { rows: promoteAll ? selected : [], rowCount: selected.length };
      }
      if (normalized.startsWith('SELECT * FROM preform_one_students WHERE id IN')) {
        calls.selectExplicit = params;
        const ids = params.slice(0, params.length - 1).map(Number);
        return { rows: selected.filter((s) => ids.includes(s.id)), rowCount: selected.length };
      }
      if (normalized.startsWith('SELECT id FROM students WHERE adm_no')) {
        const [admNo, year] = params;
        const found = existingStudentIds.some((e) => e.admNo === admNo && e.year === year);
        return { rows: found ? [{ id: 999 }] : [], rowCount: found ? 1 : 0 };
      }
      if (normalized.startsWith('INSERT INTO students')) {
        if (insertFailsFor.includes(params[0])) throw new Error('duplicate key value violates unique constraint');
        nextStudentId += 1;
        calls.inserted.push(params);
        return { rows: [{ id: nextStudentId }], rowCount: 1 };
      }
      throw new Error(`Unexpected query: ${normalized}`);
    }),
  };
  return client;
}

function runInTransaction(client) {
  withTransaction.mockImplementation(async (fn) => fn(client));
  return client;
}

const post = (year, body) =>
  request(app)
    .post(`/api/preformone-promotion/promote/${year}`)
    .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
    .send(body);

describe('Pre-Form One promotion routes', () => {
  beforeEach(() => {
    query.mockReset();
    withTransaction.mockReset();
    saveUserActivity.mockClear();
    saveUserActivity.mockResolvedValue(undefined);
    mockQuery();
  });

  describe('GET /eligible/:year', () => {
    it('flags students who already have a Form One record', async () => {
      mockQuery([
        {
          matcher: 'AS already_promoted',
          run: () => ({
            rows: [
              { id: 1, admission_number: 'P1001', already_promoted: false },
              { id: 2, admission_number: 'P1002', already_promoted: true },
            ],
            rowCount: 2,
          }),
        },
      ]);

      const res = await request(app)
        .get('/api/preformone-promotion/eligible/2026')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200);

      const call = query.mock.calls.find((c) => sqlOf(c).includes('AS already_promoted'));
      expect(sqlOf(call)).toContain('p.year = $1');
      expect(call[1]).toEqual([2026, 2027]);
      expect(res.body.data[1].already_promoted).toBe(true);
    });

    it('blocks a user without access to the year', async () => {
      const res = await request(app)
        .get('/api/preformone-promotion/eligible/2025')
        .set('Cookie', `accessToken=${OTHER_YEAR_TOKEN}`)
        .expect(403);
      expect(res.body.message).toMatch(/do not have access/i);
    });
  });

  describe('POST /promote/:year', () => {
    it('rejects a selection with no usable ids', async () => {
      const res = await post(2026, { selectedStudents: ['x', 0, -1] }).expect(200);
      expect(res.body).toEqual({
        success: false,
        message: 'No valid students selected for promotion',
      });
      expect(withTransaction).not.toHaveBeenCalled();
    });

    it('scopes an explicit selection to the source cohort', async () => {
      const client = runInTransaction(buildPromotionClient());
      const res = await post(2026, { selectedStudents: [1, 999] }).expect(200);

      expect(client.calls.selectExplicit).toEqual([1, 999, 2026]);
      expect(res.body.data.outOfCohortIds).toEqual([999]);
      expect(res.body.data.summary.successful).toBe(1);
    });

    it('refuses a selection made entirely of other-cohort ids', async () => {
      runInTransaction(buildPromotionClient({ selected: [] }));
      const res = await post(2026, { selectedStudents: [77] }).expect(200);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not belong to this Pre-Form One cohort/i);
      expect(res.body.outOfCohortIds).toEqual([77]);
    });

    it('excludes already-promoted students from promoteAll', async () => {
      const client = runInTransaction(
        buildPromotionClient({
          promoteAll: true,
          selected: COHORT,
          existingStudentIds: [{ admNo: 'P1002', year: 2027 }],
        })
      );

      const res = await post(2026, { promoteAll: true }).expect(200);

      const selectAll = client.query.mock.calls.find((c) => sqlOf(c).includes('NOT EXISTS'));
      expect(sqlOf(selectAll)).toContain("AND NOT EXISTS");
      expect(sqlOf(selectAll)).toContain("s.level = 'FORM I'");
      expect(selectAll[1]).toEqual([2026, 2027]);
      expect(res.body.data.promoted.map((p) => p.admission_number)).toEqual(['P1001', 'P1003']);
      expect(res.body.data.errors).toEqual([
        { admissionNumber: 'P1002', name: 'B Two', error: 'Student already exists in Form One' },
      ]);
      expect(res.body.data.summary).toEqual({ total: 3, successful: 2, failed: 1, skipped: 0 });
    });

    it('only accepts Form One streams and defaults the rest by sex', async () => {
      const client = runInTransaction(buildPromotionClient());
      await post(2026, {
        selectedStudents: [1, 2],
        targetStreams: { 1: 'b', 2: 'Z' },
      }).expect(200);

      const streams = client.calls.inserted.map((p) => p[6]);
      expect(streams).toEqual(['B', 'B']);
    });

    it('records the audit row inside the transaction with the resolved actor id', async () => {
      mockQuery([
        { matcher: 'FROM users WHERE username = $1', run: () => ({ rows: [{ id: 42 }], rowCount: 1 }) },
      ]);
      const client = runInTransaction(buildPromotionClient());

      await post(2026, { selectedStudents: [1, 2] }).expect(200);

      expect(client.calls.audit).toHaveLength(1);
      const [actorId, sourceYear, targetYear, promoted, failed] = client.calls.audit[0];
      expect(actorId).toBe(42);
      expect(sourceYear).toBe(2026);
      expect(targetYear).toBe(2027);
      expect(promoted).toBe(2);
      expect(failed).toBe(0);
    });

    it('falls back to a null actor id instead of crashing on an unknown user', async () => {
      mockQuery([
        { matcher: 'FROM users WHERE username = $1', run: () => ({ rows: [], rowCount: 0 }) },
      ]);
      const client = runInTransaction(buildPromotionClient());

      await post(2026, { selectedStudents: [1] }).expect(200);
      expect(client.calls.audit[0][0]).toBeNull();
    });

    it('aborts the promotion when the audit write fails', async () => {
      const client = buildPromotionClient({ auditFails: true });
      runInTransaction(client);

      await post(2026, { selectedStudents: [1, 2] }).expect(500);

      expect(client.calls.inserted).toHaveLength(2);
      expect(saveUserActivity).not.toHaveBeenCalled();
    });

    it('keeps per-student failures without aborting the rest', async () => {
      const client = runInTransaction(
        buildPromotionClient({ insertFailsFor: ['P1002'] })
      );

      const res = await post(2026, { selectedStudents: [1, 2, 3] }).expect(200);

      expect(res.body.data.summary).toEqual({ total: 3, successful: 2, failed: 1, skipped: 0 });
      expect(res.body.data.errors[0].admissionNumber).toBe('P1002');
      expect(client.calls.audit[0][3]).toBe(2);
      expect(client.calls.audit[0][4]).toBe(1);
    });

    it('returns success even when the secondary activity log fails', async () => {
      runInTransaction(buildPromotionClient());
      saveUserActivity.mockRejectedValueOnce(new Error('activity log down'));

      const res = await post(2026, { selectedStudents: [1] }).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.successful).toBe(1);
    });

    it('does not write an audit row when nothing was promoted', async () => {
      const client = runInTransaction(
        buildPromotionClient({ existingStudentIds: [{ admNo: 'P1001', year: 2027 }] })
      );

      const res = await post(2026, { selectedStudents: [1] }).expect(200);

      expect(res.body.data.summary.successful).toBe(0);
      expect(client.calls.audit).toHaveLength(0);
    });

    it('rejects an invalid year', async () => {
      await post('not-a-year', { promoteAll: true }).expect(400);
    });
  });
});
