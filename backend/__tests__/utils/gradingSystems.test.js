const {
  gradeForScore,
  normalizeGradingSystem,
  getGradingSystemLabel,
  getGradingScale,
  isALevelForLevel,
  remarksForGrade,
} = require('../../utils/gradingSystems');

describe('gradingSystems', () => {
  describe('selection helpers', () => {
    it('normalizes only the supported systems', () => {
      expect(normalizeGradingSystem('Seminary')).toBe('seminary');
      expect(normalizeGradingSystem(' GOVERNMENT ')).toBe('government');
      expect(normalizeGradingSystem('')).toBeNull();
      expect(normalizeGradingSystem('other')).toBeNull();
    });

    it('labels the systems', () => {
      expect(getGradingSystemLabel('seminary')).toBe('Seminary');
      expect(getGradingSystemLabel('government')).toBe('Government');
      expect(getGradingSystemLabel('')).toBe('');
    });

    it('detects A-Level form levels', () => {
      expect(isALevelForLevel('FORM V')).toBe(true);
      expect(isALevelForLevel('FORM VI')).toBe(true);
      expect(isALevelForLevel('FORM IV')).toBe(false);
      expect(isALevelForLevel('O-Level')).toBe(false);
    });
  });

  describe('seminary scale (school default)', () => {
    it('grades O-Level boundaries', () => {
      expect(gradeForScore(100, { system: 'seminary' })).toBe('A');
      expect(gradeForScore(85, { system: 'seminary' })).toBe('A');
      expect(gradeForScore(84.99, { system: 'seminary' })).toBe('B');
      expect(gradeForScore(70, { system: 'seminary' })).toBe('B');
      expect(gradeForScore(69.99, { system: 'seminary' })).toBe('C');
      expect(gradeForScore(50, { system: 'seminary' })).toBe('C');
      expect(gradeForScore(49.99, { system: 'seminary' })).toBe('D');
      expect(gradeForScore(40, { system: 'seminary' })).toBe('D');
      expect(gradeForScore(39.99, { system: 'seminary' })).toBe('F');
      expect(gradeForScore(0, { system: 'seminary' })).toBe('F');
    });

    it('grades A-Level boundaries', () => {
      expect(gradeForScore(85, { system: 'seminary', isALevel: true })).toBe('A');
      expect(gradeForScore(84.99, { system: 'seminary', isALevel: true })).toBe('B');
      expect(gradeForScore(75, { system: 'seminary', isALevel: true })).toBe('B');
      expect(gradeForScore(74.99, { system: 'seminary', isALevel: true })).toBe('C');
      expect(gradeForScore(65, { system: 'seminary', isALevel: true })).toBe('C');
      expect(gradeForScore(64.99, { system: 'seminary', isALevel: true })).toBe('D');
      expect(gradeForScore(55, { system: 'seminary', isALevel: true })).toBe('D');
      expect(gradeForScore(54.99, { system: 'seminary', isALevel: true })).toBe('E');
      expect(gradeForScore(45, { system: 'seminary', isALevel: true })).toBe('E');
      expect(gradeForScore(44.99, { system: 'seminary', isALevel: true })).toBe('S');
      expect(gradeForScore(40, { system: 'seminary', isALevel: true })).toBe('S');
      expect(gradeForScore(39.99, { system: 'seminary', isALevel: true })).toBe('F');
    });
  });

  describe('government scale (CSEE / ACSEE)', () => {
    it('grades O-Level boundaries', () => {
      expect(gradeForScore(100, { system: 'government' })).toBe('A');
      expect(gradeForScore(75, { system: 'government' })).toBe('A');
      expect(gradeForScore(74.99, { system: 'government' })).toBe('B');
      expect(gradeForScore(65, { system: 'government' })).toBe('B');
      expect(gradeForScore(64.99, { system: 'government' })).toBe('C');
      expect(gradeForScore(45, { system: 'government' })).toBe('C');
      expect(gradeForScore(44.99, { system: 'government' })).toBe('D');
      expect(gradeForScore(30, { system: 'government' })).toBe('D');
      expect(gradeForScore(29.99, { system: 'government' })).toBe('F');
      expect(gradeForScore(0, { system: 'government' })).toBe('F');
    });

    it('grades A-Level boundaries', () => {
      expect(gradeForScore(80, { system: 'government', isALevel: true })).toBe('A');
      expect(gradeForScore(79.99, { system: 'government', isALevel: true })).toBe('B');
      expect(gradeForScore(70, { system: 'government', isALevel: true })).toBe('B');
      expect(gradeForScore(69.99, { system: 'government', isALevel: true })).toBe('C');
      expect(gradeForScore(60, { system: 'government', isALevel: true })).toBe('C');
      expect(gradeForScore(59.99, { system: 'government', isALevel: true })).toBe('D');
      expect(gradeForScore(50, { system: 'government', isALevel: true })).toBe('D');
      expect(gradeForScore(49.99, { system: 'government', isALevel: true })).toBe('E');
      expect(gradeForScore(40, { system: 'government', isALevel: true })).toBe('E');
      expect(gradeForScore(39.99, { system: 'government', isALevel: true })).toBe('S');
      expect(gradeForScore(35, { system: 'government', isALevel: true })).toBe('S');
      expect(gradeForScore(34.99, { system: 'government', isALevel: true })).toBe('F');
    });
  });

  describe('fallbacks', () => {
    it('returns null when no system is selected or the score is missing', () => {
      expect(gradeForScore(80, { system: '' })).toBeNull();
      expect(gradeForScore(80, { system: 'other' })).toBeNull();
      expect(gradeForScore(null, { system: 'government' })).toBeNull();
      expect(gradeForScore(undefined, { system: 'government' })).toBeNull();
      expect(gradeForScore('', { system: 'government' })).toBeNull();
      expect(gradeForScore('abc', { system: 'government' })).toBeNull();
    });

    it('accepts numeric strings', () => {
      expect(gradeForScore('75', { system: 'government' })).toBe('A');
      expect(gradeForScore(' 64.5 ', { system: 'government' })).toBe('C');
    });

    it('returns the expected scale', () => {
      expect(getGradingScale('seminary', false)[0]).toEqual({ grade: 'A', min: 85 });
      expect(getGradingScale('seminary', true)[0]).toEqual({ grade: 'A', min: 85 });
      expect(getGradingScale('government', false)[0]).toEqual({ grade: 'A', min: 75 });
      expect(getGradingScale('government', true)[0]).toEqual({ grade: 'A', min: 80 });
      expect(getGradingScale('', false)).toBeNull();
    });
  });

  describe('remarks', () => {
    it('maps grades to the report wording', () => {
      expect(remarksForGrade('A')).toBe('Bora Sana');
      expect(remarksForGrade('B')).toBe('Vizuri Sana');
      expect(remarksForGrade('C')).toBe('Vizuri');
      expect(remarksForGrade('D')).toBe('Dhaifu');
      expect(remarksForGrade('E', { isALevel: true })).toBe('Dhaifu sana');
      expect(remarksForGrade('E')).toBe('Feli');
      expect(remarksForGrade('S')).toBe('Feli');
      expect(remarksForGrade('F')).toBe('Feli');
      expect(remarksForGrade('')).toBeNull();
    });
  });
});
