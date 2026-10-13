/**
 * Canonical O-Level grading scale (Form I–IV) — frontend twin of
 * backend/utils/oLevelGrading.js.
 *
 * Used by the Pre-Form One *continuing* results because continuing students
 * have already passed the interview stage and are graded on the school's
 * regular O-Level system rather than the interview pass/fail scale.
 *
 *   A >= 85 | B >= 70 | C >= 50 | D >= 40 | F < 40
 *
 * The C grade is split for colouring only: averages below
 * {@link O_LEVEL_C_LOW_THRESHOLD} use the light-red "C-low" band.
 */

export const O_LEVEL_C_LOW_THRESHOLD = 55;
export const O_LEVEL_PASS_MARK = 40;

export const O_LEVEL_GRADING_SCALE = [
  { grade: 'A', min: 85, max: 100, remarks: 'Bora Sana' },
  { grade: 'B', min: 70, max: 84, remarks: 'Vizuri Sana' },
  { grade: 'C', min: 50, max: 69, remarks: 'Vizuri' },
  { grade: 'D', min: 40, max: 49, remarks: 'Dhaifu' },
  { grade: 'F', min: 0, max: 39, remarks: 'Feli' },
];

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === '' || typeof value === 'boolean') {
    return null;
  }
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(num) ? num : null;
}

export function calculateOLevelGrade(score) {
  const num = toFiniteNumber(score);
  if (num === null) return 'F';
  const match = O_LEVEL_GRADING_SCALE.find((entry) => num >= entry.min);
  return match ? match.grade : 'F';
}

export function getOLevelGradeEntry(score) {
  const grade = calculateOLevelGrade(score);
  return (
    O_LEVEL_GRADING_SCALE.find((entry) => entry.grade === grade) ||
    O_LEVEL_GRADING_SCALE[O_LEVEL_GRADING_SCALE.length - 1]
  );
}

export function getOLevelRemarks(score) {
  return getOLevelGradeEntry(score).remarks;
}

export function isOLevelPassing(score) {
  const num = toFiniteNumber(score);
  return num !== null && num >= O_LEVEL_PASS_MARK;
}

export default {
  O_LEVEL_GRADING_SCALE,
  O_LEVEL_C_LOW_THRESHOLD,
  O_LEVEL_PASS_MARK,
  calculateOLevelGrade,
  getOLevelGradeEntry,
  getOLevelRemarks,
  isOLevelPassing,
};
