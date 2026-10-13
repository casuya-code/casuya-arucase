const {
  O_LEVEL_GRADING_SCALE,
  O_LEVEL_C_LOW_THRESHOLD,
  O_LEVEL_PASS_MARK,
  calculateOLevelGrade,
  getOLevelGradeEntry,
  getOLevelRemarks,
  isOLevelPassing,
} = require('../../utils/oLevelGrading');

describe('oLevelGrading', () => {
  describe('calculateOLevelGrade', () => {
    it('uses the canonical O-Level boundaries', () => {
      expect(calculateOLevelGrade(100)).toBe('A');
      expect(calculateOLevelGrade(85)).toBe('A');
      expect(calculateOLevelGrade(84.99)).toBe('B');
      expect(calculateOLevelGrade(70)).toBe('B');
      expect(calculateOLevelGrade(69.99)).toBe('C');
      expect(calculateOLevelGrade(50)).toBe('C');
      expect(calculateOLevelGrade(49.99)).toBe('D');
      expect(calculateOLevelGrade(40)).toBe('D');
      expect(calculateOLevelGrade(39.99)).toBe('F');
      expect(calculateOLevelGrade(0)).toBe('F');
    });

    it('falls back to F for missing or non-numeric values', () => {
      expect(calculateOLevelGrade(null)).toBe('F');
      expect(calculateOLevelGrade(undefined)).toBe('F');
      expect(calculateOLevelGrade('')).toBe('F');
      expect(calculateOLevelGrade('abc')).toBe('F');
      expect(calculateOLevelGrade(NaN)).toBe('F');
      expect(calculateOLevelGrade(true)).toBe('F');
    });

    it('accepts scores stored as strings', () => {
      expect(calculateOLevelGrade('85')).toBe('A');
      expect(calculateOLevelGrade(' 50 ')).toBe('C');
    });
  });

  describe('remarks', () => {
    it('maps each grade to its Swahili remark', () => {
      expect(getOLevelRemarks(90)).toBe('Bora Sana');
      expect(getOLevelRemarks(75)).toBe('Vizuri Sana');
      expect(getOLevelRemarks(60)).toBe('Vizuri');
      expect(getOLevelRemarks(45)).toBe('Dhaifu');
      expect(getOLevelRemarks(20)).toBe('Feli');
    });

    it('returns the full scale entry', () => {
      expect(getOLevelGradeEntry(50)).toEqual({ grade: 'C', min: 50, max: 69, remarks: 'Vizuri' });
    });
  });

  describe('pass mark and colour band', () => {
    it('keeps the pass mark at 40 and the C-low threshold at 55', () => {
      expect(O_LEVEL_PASS_MARK).toBe(40);
      expect(isOLevelPassing(40)).toBe(true);
      expect(isOLevelPassing(39.99)).toBe(false);
      expect(O_LEVEL_C_LOW_THRESHOLD).toBe(55);
    });
  });

  it('exposes a non-overlapping grading scale', () => {
    const sorted = [...O_LEVEL_GRADING_SCALE].sort((a, b) => a.min - b.min);
    sorted.forEach((entry, index) => {
      expect(entry.max - entry.min).toBeGreaterThanOrEqual(0);
      if (index > 0) {
        expect(entry.min).toBe(sorted[index - 1].max + 1);
      }
    });
  });
});
