/**
 * Shared aggregation helpers for the monthly results summary tables.
 *
 * The screen and the PDF used to duplicate this logic. In combined Form V/VI
 * mode the page-level stream is `ALL`, so using it for A-level division
 * calculations made many students unclassifiable. Every student's own
 * combination (`com`, falling back to `stream`) must be used instead.
 */
import { calculateDivisionAndPoints, gradeForScore } from './gradingSystems';

export const A_LEVEL_GRADE_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'S', 'F'];
export const O_LEVEL_GRADE_COLUMNS = ['A', 'B', 'C', 'D', 'F'];

export function getSubjectCode(subject) {
  return subject?.subject_code || subject?.subject_abbreviation || '';
}

export function getSubjectKey(subject) {
  return subject?.subject_abbreviation || subject?.subject_code || '';
}

export function hasSubjectScore(score) {
  return score !== undefined && score !== null && score !== '';
}

/**
 * Remove duplicate advanced-prefixed rows (A/COM vs COM, A/DIV vs DIV,
 * A/HTM vs HTM) so the main table and the summary cannot double-count them.
 */
export function dedupeSubjects(subjects) {
  const seen = new Set();
  return (subjects || []).filter((subject) => {
    const code = String(getSubjectCode(subject)).trim().toUpperCase();
    const normalized = code.match(/^A[/_](COM|DIV|HTM)$/)?.[1] || code;
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function scoreToGrade(score, { gradingSystem, isALevel }) {
  const scale = gradingSystem || 'seminary';
  return gradeForScore(score, { system: scale, isALevel }) || '-';
}

export function buildSubjectsData({ studentScores = {}, subjects = [], gradingSystem, isALevel }) {
  const subjectsData = {};
  subjects.forEach((subject) => {
    const subjectKey = getSubjectKey(subject);
    const score = studentScores[subjectKey] ?? studentScores[getSubjectCode(subject)];
    if (!hasSubjectScore(score)) return;
    subjectsData[subjectKey] = {
      grade: scoreToGrade(score, { gradingSystem, isALevel }),
      name: subject.subject_name || subjectKey,
    };
  });
  return subjectsData;
}

/**
 * Resolve the division shown for one student. In combined mode `fallbackStream`
 * is `ALL`, so the student's own combination takes precedence.
 */
export function getStudentDivisionData({
  studentScores = {},
  subjects = [],
  student = {},
  isALevel = false,
  gradingSystem = '',
  fallbackStream = '',
}) {
  const subjectsData = buildSubjectsData({ studentScores, subjects, gradingSystem, isALevel });
  const combination = isALevel
    ? (student?.com || student?.stream || fallbackStream)
    : fallbackStream;
  const computed = calculateDivisionAndPoints({
    isALevel,
    subjectsData,
    stream: combination,
  });
  const scoredCount = Object.keys(subjectsData).length;
  const insufficientSubjects = isALevel ? scoredCount < 3 : scoredCount < 7;
  const division = insufficientSubjects ? '0' : (computed.division || '0');

  return {
    ...computed,
    scoredCount,
    division,
    displayDivision: insufficientSubjects ? '-' : (computed.division || '-'),
  };
}

/** Aggregate Summary of Results and Subject Performance for the results table. */
export function buildMonthlyResultsSummary({
  students = [],
  subjectScores = {},
  subjects = [],
  isALevel = false,
  gradingSystem = '',
  fallbackStream = '',
}) {
  const gradeCols = isALevel ? A_LEVEL_GRADE_COLUMNS : O_LEVEL_GRADE_COLUMNS;
  const summarySubjects = dedupeSubjects(subjects);
  const subjectGradeCounts = {};
  summarySubjects.forEach((subject) => {
    const counts = { total: 0 };
    gradeCols.forEach((grade) => { counts[grade] = 0; });
    subjectGradeCounts[getSubjectCode(subject)] = counts;
  });

  const divisionCounts = { I: 0, II: 0, III: 0, IV: 0, '0': 0 };
  students.forEach((student) => {
    const studentScores = subjectScores[student.adm_no] || {};
    summarySubjects.forEach((subject) => {
      const subjectKey = getSubjectKey(subject);
      const score = studentScores[subjectKey] ?? studentScores[getSubjectCode(subject)];
      if (!hasSubjectScore(score)) return;
      const counts = subjectGradeCounts[getSubjectCode(subject)];
      if (!counts) return;
      const grade = scoreToGrade(score, { gradingSystem, isALevel });
      if (counts[grade] !== undefined) counts[grade] += 1;
      counts.total += 1;
    });

    const { division } = getStudentDivisionData({
      studentScores,
      subjects: summarySubjects,
      student,
      isALevel,
      gradingSystem,
      fallbackStream,
    });
    divisionCounts[division] = (divisionCounts[division] || 0) + 1;
  });

  return {
    registeredCount: students.length,
    divisionCounts,
    gradeCols,
    subjects: summarySubjects,
    subjectGradeCounts,
  };
}
