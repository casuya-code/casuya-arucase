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

const ADMIN_TOKEN = jwt.sign(
  { user_id: 'headteacher', username: 'headteacher', role: 'superadmin' },
  JWT_SECRET
);

function sqlOf(call) {
  return String(call[0]).replace(/\s+/g, ' ').trim();
}

/**
 * Minimal in-memory preform_one_students table so the upsert logic can be
 * exercised end to end without a database.
 */
function buildClient(initialStudents = []) {
  const students = initialStudents.map((student) => ({ ...student }));
  const calls = { inserts: [], updates: [] };
  let nextId = 1000;

  const client = {
    calls,
    query: jest.fn(async (sql, params = []) => {
      const normalized = sqlOf([sql]);

      if (normalized.includes('information_schema.columns')) {
        return { rows: [{ exists: false }], rowCount: 1 };
      }

      if (normalized.startsWith('SELECT * FROM preform_one_students WHERE')) {
        // The route appends one array parameter per condition (years,
        // admission numbers, serials) only when that condition is present.
        const paramArrays = params.filter(Array.isArray);
        const rows = students.filter((student) => paramArrays.some((values) => (
          values.includes(Number(student.year))
          || values.includes(student.admission_number)
          || values.includes(String(student.serial_number).trim().toUpperCase())
        )));
        return { rows, rowCount: rows.length };
      }

      if (normalized.startsWith('UPDATE preform_one_students SET')) {
        const setClause = normalized.slice(
          'UPDATE preform_one_students SET '.length,
          normalized.indexOf(' WHERE id =')
        );
        const columns = setClause
          .split(', ')
          .map((part) => part.trim())
          .filter((part) => part.includes('$'))
          .map((part) => part.split(' = ')[0]);
        const id = params[params.length - 1];
        const index = students.findIndex((student) => student.id === id);
        if (index === -1) return { rows: [], rowCount: 0 };
        const row = { ...students[index] };
        columns.forEach((column, i) => {
          row[column] = params[i];
        });
        students[index] = row;
        calls.updates.push({ id, row });
        return { rows: [row], rowCount: 1 };
      }

      if (normalized.startsWith('INSERT INTO preform_one_students')) {
        const row = {
          id: nextId,
          admission_number: params[0],
          serial_number: params[1],
          first_name: params[2],
          middle_name: params[3],
          surname: params[4],
          sex: params[5],
          parish: params[6],
          year: Number(params[7]),
        };
        nextId += 1;
        students.push(row);
        calls.inserts.push(row);
        return { rows: [row], rowCount: 1 };
      }

      throw new Error(`Unexpected query: ${normalized}`);
    }),
  };

  return { client, students, calls };
}

const postBulk = (body) =>
  request(app)
    .post('/api/pre-form-one/bulk')
    .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
    .send(body);

describe('POST /api/pre-form-one/bulk (CSV upsert)', () => {
  beforeEach(() => {
    query.mockReset();
    withTransaction.mockReset();
    query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('updates an existing student by S/N and keeps the existing admission number', async () => {
    const existing = {
      id: 1,
      admission_number: '789ABCSN001-abc-123',
      serial_number: 'SN001',
      first_name: 'John',
      middle_name: 'Doe',
      surname: 'Smith',
      sex: 'Male',
      parish: 'Old Parish',
      year: 2025,
    };
    const { client, students, calls } = buildClient([existing]);
    withTransaction.mockImplementation(async (fn) => fn(client));

    const res = await postBulk({
      year: 2025,
      students: [{
        serial_number: 'SN001',
        first_name: 'Jonathan',
        middle_name: 'David',
        surname: 'Smith',
        sex: 'Male',
        parish: 'New Parish',
      }],
    }).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.createdCount).toBe(0);
    expect(res.body.updatedCount).toBe(1);
    expect(res.body.changes).toHaveLength(1);
    expect(res.body.changes[0].changes).toMatchObject({
      first_name: { from: 'John', to: 'Jonathan' },
      middle_name: { from: 'Doe', to: 'David' },
      parish: { from: 'Old Parish', to: 'New Parish' },
    });

    expect(calls.inserts).toHaveLength(0);
    expect(calls.updates).toHaveLength(1);
    expect(students).toHaveLength(1);
    expect(students[0].admission_number).toBe('789ABCSN001-abc-123');
    expect(students[0].first_name).toBe('Jonathan');
    expect(students[0].year).toBe(2025);
  });

  it('does not erase fields that are absent from the CSV', async () => {
    const existing = {
      id: 1,
      admission_number: '789ABCSN001-abc-123',
      serial_number: 'SN001',
      first_name: 'John',
      middle_name: 'Doe',
      surname: 'Smith',
      sex: 'Male',
      parish: 'Old Parish',
      year: 2025,
    };
    const { client, students, calls } = buildClient([existing]);
    withTransaction.mockImplementation(async (fn) => fn(client));

    await postBulk({
      year: 2025,
      students: [{
        serial_number: 'SN001',
        first_name: 'John',
        surname: 'Smith',
        sex: 'Male',
      }],
    }).expect(200);

    expect(calls.updates).toHaveLength(0);
    expect(students[0].middle_name).toBe('Doe');
    expect(students[0].parish).toBe('Old Parish');
  });

  it('creates a new student with a generated admission number for a new S/N', async () => {
    const { client, students, calls } = buildClient([]);
    withTransaction.mockImplementation(async (fn) => fn(client));

    const res = await postBulk({
      year: 2026,
      students: [{
        serial_number: 'SN010',
        first_name: 'New',
        middle_name: 'Student',
        surname: 'Person',
        sex: 'Female',
        parish: 'St. Paul',
      }],
    }).expect(200);

    expect(res.body.createdCount).toBe(1);
    expect(res.body.updatedCount).toBe(0);
    expect(calls.inserts).toHaveLength(1);
    expect(students).toHaveLength(1);
    expect(students[0].admission_number).toMatch(/^789ABCSN010-/);
    expect(students[0].year).toBe(2026);
  });

  it('matches by admission number when the CSV carries one', async () => {
    const existing = {
      id: 7,
      admission_number: '789ABCSN007-keep-me',
      serial_number: 'OLD-SN',
      first_name: 'Old',
      middle_name: '',
      surname: 'Name',
      sex: 'Male',
      parish: 'X',
      year: 2024,
    };
    const { client, students, calls } = buildClient([existing]);
    withTransaction.mockImplementation(async (fn) => fn(client));

    const res = await postBulk({
      year: 2024,
      students: [{
        admission_number: '789ABCSN007-keep-me',
        serial_number: 'NEW-SN',
        first_name: 'Corrected',
        surname: 'Name',
        sex: 'Male',
      }],
    }).expect(200);

    expect(res.body.updatedCount).toBe(1);
    expect(calls.inserts).toHaveLength(0);
    expect(students[0].admission_number).toBe('789ABCSN007-keep-me');
    expect(students[0].serial_number).toBe('NEW-SN');
    expect(students[0].first_name).toBe('Corrected');
  });

  it('moves a student to a new year when the CSV supplies a Year column', async () => {
    const existing = {
      id: 3,
      admission_number: '789ABCSN003-stable',
      serial_number: 'SN003',
      first_name: 'Maria',
      middle_name: '',
      surname: 'M',
      sex: 'Female',
      parish: 'Y',
      year: 2024,
    };
    const { client, students, calls } = buildClient([existing]);
    withTransaction.mockImplementation(async (fn) => fn(client));

    const res = await postBulk({
      year: 2025,
      students: [{
        serial_number: 'SN003',
        first_name: 'Maria',
        surname: 'M',
        sex: 'Female',
        year: 2025,
      }],
    }).expect(200);

    expect(res.body.updatedCount).toBe(1);
    expect(calls.inserts).toHaveLength(0);
    expect(students[0].admission_number).toBe('789ABCSN003-stable');
    expect(students[0].year).toBe(2025);
  });

  it('never inserts twice when the same S/N appears twice in one upload', async () => {
    const { client, students, calls } = buildClient([]);
    withTransaction.mockImplementation(async (fn) => fn(client));

    const res = await postBulk({
      year: 2026,
      students: [
        { serial_number: 'SN020', first_name: 'First', surname: 'Try', sex: 'Male' },
        { serial_number: 'SN020', first_name: 'Second', surname: 'Try', sex: 'Male' },
      ],
    }).expect(200);

    expect(calls.inserts).toHaveLength(1);
    expect(calls.updates).toHaveLength(1);
    expect(students).toHaveLength(1);
    expect(students[0].first_name).toBe('Second');
    expect(res.body.createdCount).toBe(1);
    expect(res.body.updatedCount).toBe(0);
  });

  it('skips ambiguous S/N matches across years instead of guessing', async () => {
    const { client, students, calls } = buildClient([
      { id: 1, admission_number: 'A1', serial_number: 'SN030', first_name: 'A', surname: 'One', sex: 'Male', parish: '', year: 2024 },
      { id: 2, admission_number: 'A2', serial_number: 'SN030', first_name: 'B', surname: 'Two', sex: 'Male', parish: '', year: 2025 },
    ]);
    withTransaction.mockImplementation(async (fn) => fn(client));

    const res = await postBulk({
      year: 2026,
      students: [{ serial_number: 'SN030', first_name: 'C', surname: 'Three', sex: 'Male' }],
    }).expect(200);

    expect(res.body.createdCount).toBe(0);
    expect(res.body.updatedCount).toBe(0);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toMatch(/more than one year/i);
    expect(calls.inserts).toHaveLength(0);
    expect(calls.updates).toHaveLength(0);
    expect(students).toHaveLength(2);
  });

  it('reports invalid rows without failing the valid ones', async () => {
    const { client, students, calls } = buildClient([]);
    withTransaction.mockImplementation(async (fn) => fn(client));

    const res = await postBulk({
      year: 2026,
      students: [
        { serial_number: 'SN040', first_name: 'Good', surname: 'Row', sex: 'Male' },
        { serial_number: 'SN041', first_name: 'Bad', surname: 'Sex', sex: 'Unknown' },
      ],
    }).expect(200);

    expect(res.body.createdCount).toBe(1);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].serial_number).toBe('SN041');
    expect(calls.inserts).toHaveLength(1);
    expect(students).toHaveLength(1);
  });
});
