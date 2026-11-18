const {
  buildMonthlyResultsSummary,
  dedupeSubjects,
} = require('../../utils/monthlyResultsSummary');

const aLevelSubjects = [
  { subject_code: 'A/PHY', subject_abbreviation: 'A/PHY', subject_name: 'ADVANCED PHYSICS' },
  { subject_code: 'A/CHE', subject_abbreviation: 'A/CHE', subject_name: 'ADVANCED CHEMISTRY' },
  { subject_code: 'A/BIO', subject_abbreviation: 'A/BIO', subject_name: 'ADVANCED BIOLOGY' },
  { subject_code: 'A/MAT', subject_abbreviation: 'A/MAT', subject_name: 'ADVANCED MATHEMATICS' },
  { subject_code: 'A/DIV', subject_abbreviation: 'A/DIV', subject_name: 'ADVANCED DIVINITY' },
  { subject_code: 'A/COM', subject_abbreviation: 'A/COM', subject_name: 'ADVANCED COMPUTER STUDIES' },
  { subject_code: 'A/HTM', subject_abbreviation: 'A/HTM', subject_name: 'ADVANCED HISTORIA YA TANZANIA NA MAADILI' },
];

describe('monthlyResultsSummary', () => {
  test('uses per-student combinations and never hides unclassified students', () => {
    const summary = buildMonthlyResultsSummary({
      students: [
        { adm_no: 'S1', com: 'PCM' },
        { adm_no: 'S2', com: 'PCB' },
        { adm_no: 'S3', com: 'ALL' },
      ],
      subjectScores: {
        S1: { 'A/PHY': 80, 'A/CHE': 76, 'A/MAT': 60, 'A/DIV': 90 },
        S2: { 'A/PHY': 60, 'A/CHE': 58, 'A/BIO': 70 },
        S3: { 'A/DIV': 88, 'A/COM': 72, 'A/HTM': 66 },
      },
      subjects: aLevelSubjects,
      isALevel: true,
      gradingSystem: 'seminary',
      fallbackStream: 'ALL',
    });

    expect(summary.registeredCount).toBe(3);
    expect(summary.gradeCols).toEqual(['A', 'B', 'C', 'D', 'E', 'S', 'F']);
    expect(summary.divisionCounts).toMatchObject({ I: 1, II: 1, '0': 1 });
    expect(Object.values(summary.divisionCounts).reduce((a, b) => a + b, 0)).toBe(3);
    expect(summary.subjectGradeCounts['A/DIV']).toMatchObject({ A: 2, total: 2 });
    expect(summary.subjectGradeCounts['A/MAT']).toMatchObject({ D: 1, total: 1 });
  });

  test('counts all A-Level grade buckets in Subject Performance', () => {
    const summary = buildMonthlyResultsSummary({
      students: [{ adm_no: 'S1', com: 'PCM' }],
      subjectScores: { S1: { 'A/PHY': 63, 'A/CHE': 58, 'A/MAT': 47 } },
      subjects: aLevelSubjects,
      isALevel: true,
      gradingSystem: 'seminary',
      fallbackStream: 'PCM',
    });

    const phy = summary.subjectGradeCounts['A/PHY'];
    expect(phy.D).toBe(1);
    ['A', 'B', 'C', 'D', 'E', 'S', 'F'].forEach((grade) => {
      expect(phy[grade]).toBeDefined();
    });
  });

  test('deduplicates advanced-prefixed subject rows', () => {
    expect(dedupeSubjects([
      { subject_code: 'A/COM', subject_abbreviation: 'A/COM' },
      { subject_code: 'COM', subject_abbreviation: 'COM' },
      { subject_code: 'ECO', subject_abbreviation: 'ECO' },
    ])).toHaveLength(2);
  });
});
