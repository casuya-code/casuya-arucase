/**
 * Canonical Pre-Form One grading scale.
 *
 * Mirrors backend/utils/preFormOneGrading.js. Score entry must use the same
 * boundaries as the API, otherwise the grade shown while typing disagrees with
 * the grade the backend stores and prints on the report.
 *
 *   pass mark: 65
 *   A >= 80 | B >= 70 | C >= 65 | D >= 45 | F < 45
 */

export const PRE_FORM_ONE_PASS_MARK = 65;
export const PRE_FORM_ONE_MIN_SCORE = 0;
export const PRE_FORM_ONE_MAX_SCORE = 100;

export const PRE_FORM_ONE_GRADING_SCALE = [
  { grade: 'A', min: 80, max: 100, description: 'Bora Sana' },
  { grade: 'B', min: 70, max: 79, description: 'Vizuri Sana' },
  { grade: 'C', min: 65, max: 69, description: 'Vizuri' },
  { grade: 'D', min: 45, max: 64, description: 'Dhaifu' },
  { grade: 'F', min: 0, max: 44, description: 'Feli' },
];

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === '' || typeof value === 'boolean') {
    return null;
  }
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(num) ? num : null;
}

export function calculatePreFormOneGrade(score) {
  const num = toFiniteNumber(score);
  if (num === null) return null;
  const match = PRE_FORM_ONE_GRADING_SCALE.find((entry) => num >= entry.min);
  return match ? match.grade : 'F';
}

export function isPreFormOnePassing(score) {
  const num = toFiniteNumber(score);
  return num !== null && num >= PRE_FORM_ONE_PASS_MARK;
}

export function getPreFormOneRemarks(score) {
  return isPreFormOnePassing(score) ? 'AMECHAGULIWA' : 'HAJACHAGULIWA';
}

/**
 * Rounds to the two decimals the API stores. Grade and remarks must be derived
 * from this value, not from the raw quotient, otherwise a mark like 64.995
 * previews as 65/C here but is stored and printed as 64/D.
 */
export function roundPreFormOneAverage(value) {
  const num = toFiniteNumber(value);
  if (num === null) return 0;
  return Math.round(num * 100) / 100;
}

/**
 * Matches the backend validateScore: whole numbers within 0-100 only.
 */
export function isValidPreFormOneScore(score) {
  const num = toFiniteNumber(score);
  return num !== null && Number.isInteger(num) && num >= PRE_FORM_ONE_MIN_SCORE && num <= PRE_FORM_ONE_MAX_SCORE;
}

export default {
  PRE_FORM_ONE_PASS_MARK,
  PRE_FORM_ONE_MIN_SCORE,
  PRE_FORM_ONE_MAX_SCORE,
  PRE_FORM_ONE_GRADING_SCALE,
  calculatePreFormOneGrade,
  isPreFormOnePassing,
  getPreFormOneRemarks,
  isValidPreFormOneScore,
  roundPreFormOneAverage,
};
