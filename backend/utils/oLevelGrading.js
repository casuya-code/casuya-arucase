/**
 * Canonical O-Level grading scale (Form I–IV).
 *
 * Pre-Form One "continuing" students have already gone through the interview
 * stage, so their results are graded on the school's regular O-Level system
 * instead of the interview pass/fail scale.
 *
 *   A >= 85 | B >= 70 | C >= 50 | D >= 40 | F < 40
 *
 * Mirrors routes/systemGrades.js and utils/calculations.js so the stored grade,
 * the live grid and every PDF agree. The C grade is split for colouring only:
 * averages below {@link O_LEVEL_C_LOW_THRESHOLD} use the light-red "C-low" band,
 * exactly like the O-Level colour guide on the Grades reference page.
 */

const O_LEVEL_GRADING_SCALE = [
  { grade: 'A', min: 85, max: 100, remarks: 'Bora Sana' },
  { grade: 'B', min: 70, max: 84, remarks: 'Vizuri Sana' },
  { grade: 'C', min: 50, max: 69, remarks: 'Vizuri' },
  { grade: 'D', min: 40, max: 49, remarks: 'Dhaifu' },
  { grade: 'F', min: 0, max: 39, remarks: 'Feli' },
];

/** Averages below this mark in grade C are shown in the light-red band. */
const O_LEVEL_C_LOW_THRESHOLD = 55;

const O_LEVEL_PASS_MARK = 40;

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === '' || typeof value === 'boolean') {
    return null;
  }
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(num) ? num : null;
}

/**
 * Grade for a score/average. Returns 'F' for any non-finite value so callers
 * always render a grade (matches systemGrades.js fallback).
 */
function calculateOLevelGrade(score) {
  const num = toFiniteNumber(score);
  if (num === null) return 'F';
  const match = O_LEVEL_GRADING_SCALE.find((entry) => num >= entry.min);
  return match ? match.grade : 'F';
}

/** Full scale entry (grade + Swahili remark) for a score. */
function getOLevelGradeEntry(score) {
  const grade = calculateOLevelGrade(score);
  return (
    O_LEVEL_GRADING_SCALE.find((entry) => entry.grade === grade) ||
    O_LEVEL_GRADING_SCALE[O_LEVEL_GRADING_SCALE.length - 1]
  );
}

/** O-Level Swahili remark for a score (Bora Sana … Feli). */
function getOLevelRemarks(score) {
  return getOLevelGradeEntry(score).remarks;
}

function isOLevelPassing(score) {
  const num = toFiniteNumber(score);
  return num !== null && num >= O_LEVEL_PASS_MARK;
}

module.exports = {
  O_LEVEL_GRADING_SCALE,
  O_LEVEL_C_LOW_THRESHOLD,
  O_LEVEL_PASS_MARK,
  calculateOLevelGrade,
  getOLevelGradeEntry,
  getOLevelRemarks,
  isOLevelPassing,
  toFiniteNumber,
};
