/**
 * Grading scales used by the Monthly Results GRADWISE view.
 *
 * "Seminary" is the school's default scale (mirrors
 * backend/utils/calculations.js). "Government" follows the CSEE / ACSEE
 * bands supplied by the school:
 *
 * O-Level (CSEE)   A 75-100 | B 65-74 | C 45-64 | D 30-44 | F 0-29
 * A-Level (ACSEE)  A 80-100 | B 70-79 | C 60-69 | D 50-59 | E 40-49
 *                  S 35-39  | F 0-34
 */

const SEMINARY_O_LEVEL_SCALE = [
  { grade: 'A', min: 85 },
  { grade: 'B', min: 70 },
  { grade: 'C', min: 50 },
  { grade: 'D', min: 40 },
  { grade: 'F', min: 0 },
];

const SEMINARY_A_LEVEL_SCALE = [
  { grade: 'A', min: 85 },
  { grade: 'B', min: 75 },
  { grade: 'C', min: 65 },
  { grade: 'D', min: 55 },
  { grade: 'E', min: 45 },
  { grade: 'S', min: 40 },
  { grade: 'F', min: 0 },
];

const GOVERNMENT_O_LEVEL_SCALE = [
  { grade: 'A', min: 75 },
  { grade: 'B', min: 65 },
  { grade: 'C', min: 45 },
  { grade: 'D', min: 30 },
  { grade: 'F', min: 0 },
];

const GOVERNMENT_A_LEVEL_SCALE = [
  { grade: 'A', min: 80 },
  { grade: 'B', min: 70 },
  { grade: 'C', min: 60 },
  { grade: 'D', min: 50 },
  { grade: 'E', min: 40 },
  { grade: 'S', min: 35 },
  { grade: 'F', min: 0 },
];

export const GRADING_SYSTEM_OPTIONS = [
  { value: '', label: 'Scores (off)' },
  { value: 'seminary', label: 'Seminary' },
  { value: 'government', label: 'Government' },
];

export function normalizeGradingSystem(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'seminary' || normalized === 'government') return normalized;
  return '';
}

export function getGradingSystemLabel(value) {
  const normalized = normalizeGradingSystem(value);
  if (normalized === 'seminary') return 'Seminary';
  if (normalized === 'government') return 'Government';
  return '';
}

export function getGradingScale(system, isALevel = false) {
  const normalized = normalizeGradingSystem(system);
  if (!normalized) return null;
  if (normalized === 'government') {
    return isALevel ? GOVERNMENT_A_LEVEL_SCALE : GOVERNMENT_O_LEVEL_SCALE;
  }
  return isALevel ? SEMINARY_A_LEVEL_SCALE : SEMINARY_O_LEVEL_SCALE;
}

/**
 * Convert one score to a grade for the selected system.
 * Returns null when no system is selected or the score is missing/not numeric.
 */
export function gradeForScore(score, { system, isALevel = false } = {}) {
  const scale = getGradingScale(system, isALevel);
  if (!scale) return null;
  if (score === undefined || score === null || score === '') return null;

  const numericScore = typeof score === 'number' ? score : Number(String(score).trim());
  if (!Number.isFinite(numericScore)) return null;

  const band = scale.find((entry) => numericScore >= entry.min);
  return band ? band.grade : 'F';
}

/** Swahili remark that belongs to a grade (same wording as the default reports). */
export function remarksForGrade(grade, { isALevel = false } = {}) {
  const normalized = String(grade || '').trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === 'A') return 'Bora Sana';
  if (normalized === 'B') return 'Vizuri Sana';
  if (normalized === 'C') return 'Vizuri';
  if (normalized === 'D') return 'Dhaifu';
  if (normalized === 'E') return isALevel ? 'Dhaifu sana' : 'Feli';
  return 'Feli';
}
