/**
 * Canonical Pre-Form One grading rules.
 *
 * Single source of truth shared by the score entry routes, the results
 * calculator and every Pre-Form One PDF renderer so the stored grade, the
 * stored average and the printed report can never disagree.
 *
 *   pass mark: 65
 *   A >= 80 | B >= 70 | C >= 65 | D >= 45 | F < 45
 */

const PASS_MARK = 65;
const MAX_SCORE = 100;
const MIN_SCORE = 0;

const GRADING_SCALE = [
  { grade: 'A', min: 80, max: 100, remarks: 'Excellent' },
  { grade: 'B', min: 70, max: 79, remarks: 'Good' },
  { grade: 'C', min: 65, max: 69, remarks: 'Satisfactory' },
  { grade: 'D', min: 45, max: 64, remarks: 'Needs Improvement' },
  { grade: 'F', min: 0, max: 44, remarks: 'Fail' },
];

const PASSED_REMARKS = 'AMECHAGULIWA';
const FAILED_REMARKS = 'HAJACHAGULIWA';

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return null;
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(num) ? num : null;
}

/**
 * Grade for a score/average. Returns null when the value is not a finite
 * number so callers can distinguish "no data" from a real F.
 */
function calculateGrade(score) {
  const num = toFiniteNumber(score);
  if (num === null) return null;
  const match = GRADING_SCALE.find((entry) => num >= entry.min);
  return match ? match.grade : 'F';
}

function isPassing(score) {
  const num = toFiniteNumber(score);
  return num !== null && num >= PASS_MARK;
}

function getRemarks(score) {
  return isPassing(score) ? PASSED_REMARKS : FAILED_REMARKS;
}

function roundAverage(average) {
  const num = toFiniteNumber(average);
  if (num === null) return 0;
  return Math.round(num * 100) / 100;
}

/**
 * Strict score validation for the INTEGER score columns.
 * Rejects null/blank, booleans, NaN/Infinity, decimals and out-of-range values
 * instead of letting PostgreSQL round or fail the write.
 */
function validateScore(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: false, value: null, message: 'Score is required' };
  }
  if (typeof value === 'boolean' || Array.isArray(value) || typeof value === 'object') {
    return { ok: false, value: null, message: `Score must be a whole number between ${MIN_SCORE} and ${MAX_SCORE}` };
  }
  if (typeof value === 'string' && !/^\s*-?\d+(\.\d+)?\s*$/.test(value)) {
    return { ok: false, value: null, message: `Score must be a whole number between ${MIN_SCORE} and ${MAX_SCORE}` };
  }

  const num = toFiniteNumber(value);
  if (num === null) {
    return { ok: false, value: null, message: `Score must be a whole number between ${MIN_SCORE} and ${MAX_SCORE}` };
  }
  if (num < MIN_SCORE || num > MAX_SCORE) {
    return { ok: false, value: null, message: `Score must be between ${MIN_SCORE} and ${MAX_SCORE}` };
  }
  if (!Number.isInteger(num)) {
    return { ok: false, value: null, message: `Score must be a whole number between ${MIN_SCORE} and ${MAX_SCORE}` };
  }

  return { ok: true, value: num, message: null };
}

/**
 * Competition ranking: equal averages share a position and the next distinct
 * average skips the consumed positions (90, 90, 80 -> 1, 1, 3).
 */
function assignResultPositions(items, getAverage = (item) => item.average) {
  const ranked = [...items].sort((a, b) => {
    const diff = (toFiniteNumber(getAverage(b)) || 0) - (toFiniteNumber(getAverage(a)) || 0);
    if (diff !== 0) return diff;
    const aAdm = String(a.admission_number ?? '');
    const bAdm = String(b.admission_number ?? '');
    if (aAdm !== bAdm) return aAdm.localeCompare(bAdm);
    return (a.student_id ?? 0) - (b.student_id ?? 0);
  });

  let position = 0;
  let previousAverage = null;

  ranked.forEach((item, index) => {
    const average = roundAverage(toFiniteNumber(getAverage(item)) || 0);
    if (previousAverage === null || average !== previousAverage) {
      position = index + 1;
      previousAverage = average;
    }
    item.position = position;
  });

  return ranked;
}

module.exports = {
  PASS_MARK,
  MIN_SCORE,
  MAX_SCORE,
  GRADING_SCALE,
  PASSED_REMARKS,
  FAILED_REMARKS,
  calculateGrade,
  isPassing,
  getRemarks,
  roundAverage,
  validateScore,
  assignResultPositions,
  toFiniteNumber,
};
