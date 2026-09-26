const {
  calculateAndSavePreFormOneResults,
  deleteStalePreFormOneResults,
} = require('../../utils/preFormOneResultsCalculate');

const SUBJECTS = [
  { id: 1, subject_code: 'ENG' },
  { id: 2, subject_code: 'MATH' },
];

function makeClient({ students, scores, existingResults = [] }) {
  const queries = [];
  const client = {
    queries,
    query: jest.fn(async (sql, params = []) => {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();

      if (normalized.includes('FROM preform_one_students WHERE year =')) {
        return { rows: students, rowCount: students.length };
      }
      if (normalized.includes('WHERE is_active = true')) {
        return { rows: SUBJECTS, rowCount: SUBJECTS.length };
      }
      if (normalized.includes('FROM preform_one_scores WHERE student_id =')) {
        const [studentId, subjectType] = params;
        const rows = scores
          .filter((s) => String(s.student_id) === String(studentId) && s.subject_type === subjectType)
          .map((s) => ({ subject_id: s.subject_id, score: s.score }));
        return { rows, rowCount: rows.length };
      }
      if (normalized.includes('SELECT id FROM preform_one_interview_results')) {
        const [studentId, year] = params;
        const rows = existingResults.filter(
          (r) => String(r.student_id) === String(studentId) && String(r.year) === String(year)
        );
        return { rows, rowCount: rows.length };
      }
      if (normalized.startsWith('INSERT INTO preform_one_interview_results')) {
        const [studentId, admissionNumber, totalMarks, average, grade, position, remarks, year] = params;
        const row = {
          student_id: studentId,
          admission_number: admissionNumber,
          total_marks: totalMarks,
          average,
          grade,
          position,
          remarks,
          year,
        };
        const index = existingResults.findIndex((r) => r.student_id === studentId);
        if (index >= 0) existingResults[index] = row;
        else existingResults.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (normalized.startsWith('UPDATE preform_one_interview_results')) {
        const [studentId, admissionNumber, totalMarks, average, grade, position, remarks, year] = params;
        const row = {
          student_id: studentId,
          admission_number: admissionNumber,
          total_marks: totalMarks,
          average,
          grade,
          position,
          remarks,
          year,
        };
        const index = existingResults.findIndex((r) => r.student_id === studentId);
        if (index >= 0) existingResults[index] = row;
        return { rows: [row], rowCount: 1 };
      }
      if (normalized.startsWith('DELETE FROM preform_one_interview_results')) {
        const [year, keep] = params;
        const keepIds = keep.map(Number);
        const before = existingResults.length;
        for (let i = existingResults.length - 1; i >= 0; i--) {
          const row = existingResults[i];
          if (String(row.year) === String(year) && !keepIds.includes(Number(row.student_id))) {
            existingResults.splice(i, 1);
          }
        }
        return { rows: [], rowCount: before - existingResults.length };
      }

      queries.push({ sql: normalized, params });
      throw new Error(`Unexpected query: ${normalized}`);
    }),
  };
  return client;
}

const OPTIONS = {
  year: 2026,
  scoreType: 'interview',
  subjectsTable: 'preformone_interview_subjects',
  resultsTable: 'preform_one_interview_results',
};

describe('calculateAndSavePreFormOneResults', () => {
  it('computes canonical grades, remarks and competition positions', async () => {
    const client = makeClient({
      students: [
        { id: 11, admission_number: '2001' },
        { id: 12, admission_number: '2002' },
        { id: 13, admission_number: '2003' },
      ],
      scores: [
        { student_id: 11, subject_id: 1, subject_type: 'interview', score: 80 },
        { student_id: 11, subject_id: 2, subject_type: 'interview', score: 90 },
        { student_id: 12, subject_id: 1, subject_type: 'interview', score: 70 },
        { student_id: 12, subject_id: 2, subject_type: 'interview', score: 70 },
        { student_id: 13, subject_id: 1, subject_type: 'interview', score: 50 },
        { student_id: 13, subject_id: 2, subject_type: 'interview', score: 40 },
      ],
    });

    const results = await calculateAndSavePreFormOneResults(client, OPTIONS);
    const byId = Object.fromEntries(results.map((r) => [r.student_id, r]));

    expect(byId[11].average).toBe(85);
    expect(byId[11].grade).toBe('A');
    expect(byId[11].remarks).toBe('AMECHAGULIWA');
    expect(byId[11].position).toBe(1);

    expect(byId[12].average).toBe(70);
    expect(byId[12].grade).toBe('B');
    expect(byId[12].position).toBe(2);

    expect(byId[13].average).toBe(45);
    expect(byId[13].grade).toBe('D');
    expect(byId[13].remarks).toBe('HAJACHAGULIWA');
    expect(byId[13].position).toBe(3);
  });

  it('shares a position for tied averages', async () => {
    const client = makeClient({
      students: [
        { id: 21, admission_number: '3001' },
        { id: 22, admission_number: '3002' },
        { id: 23, admission_number: '3003' },
      ],
      scores: [
        { student_id: 21, subject_id: 1, subject_type: 'interview', score: 80 },
        { student_id: 22, subject_id: 1, subject_type: 'interview', score: 80 },
        { student_id: 23, subject_id: 1, subject_type: 'interview', score: 60 },
      ],
    });

    const results = await calculateAndSavePreFormOneResults(client, OPTIONS);
    const byId = Object.fromEntries(results.map((r) => [r.student_id, r]));

    expect(byId[21].position).toBe(1);
    expect(byId[22].position).toBe(1);
    expect(byId[23].position).toBe(3);
  });

  it('skips students with no scores instead of publishing a zero average', async () => {
    const client = makeClient({
      students: [
        { id: 31, admission_number: '4001' },
        { id: 32, admission_number: '4002' },
      ],
      scores: [{ student_id: 31, subject_id: 1, subject_type: 'interview', score: 75 }],
    });

    const results = await calculateAndSavePreFormOneResults(client, OPTIONS);

    expect(results).toHaveLength(1);
    expect(results[0].student_id).toBe(31);
    expect(results.some((r) => r.student_id === 32)).toBe(false);
  });

  it('ignores null and non-numeric stored scores', async () => {
    const client = makeClient({
      students: [{ id: 41, admission_number: '5001' }],
      scores: [
        { student_id: 41, subject_id: 1, subject_type: 'interview', score: null },
        { student_id: 41, subject_id: 2, subject_type: 'interview', score: 90 },
      ],
    });

    const results = await calculateAndSavePreFormOneResults(client, OPTIONS);

    expect(results).toHaveLength(1);
    expect(results[0].total_marks).toBe(90);
    expect(results[0].average).toBe(90);
  });

  it('ignores scores belonging to the other result type', async () => {
    const client = makeClient({
      students: [{ id: 51, admission_number: '6001' }],
      scores: [{ student_id: 51, subject_id: 1, subject_type: 'continuing', score: 100 }],
    });

    const results = await calculateAndSavePreFormOneResults(client, OPTIONS);
    expect(results).toEqual([]);
  });

  it('deletes stale rows for students whose scores were removed', async () => {
    const existingResults = [
      { student_id: 61, admission_number: '7001', year: 2026, position: 1 },
      { student_id: 62, admission_number: '7002', year: 2026, position: 2 },
    ];
    const client = makeClient({
      students: [
        { id: 61, admission_number: '7001' },
        { id: 62, admission_number: '7002' },
      ],
      scores: [{ student_id: 61, subject_id: 1, subject_type: 'interview', score: 80 }],
      existingResults,
    });

    const results = await calculateAndSavePreFormOneResults(client, OPTIONS);

    expect(results.map((r) => r.student_id)).toEqual([61]);
    expect(existingResults.map((r) => r.student_id)).toEqual([61]);
  });

  it('keeps results from other cohorts untouched', async () => {
    const existingResults = [{ student_id: 61, admission_number: '7001', year: 2025, position: 4 }];
    const client = makeClient({
      students: [{ id: 61, admission_number: '7001' }],
      scores: [{ student_id: 61, subject_id: 1, subject_type: 'interview', score: 80 }],
      existingResults,
    });

    await calculateAndSavePreFormOneResults(client, OPTIONS);

    expect(existingResults.map((r) => r.year)).toEqual([2026]);
  });

  it('clears stale rows when the cohort has no students left', async () => {
    const existingResults = [{ student_id: 71, admission_number: '8001', year: 2026, position: 1 }];
    const client = makeClient({ students: [], scores: [], existingResults });

    const results = await calculateAndSavePreFormOneResults(client, OPTIONS);

    expect(results).toEqual([]);
    expect(existingResults).toHaveLength(0);
  });

  it('updates an existing row instead of duplicating it', async () => {
    const existingResults = [
      { student_id: 81, admission_number: '9001', year: 2026, position: 9, average: 10, grade: 'F' },
    ];
    const client = makeClient({
      students: [{ id: 81, admission_number: '9001' }],
      scores: [{ student_id: 81, subject_id: 1, subject_type: 'interview', score: 88 }],
      existingResults,
    });

    const results = await calculateAndSavePreFormOneResults(client, OPTIONS);

    expect(existingResults).toHaveLength(1);
    expect(existingResults[0].grade).toBe('A');
    expect(existingResults[0].average).toBe(88);
    expect(results[0].grade).toBe('A');
  });

  it('rounds repeating averages to two decimals', async () => {
    const client = makeClient({
      students: [{ id: 91, admission_number: '9101' }],
      scores: [
        { student_id: 91, subject_id: 1, subject_type: 'interview', score: 70 },
        { student_id: 91, subject_id: 2, subject_type: 'interview', score: 71 },
      ],
    });

    const results = await calculateAndSavePreFormOneResults(client, OPTIONS);
    expect(results[0].average).toBe(70.5);
    expect(results[0].grade).toBe('B');
  });
});

describe('deleteStalePreFormOneResults', () => {
  it('refuses unknown tables', async () => {
    const client = { query: jest.fn() };
    await expect(
      deleteStalePreFormOneResults(client, 'students', 2026, [1])
    ).rejects.toThrow(/Invalid results table/);
    expect(client.query).not.toHaveBeenCalled();
  });

  it('deletes every row of the year when nothing is kept', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rowCount: 4 }) };
    const removed = await deleteStalePreFormOneResults(
      client,
      'preform_one_continuing_results',
      2026,
      []
    );
    expect(removed).toBe(4);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('NOT (student_id = ANY($2::int[]))'),
      [2026, [-1]]
    );
  });
});
