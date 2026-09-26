import { describe, it, expect } from 'vitest';
import preFormOneGrading, {
  PRE_FORM_ONE_PASS_MARK,
  PRE_FORM_ONE_MAX_SCORE,
  PRE_FORM_ONE_GRADING_SCALE,
  calculatePreFormOneGrade,
  isPreFormOnePassing,
  getPreFormOneRemarks,
  isValidPreFormOneScore,
  roundPreFormOneAverage,
} from '../preFormOneGrading';

describe('preFormOneGrading', () => {
  it('exposes the canonical constants', () => {
    expect(PRE_FORM_ONE_PASS_MARK).toBe(65);
    expect(PRE_FORM_ONE_MAX_SCORE).toBe(100);
    expect(preFormOneGrading.PRE_FORM_ONE_PASS_MARK).toBe(65);
  });

  it('has contiguous, non-overlapping bands from 0 to 100', () => {
    const sorted = [...PRE_FORM_ONE_GRADING_SCALE].sort((a, b) => a.min - b.min);
    expect(sorted[0].min).toBe(0);
    expect(sorted[sorted.length - 1].max).toBe(100);
    sorted.forEach((entry, index) => {
      if (index > 0) {
        expect(entry.min).toBe(sorted[index - 1].max + 1);
      }
    });
  });

  describe('calculatePreFormOneGrade', () => {
    it('matches the Pre-Form One boundaries', () => {
      expect(calculatePreFormOneGrade(100)).toBe('A');
      expect(calculatePreFormOneGrade(80)).toBe('A');
      expect(calculatePreFormOneGrade(79)).toBe('B');
      expect(calculatePreFormOneGrade(70)).toBe('B');
      expect(calculatePreFormOneGrade(69)).toBe('C');
      expect(calculatePreFormOneGrade(65)).toBe('C');
      expect(calculatePreFormOneGrade(64)).toBe('D');
      expect(calculatePreFormOneGrade(45)).toBe('D');
      expect(calculatePreFormOneGrade(44)).toBe('F');
      expect(calculatePreFormOneGrade(0)).toBe('F');
    });

    it('does not use the O-Level boundaries', () => {
      expect(calculatePreFormOneGrade(82)).toBe('A');
      expect(calculatePreFormOneGrade(60)).toBe('D');
      expect(calculatePreFormOneGrade(42)).toBe('F');
    });

    it('returns null for unusable input', () => {
      expect(calculatePreFormOneGrade(null)).toBeNull();
      expect(calculatePreFormOneGrade(undefined)).toBeNull();
      expect(calculatePreFormOneGrade('')).toBeNull();
      expect(calculatePreFormOneGrade('abc')).toBeNull();
      expect(calculatePreFormOneGrade(NaN)).toBeNull();
    });

    it('accepts numeric strings from the form state', () => {
      expect(calculatePreFormOneGrade('75')).toBe('B');
      expect(calculatePreFormOneGrade(' 90 ')).toBe('A');
    });
  });

  describe('isPreFormOnePassing', () => {
    it('uses 65, not 60', () => {
      expect(isPreFormOnePassing(65)).toBe(true);
      expect(isPreFormOnePassing(64.99)).toBe(false);
      expect(isPreFormOnePassing(60)).toBe(false);
      expect(isPreFormOnePassing(null)).toBe(false);
    });
  });

  describe('getPreFormOneRemarks', () => {
    it('switches at the pass mark', () => {
      expect(getPreFormOneRemarks(65)).toBe('AMECHAGULIWA');
      expect(getPreFormOneRemarks(100)).toBe('AMECHAGULIWA');
      expect(getPreFormOneRemarks(64.9)).toBe('HAJACHAGULIWA');
    });
  });

  describe('roundPreFormOneAverage', () => {
    it('rounds to the two decimals the API stores', () => {
      expect(roundPreFormOneAverage(71)).toBe(71);
      expect(roundPreFormOneAverage(64.996666)).toBe(65);
      expect(roundPreFormOneAverage('64.994')).toBe(64.99);
    });

    it('falls back to 0 for unusable input', () => {
      expect(roundPreFormOneAverage(null)).toBe(0);
      expect(roundPreFormOneAverage('')).toBe(0);
      expect(roundPreFormOneAverage('abc')).toBe(0);
    });
  });

  describe('isValidPreFormOneScore', () => {
    it('accepts whole numbers inside the range', () => {
      expect(isValidPreFormOneScore(0)).toBe(true);
      expect(isValidPreFormOneScore(100)).toBe(true);
      expect(isValidPreFormOneScore(73)).toBe(true);
      expect(isValidPreFormOneScore('73')).toBe(true);
    });

    it('rejects fractions so a half mark can never be typed or stored', () => {
      expect(isValidPreFormOneScore(72.5)).toBe(false);
      expect(isValidPreFormOneScore('72.5')).toBe(false);
    });

    it('rejects out-of-range and non-numeric values', () => {
      expect(isValidPreFormOneScore(101)).toBe(false);
      expect(isValidPreFormOneScore(-1)).toBe(false);
      expect(isValidPreFormOneScore('')).toBe(false);
      expect(isValidPreFormOneScore(null)).toBe(false);
      expect(isValidPreFormOneScore('abc')).toBe(false);
      expect(isValidPreFormOneScore(true)).toBe(false);
    });
  });
});
