/**
 * Shared Pre-Form One interview/continuing results calculation + upsert.
 */

function calculateGrade(average) {
  if (average >= 80) return 'A';
  if (average >= 70) return 'B';
  if (average >= 55) return 'C';
  if (average >= 45) return 'D';
  return 'F';
}

function getRemarks(grade) {
  switch (grade) {
    case 'A':
      return 'Excellent';
    case 'B':
      return 'Good';
    case 'C':
      return 'Satisfactory';
    case 'D':
      return 'Needs Improvement';
    case 'F':
      return 'Fail';
    default:
      return '';
  }
}

function matchSubjectScore(scoresRows, subjectId) {
  const sid = String(subjectId);
  const row = scoresRows.find((s) => String(s.subject_id) === sid);
  if (!row || row.score == null) return 0;
  const n = Number(row.score);
  return Number.isFinite(n) ? n : 0;
}

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

  if (studentsResult.rows.length === 0 || subjectsResult.rows.length === 0) {
    return [];
  }

  const results = [];

  for (const student of studentsResult.rows) {
    const scoresResult = await client.query(
      'SELECT subject_id, score FROM preform_one_scores WHERE student_id = $1 AND subject_type = $2',
      [student.id, scoreType]
    );

    let totalMarks = 0;
    const subjectCount = subjectsResult.rows.length;

    for (const subject of subjectsResult.rows) {
      totalMarks += matchSubjectScore(scoresResult.rows, subject.id);
    }

    const average = subjectCount > 0 ? totalMarks / subjectCount : 0;
    const grade = calculateGrade(average);

    results.push({
      student_id: student.id,
      admission_number: student.admission_number,
      total_marks: totalMarks,
      average,
      grade,
      position: 0,
      remarks: getRemarks(grade),
      year: yearNum,
    });
  }

  const sortedResults = [...results].sort((a, b) => b.average - a.average);

  for (let i = 0; i < sortedResults.length; i++) {
    const studentResult = sortedResults[i];
    const position = i + 1;
    await upsertPreFormOneResult(client, resultsTable, {
      ...studentResult,
      position,
      remarks: getRemarks(studentResult.grade),
    });
    const original = results.find((r) => r.student_id === studentResult.student_id);
    if (original) original.position = position;
  }

  return results;
}

module.exports = {
  calculateGrade,
  getRemarks,
  calculateAndSavePreFormOneResults,
  upsertPreFormOneResult,
};
