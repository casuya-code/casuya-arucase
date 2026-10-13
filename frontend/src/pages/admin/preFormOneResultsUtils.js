/**
 * Shared helpers for Pre-Form One interview/continuing results pages.
 *
 * Grade, average and remarks come from utils/preFormOneGrading for interview
 * results (mirrors backend/utils/preFormOneGrading.js) and from
 * utils/oLevelGrading for continuing results (mirrors
 * backend/utils/oLevelGrading.js), so the live grid can never disagree with the
 * stored row or the printed report.
 */

import {
  calculatePreFormOneGrade,
  getPreFormOneRemarks,
  roundPreFormOneAverage,
} from '../../utils/preFormOneGrading';
import {
  calculateOLevelGrade,
  getOLevelRemarks,
} from '../../utils/oLevelGrading';

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

/** Average over scored subjects only (missing/empty scores excluded). */
function calculateMetrics(scoresByCode, activeSubjects, gradeFor, remarksFor) {
  if (!activeSubjects?.length) {
    return { total_marks: 0, average: 0, grade: '-', remarks: '-' };
  }

  let total_marks = 0;
  let scoredCount = 0;

  for (const subject of activeSubjects) {
    const raw = scoreForSubject(scoresByCode, subject.subject_code);
    if (raw !== null && raw !== undefined && raw !== '') {
      const num = Number(raw);
      if (Number.isFinite(num)) {
        total_marks += num;
        scoredCount++;
      }
    }
  }

  const average = roundPreFormOneAverage(scoredCount > 0 ? total_marks / scoredCount : 0);

  return {
    total_marks,
    average,
    grade: gradeFor(average),
    remarks: remarksFor(average),
  };
}

/**
 * Interview grading: Pre-Form One pass/fail scale
 * (A >= 80 | B >= 70 | C >= 65 | D >= 45 | F < 45, remarks AMECHAGULIWA/HAJACHAGULIWA).
 */
export function calculateInterviewMetrics(scoresByCode, activeSubjects) {
  return calculateMetrics(
    scoresByCode,
    activeSubjects,
    calculatePreFormOneGrade,
    getPreFormOneRemarks
  );
}

/**
 * Continuing grading: school O-Level scale
 * (A >= 85 | B >= 70 | C >= 50 | D >= 40 | F < 40, Swahili remarks).
 */
export function calculateContinuingMetrics(scoresByCode, activeSubjects) {
  return calculateMetrics(scoresByCode, activeSubjects, calculateOLevelGrade, getOLevelRemarks);
}

/**
 * Competition ranking, mirroring backend/utils/preFormOneGrading.js: equal
 * averages share a position and the next distinct average skips the consumed
 * positions (90, 90, 80 -> 1, 1, 3). Ties break on admission number so the grid
 * shows the same position the API stored.
 */
export function assignResultPositions(resultsObj) {
  const next = { ...resultsObj };
  const ranked = Object.keys(next)
    .map((adm) => ({ adm, average: roundPreFormOneAverage(next[adm]?.average) }))
    .sort((a, b) => {
      if (b.average !== a.average) return b.average - a.average;
      return String(a.adm).localeCompare(String(b.adm));
    });

  let position = 0;
  let previousAverage = null;

  ranked.forEach((item, index) => {
    if (previousAverage === null || item.average !== previousAverage) {
      position = index + 1;
      previousAverage = item.average;
    }
    next[item.adm] = { ...next[item.adm], position };
  });

  return next;
}

/**
 * Merge saved DB row with live totals from subject scores (auto wins for
 * TOT/AVR/GRD). Position is not merged: callers always re-rank with
 * assignResultPositions so the grid matches the API ranking.
 */
export function mergeAutoAndSavedResult(auto, saved) {
  if (!auto && !saved) return {};
  if (!saved) return auto || {};
  if (!auto) return saved;

  return { ...saved, ...auto };
}

export function formatSubjectScoreCell(value) {
  if (value === undefined || value === null || value === '') return '-';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
  return String(num).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}

/**
 * Header counters: how many students carry a grade, and the mean of the graded
 * averages rounded to one decimal. Averages of 0 or less are skipped so a
 * student with no usable score cannot drag the school average down.
 */
export function calculateResultsStats(resultsByKey) {
  const entries = Object.values(resultsByKey || {});
  const averages = entries
    .map((r) => Number(r?.average))
    .filter((v) => Number.isFinite(v) && v > 0);

  return {
    graded: entries.filter((r) => r?.grade).length,
    averageScore:
      averages.length > 0
        ? Math.round((averages.reduce((sum, v) => sum + v, 0) / averages.length) * 10) / 10
        : null,
  };
}
