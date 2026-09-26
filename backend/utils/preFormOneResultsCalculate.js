/**
 * Shared Pre-Form One interview/continuing results calculation + upsert.
 */

const {
  calculateGrade,
  getRemarks,
  roundAverage,
  assignResultPositions,
} = require('./preFormOneGrading');

/**
 * Upsert one result row (works even if UNIQUE index is missing).
 */
async function upsertPreFormOneResult(client, tableName, row) {
  const allowed = new Set(['preform_one_interview_results', 'preform_one_continuing_results']);
  if (!allowed.has(tableName)) {
    throw new Error(`Invalid results table: ${tableName}`);
  }

  const existing = await client.query(
    `SELECT id FROM ${tableName} WHERE student_id = $1 AND year = $2`,
    [row.student_id, row.year]
  );

  if (existing.rows.length > 0) {
    await client.query(
      `
      UPDATE ${tableName}
      SET admission_number = $2,
          total_marks = $3,
          average = $4,
          grade = $5,
          position = $6,
          remarks = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE student_id = $1 AND year = $8
      `,
      [
        row.student_id,
        row.admission_number,
        row.total_marks,
        row.average,
        row.grade,
        row.position,
        row.remarks,
        row.year,
      ]
    );
    return;
  }

  await client.query(
    `
    INSERT INTO ${tableName}
      (student_id, admission_number, total_marks, average, grade, position, remarks, year)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      row.student_id,
      row.admission_number,
      row.total_marks,
      row.average,
      row.grade,
      row.position,
      row.remarks,
      row.year,
    ]
  );
}

/**
 * Remove result rows for this year that no longer have a computable result so
 * withdrawn scores, cleared subjects and zero-score students cannot linger in
 * the results list or the printed reports.
 */
async function deleteStalePreFormOneResults(client, resultsTable, year, keepStudentIds) {
  const allowed = new Set(['preform_one_interview_results', 'preform_one_continuing_results']);
  if (!allowed.has(resultsTable)) {
    throw new Error(`Invalid results table: ${resultsTable}`);
  }

  const keep = keepStudentIds.length > 0 ? keepStudentIds : [-1];
  const result = await client.query(
    `DELETE FROM ${resultsTable} WHERE year = $1 AND NOT (student_id = ANY($2::int[]))`,
    [year, keep]
  );
  return result.rowCount || 0;
}

/**
 * Calculate and persist results for all students in a year.
 */
async function calculateAndSavePreFormOneResults(client, options) {
  const {
    year,
    scoreType,
    subjectsTable,
    resultsTable,
  } = options;

  const yearNum = parseInt(year, 10);

  const studentsResult = await client.query(
    'SELECT id, admission_number FROM preform_one_students WHERE year = $1 ORDER BY admission_number',
    [yearNum]
  );

  const subjectsResult = await client.query(
    `SELECT id, subject_code FROM ${subjectsTable} WHERE is_active = true ORDER BY subject_code`
  );

  if (studentsResult.rows.length === 0) {
    await deleteStalePreFormOneResults(client, resultsTable, yearNum, []);
    return [];
  }

  if (subjectsResult.rows.length === 0) {
    await deleteStalePreFormOneResults(client, resultsTable, yearNum, []);
    return [];
  }

  const results = [];

  for (const student of studentsResult.rows) {
    const scoresResult = await client.query(
      'SELECT subject_id, score FROM preform_one_scores WHERE student_id = $1 AND subject_type = $2',
      [student.id, scoreType]
    );

    let totalMarks = 0;
    let scoredSubjectCount = 0;

    for (const subject of subjectsResult.rows) {
      const sid = String(subject.id);
      const row = scoresResult.rows.find((s) => String(s.subject_id) === sid);
      if (row && row.score != null) {
        const n = Number(row.score);
        if (Number.isFinite(n)) {
          totalMarks += n;
          scoredSubjectCount++;
        }
      }
    }

    // No usable score means no result: never publish a fabricated average of 0.
    if (scoredSubjectCount === 0) {
      continue;
    }

    const average = roundAverage(totalMarks / scoredSubjectCount);

    results.push({
      student_id: student.id,
      admission_number: student.admission_number,
      total_marks: totalMarks,
      average,
      grade: calculateGrade(average),
      position: 0,
      remarks: getRemarks(average),
      year: yearNum,
    });
  }

  assignResultPositions(results);

  await deleteStalePreFormOneResults(
    client,
    resultsTable,
    yearNum,
    results.map((r) => r.student_id)
  );

  for (const studentResult of results) {
    await upsertPreFormOneResult(client, resultsTable, studentResult);
  }

  return results;
}

module.exports = {
  calculateGrade,
  getRemarks,
  calculateAndSavePreFormOneResults,
  upsertPreFormOneResult,
  deleteStalePreFormOneResults,
  assignResultPositions,
};
