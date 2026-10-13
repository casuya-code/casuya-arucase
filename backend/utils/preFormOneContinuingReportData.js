/**
 * Builds the data payload for the Pre-Form One Continuing report PDF.
 *
 * The continuing report mirrors the O-Level individual report but:
 *  - there is a single assessment per subject (no monthly tests / weights),
 *  - grades use the canonical O-Level scale (utils/oLevelGrading),
 *  - division/points are derived from the O-Level grade points.
 *
 * Comment sections (Taaluma, Sala, Tabia, Mkuu wa Shule …) are fed by the
 * Pre-Form One comment modules stored in preform_one_comments /
 * preform_one_tabia_mwenendo.
 */
const { calculateOLevelGrade, getOLevelRemarks } = require('./oLevelGrading');
const {
  calculateOLevelDivisionPoint,
  getOLevelDivision,
} = require('./calculations');
const { formatStudentFeesDebt } = require('./reportStudentExtras');

const FORM_LABEL = 'PRE-FORM ONE';

// Fees announcements (MAMBO YA KUFAHAMU) and per-student debt reuse the shared
// fees_announcements / individual_debt tables with level 'PRE-FORM ONE'. The
// continuing report is a single end-of-year card (Term II).
const PRE_FORM_ONE_FEES_LEVEL = 'PRE-FORM ONE';
const PRE_FORM_ONE_FEES_STREAM = 'NA';
const PRE_FORM_ONE_FEES_TERM = 'Second Term';

async function loadSchoolBranding(query) {
  let schoolLogo = null;
  let schoolStamp = null;
  let authorityData = null;
  try {
    const logo = await query('SELECT * FROM school_logo WHERE id = 1');
    schoolLogo = logo.rows[0] || null;
  } catch (e) {
    console.warn('Continuing report: could not load school logo:', e.message);
  }
  try {
    const stamp = await query('SELECT * FROM school_stamp WHERE id = 1');
    schoolStamp = stamp.rows[0] || null;
  } catch (e) {
    console.warn('Continuing report: could not load school stamp:', e.message);
  }
  try {
    const authority = await query('SELECT * FROM authority_data WHERE id = 1');
    authorityData = authority.rows[0] || null;
  } catch (e) {
    console.warn('Continuing report: could not load authority data:', e.message);
  }
  return { schoolLogo, schoolStamp, authorityData };
}

/**
 * Load everything shared by every student's report for a year.
 * @returns {Promise<Object>} context
 */
async function loadContinuingReportContext(query, year) {
  const subjectsResult = await query(
    `SELECT id, subject_code, subject_name
       FROM preformone_continuing_subjects
      WHERE is_active = true
      ORDER BY subject_code`
  );
  const subjects = subjectsResult.rows;

  const studentsResult = await query(
    `SELECT * FROM preform_one_students WHERE year = $1 ORDER BY surname, first_name`,
    [year]
  );
  const students = studentsResult.rows;
  const studentsById = new Map(students.map((s) => [String(s.id), s]));

  const scoresResult = await query(
    `SELECT sc.student_id, sc.score, sc.subject_id, sub.subject_code
       FROM preform_one_scores sc
       JOIN preformone_continuing_subjects sub ON sc.subject_id = sub.id
      WHERE sc.subject_type = 'continuing'
        AND sub.is_active = true
        AND sc.score IS NOT NULL
        AND sc.student_id IN (SELECT id FROM preform_one_students WHERE year = $1)`,
    [year]
  );

  // scoresByStudent[studentId][subjectCode] = number
  const scoresByStudent = {};
  // rankings[subjectCode]: { [studentId]: position }
  const perSubjectScores = {};

  scoresResult.rows.forEach((row) => {
    const sid = String(row.student_id);
    const code = row.subject_code;
    if (!code) return;
    if (!scoresByStudent[sid]) scoresByStudent[sid] = {};
    scoresByStudent[sid][code] = row.score;
    if (!perSubjectScores[code]) perSubjectScores[code] = [];
    perSubjectScores[code].push({ studentId: sid, score: Number(row.score) });
  });

  const rankings = {};
  Object.keys(perSubjectScores).forEach((code) => {
    const list = perSubjectScores[code].sort((a, b) => b.score - a.score);
    rankings[code] = {};
    list.forEach((entry, index) => {
      rankings[code][entry.studentId] = index + 1;
    });
  });

  const resultsResult = await query(
    `SELECT * FROM preform_one_continuing_results WHERE year = $1`,
    [year]
  );
  const resultsByStudent = {};
  resultsResult.rows.forEach((row) => {
    resultsByStudent[String(row.student_id)] = row;
  });

  // Free-text comments (Taaluma, Sala, Tabia, Mkuu wa Shule …) live in
  // preform_one_comments keyed by student_id + comment_type.
  const commentsByStudent = {};
  try {
    const commentsResult = await query(
      `SELECT student_id, comment_type, comment_text
         FROM preform_one_comments
        WHERE year = $1`,
      [year]
    );
    commentsResult.rows.forEach((row) => {
      const sid = String(row.student_id);
      if (!commentsByStudent[sid]) commentsByStudent[sid] = {};
      commentsByStudent[sid][row.comment_type] = row.comment_text || '';
    });
  } catch (e) {
    console.warn('Continuing report: could not load comments:', e.message);
  }

  // Tabia na Mwenendo grid -> { studentId: { criterion: grade } }.
  const tabiaByStudent = {};
  try {
    const tabiaResult = await query(
      `SELECT student_id, criterion, evaluation
         FROM preform_one_tabia_mwenendo
        WHERE year = $1`,
      [year]
    );
    tabiaResult.rows.forEach((row) => {
      const sid = String(row.student_id);
      if (!tabiaByStudent[sid]) tabiaByStudent[sid] = {};
      tabiaByStudent[sid][row.criterion] = row.evaluation;
    });
  } catch (e) {
    console.warn('Continuing report: could not load tabia mwenendo:', e.message);
  }

  // Fees announcements (MAMBO YA KUFAHAMU) for the year.
  let classFeesAnnouncements = {};
  try {
    const feesResult = await query(
      `SELECT announcement_index, announcement_text
         FROM fees_announcements
        WHERE UPPER(TRIM(level)) = $1 AND UPPER(TRIM(stream)) = $2 AND year = $3 AND term = $4
        ORDER BY announcement_index`,
      [PRE_FORM_ONE_FEES_LEVEL, PRE_FORM_ONE_FEES_STREAM, year, PRE_FORM_ONE_FEES_TERM]
    );
    feesResult.rows.forEach((row, idx) => {
      const index = row.announcement_index != null ? String(row.announcement_index) : String(idx + 1);
      classFeesAnnouncements[index] = row.announcement_text || '';
    });
  } catch (e) {
    console.warn('Continuing report: could not load fees announcements:', e.message);
  }

  // Per-student debt, keyed by the Pre-Form One student id (student_index).
  const debtsByStudent = {};
  try {
    const debtsResult = await query(
      `SELECT student_index, amount, description
         FROM individual_debt
        WHERE UPPER(TRIM(level)) = $1 AND UPPER(TRIM(stream)) = $2 AND year = $3`,
      [PRE_FORM_ONE_FEES_LEVEL, PRE_FORM_ONE_FEES_STREAM, year]
    );
    debtsResult.rows.forEach((row) => {
      if (row.student_index == null) return;
      debtsByStudent[String(row.student_index)] = row;
    });
  } catch (e) {
    console.warn('Continuing report: could not load student debts:', e.message);
  }

  const branding = await loadSchoolBranding(query);

  return {
    year,
    subjects,
    students,
    studentsById,
    scoresByStudent,
    rankings,
    resultsByStudent,
    commentsByStudent,
    tabiaByStudent,
    classFeesAnnouncements,
    debtsByStudent,
    totalStudents: resultsResult.rows.length,
    ...branding,
  };
}

/**
 * Shape one student's report data from the shared context.
 * @returns {Object|null}
 */
function toReportData(context, student) {
  if (!student) return null;
  const sid = String(student.id);
  const studentScores = context.scoresByStudent[sid] || {};
  const result = context.resultsByStudent[sid] || null;

  const subjectsData = {};
  const subjectRows = context.subjects
    .map((subject) => {
      const raw = studentScores[subject.subject_code];
      const ok = raw !== undefined && raw !== null && raw !== '';
      if (!ok) return null;
      const numeric = Number(raw);
      const grade = calculateOLevelGrade(numeric);
      subjectsData[subject.subject_code] = { grade };
      return {
        subject_code: subject.subject_code,
        subject_name: subject.subject_name || subject.subject_code,
        score: numeric,
        grade,
        comment: getOLevelRemarks(numeric),
        position: context.rankings[subject.subject_code]?.[sid] || null,
      };
    })
    .filter(Boolean);

  let division = '0';
  let divisionPoint = 0;
  if (Object.keys(subjectsData).length > 0) {
    divisionPoint = calculateOLevelDivisionPoint(subjectsData);
    division = getOLevelDivision(divisionPoint) || '0';
  }

  return {
    student: {
      first_name: student.first_name,
      middle_name: student.middle_name,
      surname: student.surname,
      sex: student.sex,
      admission_number: student.admission_number,
      photo_path: student.photo_path || null,
    },
    subjects: subjectRows,
    summary: {
      total_marks: result?.total_marks ?? null,
      average: result?.average ?? null,
      grade: result?.grade ?? null,
      division,
      division_point: divisionPoint,
      position: result?.position ?? null,
      total_students: context.totalStudents,
    },
    // Comments/tabia come from the Pre-Form One comment modules (PRE-*).
    comments: context.commentsByStudent[sid] || {},
    tabia_mwenendo: context.tabiaByStudent[sid] || {},
    student_parish: student.parish || '',
    student_fees_debt: (() => {
      const debt = context.debtsByStudent?.[sid];
      if (!debt) return '0.0';
      return formatStudentFeesDebt(debt.amount, debt.description);
    })(),
    class_fees_announcements: context.classFeesAnnouncements || {},
    school_logo: context.schoolLogo,
    school_stamp: context.schoolStamp,
    authority_data: context.authorityData,
    form: FORM_LABEL,
    year: context.year,
  };
}

/**
 * Build report data for a single student.
 * @returns {Promise<{ reportData: Object|null, student: Object|null, result: Object|null }>}
 */
async function buildPreFormOneContinuingReportData(query, { year, studentId }) {
  const context = await loadContinuingReportContext(query, year);
  const student = context.studentsById.get(String(studentId)) || null;
  const result = student ? context.resultsByStudent[String(student.id)] || null : null;
  const reportData = student ? toReportData(context, student) : null;
  return { reportData, student, result, context };
}

/**
 * Build report data for every student who has a saved continuing result.
 * @returns {Promise<Array<Object>>} list of report data payloads (ordered by position)
 */
async function buildPreFormOneContinuingBulkReportData(query, { year }) {
  const context = await loadContinuingReportContext(query, year);
  const ordered = context.students
    .filter((s) => context.resultsByStudent[String(s.id)])
    .sort((a, b) => {
      const ra = context.resultsByStudent[String(a.id)];
      const rb = context.resultsByStudent[String(b.id)];
      const pa = Number(ra?.position ?? 1e9);
      const pb = Number(rb?.position ?? 1e9);
      if (pa !== pb) return pa - pb;
      return `${a.surname} ${a.first_name}`.localeCompare(`${b.surname} ${b.first_name}`);
    });
  return ordered.map((student) => toReportData(context, student)).filter(Boolean);
}

module.exports = {
  FORM_LABEL,
  loadContinuingReportContext,
  toReportData,
  buildPreFormOneContinuingReportData,
  buildPreFormOneContinuingBulkReportData,
};
