/**
 * Shared helpers for Pre-Form One interview/continuing results pages.
 */

export function normalizeSubjectCode(code) {
  if (code == null || code === '') return '';
  return String(code).trim().toUpperCase();
}

export function scoreForSubject(scoresByCode, subjectCode) {
  if (!scoresByCode) return undefined;
  const key = normalizeSubjectCode(subjectCode);
  if (key && scoresByCode[key] !== undefined) return scoresByCode[key];
  return scoresByCode[subjectCode];
}

/** Build { admission_number: { SUBJECT_CODE: score } } from API rows. */
export function buildSubjectScoresMap(rows, admissionKeyFn) {
  const map = {};
  if (!Array.isArray(rows)) return map;

  rows.forEach((row) => {
    const adm = admissionKeyFn(row.admission_number);
    const code = normalizeSubjectCode(row.subject_code);
    if (!adm || !code) return;
    if (!map[adm]) map[adm] = {};
    map[adm][code] = row.score;
  });
  return map;
}

export const INTERVIEW_GRADING_SCALE = [
  { min: 80, grade: 'A', remarks: 'Excellent' },
  { min: 70, grade: 'B', remarks: 'Good' },
  { min: 55, grade: 'C', remarks: 'Satisfactory' },
  { min: 45, grade: 'D', remarks: 'Needs Improvement' },
  { min: 0, grade: 'F', remarks: 'Fail' },
];

/** Average over all active subjects (missing = 0), matching backend calculate. */
export function calculateInterviewMetrics(scoresByCode, activeSubjects) {
  if (!activeSubjects?.length) {
    return { total_marks: 0, average: 0, grade: '-', remarks: '-' };
  }

  const subjectScoresList = activeSubjects.map((subject) => {
    const raw = scoreForSubject(scoresByCode, subject.subject_code);
    if (raw === null || raw === undefined || raw === '') return 0;
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  });

  const total_marks = subjectScoresList.reduce((sum, n) => sum + n, 0);
  const average = total_marks / activeSubjects.length;
  const gradeInfo =
    INTERVIEW_GRADING_SCALE.find((g) => average >= g.min) ||
    INTERVIEW_GRADING_SCALE[INTERVIEW_GRADING_SCALE.length - 1];

  return {
    total_marks,
    average: Math.round(average * 100) / 100,
    grade: gradeInfo.grade,
    remarks: gradeInfo.remarks,
  };
}

export function assignResultPositions(resultsObj) {
  const next = { ...resultsObj };
  const ranked = Object.keys(next)
    .map((adm) => ({ adm, avg: Number(next[adm]?.average) || 0 }))
    .sort((a, b) => b.avg - a.avg);

  ranked.forEach((item, index) => {
    next[item.adm] = { ...next[item.adm], position: index + 1 };
  });
  return next;
}

/** Merge saved DB row with live totals from subject scores (auto wins for TOT/AVR/GRD). */
export function mergeAutoAndSavedResult(auto, saved) {
  if (!auto && !saved) return {};
  if (!saved) return auto || {};
  if (!auto) return saved;

  return {
    ...saved,
    ...auto,
    position:
      saved.position != null && Number(saved.position) > 0
        ? saved.position
        : auto.position,
  };
}

export function formatSubjectScoreCell(value) {
  if (value === undefined || value === null || value === '') return '-';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
  return String(num).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}
