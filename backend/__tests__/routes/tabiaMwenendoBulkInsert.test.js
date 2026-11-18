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

jest.mock('../../utils/activityLogger', () => ({
  saveUserActivity: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../server');
const { JWT_SECRET } = require('../../middleware/auth');
const { withTransaction } = require('../../config/database');

const ADMIN_TOKEN = jwt.sign(
  { user_id: 'admin', username: 'admin', role: 'superadmin' },
  JWT_SECRET
);

function buildClient() {
  const calls = { insert: null };
  const client = {
    query: jest.fn(async (sql, params = []) => {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();

      if (normalized.startsWith('SELECT id, level, stream, year, term FROM tabia_mwenendo')) {
        return { rows: [], rowCount: 0 };
      }
      if (normalized.startsWith('DELETE FROM tabia_mwenendo')) {
        return { rows: [], rowCount: 0 };
      }
      if (normalized.startsWith('INSERT INTO tabia_mwenendo')) {
        calls.insert = { sql: normalized, params };
        return { rows: [], rowCount: params.length / 7 };
      }

      throw new Error(`Unexpected query: ${normalized}`);
    }),
  };
  return { client, calls };
}

const postTabia = (evaluations) =>
  request(app)
    .post('/api/students/tabia-mwenendo')
    .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
    .send({
      level: 'FORM II',
      stream: 'A',
      year: 2026,
      term: 'Second Term',
      evaluations,
      replaceScope: true,
    });

function evaluation(index) {
  return {
    adm_no: String(1800 + index),
    criterion: String(901 + (index % 11)),
    evaluation: ['A', 'B', 'C', 'D', 'F'][index % 5],
  };
}

describe('POST /api/students/tabia-mwenendo (CSV replaceScope bulk insert)', () => {
  beforeEach(() => {
    withTransaction.mockReset();
  });

  it('generates one PostgreSQL placeholder per bound value', async () => {
    const { client, calls } = buildClient();
    withTransaction.mockImplementation(async (fn) => fn(client));

    await postTabia([evaluation(0), evaluation(1), evaluation(2)]).expect(200);

    expect(calls.insert).not.toBeNull();
    expect(calls.insert.sql).toContain(
      '($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14), ($15, $16, $17, $18, $19, $20, $21)'
    );
    expect(calls.insert.params).toHaveLength(21);
  });

  it('handles the production-sized upload without a bind-parameter mismatch', async () => {
    const { client, calls } = buildClient();
    withTransaction.mockImplementation(async (fn) => fn(client));

    const evaluations = Array.from({ length: 880 }, (_, i) => evaluation(i));
    await postTabia(evaluations).expect(200);

    expect(calls.insert).not.toBeNull();
    expect(calls.insert.params).toHaveLength(6160);

    const placeholders = calls.insert.sql.match(/\$\d+/g) || [];
    expect(placeholders).toHaveLength(6160);
    expect(placeholders[0]).toBe('$1');
    expect(placeholders[placeholders.length - 1]).toBe('$6160');
  });
});
