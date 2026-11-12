/**
 * Grading scales for the Monthly Results GRADWISE output.
 *
 * "Seminary" mirrors utils/calculations.js (the school's default scale).
 * "Government" follows the CSEE / ACSEE bands supplied by the school:
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

function normalizeGradingSystem(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'seminary' || normalized === 'government') return normalized;
  return null;
}

function getGradingSystemLabel(value) {
  const normalized = normalizeGradingSystem(value);
  if (normalized === 'seminary') return 'Seminary';
  if (normalized === 'government') return 'Government';
  return '';
}

function isALevelForLevel(level) {
  const normalized = String(level || '').toUpperCase();
  return /FORM\s+(V|VI)\b/.test(normalized) || normalized.includes('A-LEVEL');
}

function getGradingScale(system, isALevel = false) {
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
function gradeForScore(score, { system, isALevel = false } = {}) {
  const scale = getGradingScale(system, isALevel);
  if (!scale) return null;
  if (score === undefined || score === null || score === '') return null;

  const numericScore = typeof score === 'number' ? score : Number(String(score).trim());
  if (!Number.isFinite(numericScore)) return null;

  const band = scale.find((entry) => numericScore >= entry.min);
  return band ? band.grade : 'F';
}

/** Swahili remark that belongs to a grade (same wording as the default reports). */
function remarksForGrade(grade, { isALevel = false } = {}) {
  const normalized = String(grade || '').trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === 'A') return 'Bora Sana';
  if (normalized === 'B') return 'Vizuri Sana';
  if (normalized === 'C') return 'Vizuri';
  if (normalized === 'D') return 'Dhaifu';
  if (normalized === 'E') return isALevel ? 'Dhaifu sana' : 'Feli';
  return 'Feli';
}

module.exports = {
  SEMINARY_O_LEVEL_SCALE,
  SEMINARY_A_LEVEL_SCALE,
  GOVERNMENT_O_LEVEL_SCALE,
  GOVERNMENT_A_LEVEL_SCALE,
  normalizeGradingSystem,
  getGradingSystemLabel,
  getGradingScale,
  isALevelForLevel,
  gradeForScore,
  remarksForGrade,
};
// ---- Division / points helpers (mirrors utils/calculations.js) ----

const O_LEVEL_GRADE_VALUE_MAP = { A: 1, B: 2, C: 3, D: 4, F: 5 };

function calculateOLevelDivisionPoint(subjectsData) {
  const gradeValues = [];
  for (const subjectCode in (subjectsData || {})) {
    const subjectData = subjectsData[subjectCode] || {};
    const grade = subjectData.grade || 'F';
    const gradeValue = O_LEVEL_GRADE_VALUE_MAP[grade] || 5;
    gradeValues.push(gradeValue);
  }
  gradeValues.sort((a, b) => a - b);
  const sevenHighest = gradeValues.slice(0, 7);
  return sevenHighest.reduce((sum, val) => sum + val, 0);
}

const A_LEVEL_GRADE_VALUE_MAP = { A: 1, B: 2, C: 3, D: 4, E: 5, S: 6, F: 7 };

const A_LEVEL_COMBINATIONS = {
  'PCM': ['PHY', 'CHE', 'ADV'],
  'PCB': ['PHY', 'CHE', 'BIO'],
  'PGM': ['PHY', 'GEO', 'ADV'],
  'CBG': ['CHE', 'BIO', 'GEO'],
  'EGM': ['ECO', 'GEO', 'ADV'],
  'HGE': ['HIS', 'GEO', 'ECO'],
  'HGL': ['HIS', 'GEO', 'ENG'],
  'HGK': ['HIS', 'GEO', 'KIS'],
  'HKL': ['HIS', 'KIS', 'ENG'],
};

function detectCombinationFromSubjects(subjectsData) {
  const subjectCodes = Object.keys(subjectsData || {}).map((c) => String(c).toUpperCase());
  const subjectNames = Object.values(subjectsData || {}).map((s) => String((s && s.name) || '').toUpperCase());

  if (
    (subjectCodes.some((c) => c.includes('PHY')) || subjectNames.some((n) => n.includes('PHYSICS'))) &&
    (subjectCodes.some((c) => c.includes('CHE')) || subjectNames.some((n) => n.includes('CHEMISTRY'))) &&
    (subjectCodes.some((c) => c.includes('ADV') || c.includes('MATH')) || subjectNames.some((n) => n.includes('ADVANCED') || n.includes('MATH'))) &&
    !(subjectCodes.some((c) => c.includes('BASIC')) || subjectNames.some((n) => n.includes('BASIC')))
  ) return 'PCM';

  if (
    (subjectCodes.some((c) => c.includes('PHY')) || subjectNames.some((n) => n.includes('PHYSICS'))) &&
    (subjectCodes.some((c) => c.includes('CHE')) || subjectNames.some((n) => n.includes('CHEMISTRY'))) &&
    (subjectCodes.some((c) => c.includes('BIO')) || subjectNames.some((n) => n.includes('BIOLOGY')))
  ) return 'PCB';

  if (
    (subjectCodes.some((c) => c.includes('PHY')) || subjectNames.some((n) => n.includes('PHYSICS'))) &&
    (subjectCodes.some((c) => c.includes('GEO')) || subjectNames.some((n) => n.includes('GEOGRAPHY'))) &&
    (subjectCodes.some((c) => c.includes('ADV') || c.includes('MATH') || c.includes('MAT')) || subjectNames.some((n) => n.includes('ADVANCED') || n.includes('MATH')))
  ) return 'PGM';

  if (
    (subjectCodes.some((c) => c.includes('CHE')) || subjectNames.some((n) => n.includes('CHEMISTRY'))) &&
    (subjectCodes.some((c) => c.includes('BIO')) || subjectNames.some((n) => n.includes('BIOLOGY'))) &&
    (subjectCodes.some((c) => c.includes('GEO')) || subjectNames.some((n) => n.includes('GEOGRAPHY')))
  ) return 'CBG';

  if (
    (subjectCodes.some((c) => c.includes('ECO')) || subjectNames.some((n) => n.includes('ECONOMICS'))) &&
    (subjectCodes.some((c) => c.includes('GEO')) || subjectNames.some((n) => n.includes('GEOGRAPHY'))) &&
    (subjectCodes.some((c) => c.includes('ADV') || c.includes('MATH') || c.includes('MAT')) || subjectNames.some((n) => n.includes('ADVANCED') || n.includes('MATH')))
  ) return 'EGM';

  if (
    (subjectCodes.some((c) => c.includes('HIS')) || subjectNames.some((n) => n.includes('HISTORY'))) &&
    (subjectCodes.some((c) => c.includes('GEO')) || subjectNames.some((n) => n.includes('GEOGRAPHY'))) &&
    (subjectCodes.some((c) => c.includes('ECO')) || subjectNames.some((n) => n.includes('ECONOMICS')))
  ) return 'HGE';

  if (
    (subjectCodes.some((c) => c.includes('HIS')) || subjectNames.some((n) => n.includes('HISTORY'))) &&
    (subjectCodes.some((c) => c.includes('GEO')) || subjectNames.some((n) => n.includes('GEOGRAPHY'))) &&
    (subjectCodes.some((c) => c.includes('ENG')) || subjectNames.some((n) => n.includes('ENGLISH') || n.includes('LITERATURE')))
  ) return 'HGL';

  if (
    (subjectCodes.some((c) => c.includes('HIS')) || subjectNames.some((n) => n.includes('HISTORY'))) &&
    (subjectCodes.some((c) => c.includes('GEO')) || subjectNames.some((n) => n.includes('GEOGRAPHY'))) &&
    (subjectCodes.some((c) => c.includes('KIS')) || subjectNames.some((n) => n.includes('KISWAHILI') || n.includes('SWAHILI')))
  ) return 'HGK';

  if (
    (subjectCodes.some((c) => c.includes('HIS')) || subjectNames.some((n) => n.includes('HISTORY'))) &&
    (subjectCodes.some((c) => c.includes('KIS')) || subjectNames.some((n) => n.includes('KISWAHILI') || n.includes('SWAHILI'))) &&
    (subjectCodes.some((c) => c.includes('ENG')) || subjectNames.some((n) => n.includes('ENGLISH') || n.includes('LITERATURE')))
  ) return 'HKL';

  return null;
}

function matchesSubject(subjectCode, subjectName, comboCode) {
  const codeUpper = String(subjectCode || '').toUpperCase();
  const nameUpper = String(subjectName || '').toUpperCase();
  const patterns = {
    'PHY': ['PHY', 'PHYSICS', 'A/PHY', 'A_PHY'],
    'CHE': ['CHE', 'CHEMISTRY', 'A/CHE', 'A_CHE'],
    'BIO': ['BIO', 'BIOLOGY', 'A/BIO', 'A_BIO'],
    'ADV': ['ADV', 'ADVANCED', 'A/MATH', 'A/MAT', 'A_MATH', 'ADVANCED MATH', 'MATHEMATICS'],
    'ECO': ['ECO', 'ECONOMICS', 'A/ECO', 'A_ECO'],
    'GEO': ['GEO', 'GEOGRAPHY', 'A/GEO', 'A_GEO'],
    'HIS': ['HIS', 'HISTORY', 'A/HIS', 'A_HIS'],
    'KIS': ['KIS', 'KISWAHILI', 'A/KIS', 'A_KIS', 'SWA', 'SWAHILI'],
    'ENG': ['ENG', 'ENGLISH', 'A/ENG', 'A_ENG', 'LIT', 'LITERATURE', 'A/LIT', 'A_LIT'],
  };
  const patternsForCode = patterns[comboCode] || [];
  for (const pattern of patternsForCode) {
    if (codeUpper.includes(pattern) || nameUpper.includes(pattern)) {
      if (comboCode === 'PHY' && (codeUpper.includes('GEO') || nameUpper.includes('GEOGRAPHY'))) continue;
      if (comboCode === 'ADV') {
        if (codeUpper.includes('BASIC') || nameUpper.includes('BASIC')) continue;
        if (pattern === 'ADVANCED' || pattern === 'ADV') {
          const isMathSubject = nameUpper.includes('MATH') || nameUpper.includes('MATHEMATICS') ||
            codeUpper.includes('/MAT') || codeUpper.includes('_MAT');
          if (!isMathSubject) continue;
        }
      }
      if (comboCode === 'HIS' && (codeUpper.includes('TANZANIA') || nameUpper.includes('TANZANIA'))) continue;
      return true;
    }
  }
  return false;
}

function calculateALevelDivisionPoint(subjectsData, stream) {
  let detectedStream = stream ? String(stream).trim().toUpperCase() : null;
  if (!detectedStream || !A_LEVEL_COMBINATIONS[detectedStream]) {
    detectedStream = detectCombinationFromSubjects(subjectsData);
  }
  if (!detectedStream || !A_LEVEL_COMBINATIONS[detectedStream]) return null;
  const combinationSubjects = A_LEVEL_COMBINATIONS[detectedStream];
  const comboBestGrades = {};
  for (const subjectCode in (subjectsData || {})) {
    const subjectData = subjectsData[subjectCode] || {};
    const grade = subjectData.grade || 'F';
    const gradeValue = A_LEVEL_GRADE_VALUE_MAP[grade] || 7;
    const subjectName = String(subjectData.name || '').toUpperCase();
    for (const comboCode of combinationSubjects) {
      if (matchesSubject(subjectCode, subjectName, comboCode)) {
        if (!comboBestGrades[comboCode] || gradeValue < comboBestGrades[comboCode]) {
          comboBestGrades[comboCode] = gradeValue;
        }
        break;
      }
    }
  }
  const gradeValues = Object.values(comboBestGrades);
  if (gradeValues.length !== 3) return null;
  gradeValues.sort((a, b) => a - b);
  return gradeValues.reduce((sum, val) => sum + val, 0);
}

function getOLevelDivision(divisionPoint) {
  if (divisionPoint >= 7 && divisionPoint <= 17) return 'I';
  if (divisionPoint >= 18 && divisionPoint <= 20) return 'II';
  if (divisionPoint >= 21 && divisionPoint <= 25) return 'III';
  if (divisionPoint >= 26 && divisionPoint <= 33) return 'IV';
  return '0';
}

function getALevelDivision(divisionPoint) {
  if (divisionPoint === null || divisionPoint === undefined) return null;
  if (divisionPoint >= 3 && divisionPoint <= 9) return 'I';
  if (divisionPoint >= 10 && divisionPoint <= 12) return 'II';
  if (divisionPoint >= 13 && divisionPoint <= 17) return 'III';
  if (divisionPoint >= 18 && divisionPoint <= 19) return 'IV';
  return '0';
}

function calculateDivisionAndPoints(options) {
  const isALevel = !!(options && options.isALevel);
  const subjectsData = (options && options.subjectsData) || {};
  const stream = options && options.stream;
  const points = isALevel
    ? calculateALevelDivisionPoint(subjectsData, stream)
    : calculateOLevelDivisionPoint(subjectsData);
  const division = isALevel ? getALevelDivision(points) : getOLevelDivision(points);
  return { points: points, division: division };
}

module.exports.calculateOLevelDivisionPoint = calculateOLevelDivisionPoint;
module.exports.calculateALevelDivisionPoint = calculateALevelDivisionPoint;
module.exports.getOLevelDivision = getOLevelDivision;
module.exports.getALevelDivision = getALevelDivision;
module.exports.calculateDivisionAndPoints = calculateDivisionAndPoints;
