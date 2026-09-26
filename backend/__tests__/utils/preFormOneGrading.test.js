const {
  PASS_MARK,
  MAX_SCORE,
  GRADING_SCALE,
  calculateGrade,
  isPassing,
  getRemarks,
  roundAverage,
  validateScore,
  assignResultPositions,
  toFiniteNumber,
} = require('../../utils/preFormOneGrading');

describe('preFormOneGrading', () => {
  describe('calculateGrade', () => {
    it('uses the canonical Pre-Form One boundaries', () => {
      expect(calculateGrade(100)).toBe('A');
      expect(calculateGrade(80)).toBe('A');
      expect(calculateGrade(79.99)).toBe('B');
      expect(calculateGrade(70)).toBe('B');
      expect(calculateGrade(69.99)).toBe('C');
      expect(calculateGrade(65)).toBe('C');
      expect(calculateGrade(64.99)).toBe('D');
      expect(calculateGrade(45)).toBe('D');
      expect(calculateGrade(44.99)).toBe('F');
      expect(calculateGrade(0)).toBe('F');
    });

    it('does not use the O-Level boundaries', () => {
      expect(calculateGrade(82)).toBe('A');
      expect(calculateGrade(60)).toBe('D');
      expect(calculateGrade(42)).toBe('F');
    });

    it('keeps the pass mark at 65', () => {
      expect(PASS_MARK).toBe(65);
      expect(calculateGrade(PASS_MARK)).toBe('C');
      expect(isPassing(PASS_MARK)).toBe(true);
      expect(isPassing(64.99)).toBe(false);
    });

    it('exposes a non-overlapping grading scale', () => {
      const sorted = [...GRADING_SCALE].sort((a, b) => a.min - b.min);
      sorted.forEach((entry, index) => {
        expect(entry.max - entry.min).toBeGreaterThanOrEqual(0);
        if (index > 0) {
          expect(entry.min).toBe(sorted[index - 1].max + 1);
        }
      });
    });

    it('returns null for missing or non-numeric values', () => {
      expect(calculateGrade(null)).toBeNull();
      expect(calculateGrade(undefined)).toBeNull();
      expect(calculateGrade('')).toBeNull();
      expect(calculateGrade('abc')).toBeNull();
      expect(calculateGrade(NaN)).toBeNull();
      expect(calculateGrade(true)).toBeNull();
    });

    it('accepts numeric strings', () => {
      expect(calculateGrade('75')).toBe('B');
      expect(calculateGrade(' 90 ')).toBe('A');
    });
  });

  describe('getRemarks', () => {
    it('marks 65 and above as selected', () => {
      expect(getRemarks(65)).toBe('AMECHAGULIWA');
      expect(getRemarks(100)).toBe('AMECHAGULIWA');
    });

    it('marks below 65 as not selected', () => {
      expect(getRemarks(64.99)).toBe('HAJACHAGULIWA');
      expect(getRemarks(0)).toBe('HAJACHAGULIWA');
    });
  });

  describe('roundAverage', () => {
    it('rounds to two decimals', () => {
      expect(roundAverage(70.005)).toBe(70.01);
      expect(roundAverage(70)).toBe(70);
      expect(roundAverage(1 / 3)).toBe(0.33);
    });

    it('falls back to 0 for unusable values', () => {
      expect(roundAverage(null)).toBe(0);
      expect(roundAverage('abc')).toBe(0);
    });
  });

  describe('validateScore', () => {
    it('accepts whole numbers inside the range', () => {
      expect(validateScore(0).ok).toBe(true);
      expect(validateScore(0).value).toBe(0);
      expect(validateScore(100).ok).toBe(true);
      expect(validateScore(100).value).toBe(MAX_SCORE);
      expect(validateScore(73).value).toBe(73);
      expect(validateScore('73').value).toBe(73);
    });

    it('rejects decimals instead of letting the database round them', () => {
      const result = validateScore(72.5);
      expect(result.ok).toBe(false);
      expect(result.value).toBeNull();
      expect(result.message).toMatch(/whole number/i);
      expect(validateScore('72.5').ok).toBe(false);
    });

    it('rejects out-of-range values', () => {
      expect(validateScore(101).ok).toBe(false);
      expect(validateScore(-1).ok).toBe(false);
      expect(validateScore(101).message).toMatch(/between 0 and 100/i);
    });

    it('rejects blank, non-numeric and non-scalar values', () => {
      expect(validateScore(undefined).ok).toBe(false);
      expect(validateScore(null).ok).toBe(false);
      expect(validateScore('').ok).toBe(false);
      expect(validateScore('   ').ok).toBe(false);
      expect(validateScore('abc').ok).toBe(false);
      expect(validateScore(NaN).ok).toBe(false);
      expect(validateScore(Infinity).ok).toBe(false);
      expect(validateScore(true).ok).toBe(false);
      expect(validateScore({}).ok).toBe(false);
      expect(validateScore([50]).ok).toBe(false);
    });

    it('rejects exponential notation that would smuggle a decimal through', () => {
      expect(validateScore('1e2').ok).toBe(false);
      expect(validateScore('0x64').ok).toBe(false);
    });
  });

  describe('assignResultPositions', () => {
    it('ranks strictly by descending average', () => {
      const items = [
        { student_id: 1, admission_number: '1001', average: 60 },
        { student_id: 2, admission_number: '1002', average: 90 },
        { student_id: 3, admission_number: '1003', average: 75 },
      ];
      const ranked = assignResultPositions(items);
      expect(ranked.map((r) => r.admission_number)).toEqual(['1002', '1003', '1001']);
      expect(ranked.map((r) => r.position)).toEqual([1, 2, 3]);
    });

    it('shares a position for tied averages and skips the consumed one', () => {
      const items = [
        { student_id: 1, admission_number: '1001', average: 90 },
        { student_id: 2, admission_number: '1002', average: 90 },
        { student_id: 3, admission_number: '1003', average: 80 },
      ];
      const ranked = assignResultPositions(items);
      const positions = Object.fromEntries(ranked.map((r) => [r.student_id, r.position]));
      expect(positions).toEqual({ 1: 1, 2: 1, 3: 3 });
    });

    it('breaks ties deterministically by admission number', () => {
      const items = [
        { student_id: 9, admission_number: '1009', average: 70 },
        { student_id: 8, admission_number: '1008', average: 70 },
      ];
      const ranked = assignResultPositions(items);
      expect(ranked.map((r) => r.admission_number)).toEqual(['1008', '1009']);
      expect(ranked.every((r) => r.position === 1)).toBe(true);
    });

    it('treats unrounded 2.005-style averages consistently', () => {
      const items = [
        { student_id: 1, admission_number: '1001', average: 70.001 },
        { student_id: 2, admission_number: '1002', average: 70.004 },
      ];
      const ranked = assignResultPositions(items);
      expect(ranked.every((r) => r.position === 1)).toBe(true);
    });

    it('handles an empty list', () => {
      expect(assignResultPositions([])).toEqual([]);
    });
  });

  describe('toFiniteNumber', () => {
    it('normalizes usable values only', () => {
      expect(toFiniteNumber('12')).toBe(12);
      expect(toFiniteNumber(12)).toBe(12);
      expect(toFiniteNumber('')).toBeNull();
      expect(toFiniteNumber('x')).toBeNull();
      expect(toFiniteNumber(false)).toBeNull();
    });
  });
});
