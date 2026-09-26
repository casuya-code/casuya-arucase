const {
  SUPPORTED_LANGUAGES,
  TRAIT_CODES,
  normalizeReportLanguage,
  getReportDictionary,
  getMonthAbbreviation,
  getGradeComment,
  getTraitDescription,
  getMarksLegend,
  isALevelForm,
} = require('../../utils/reportLang');

describe('reportLang', () => {
  describe('normalizeReportLanguage', () => {
    it('defaults to Swahili for missing or unknown values', () => {
      expect(normalizeReportLanguage(undefined)).toBe('sw');
      expect(normalizeReportLanguage('')).toBe('sw');
      expect(normalizeReportLanguage('fr')).toBe('sw');
      expect(normalizeReportLanguage(null)).toBe('sw');
    });

    it('accepts the English aliases users are likely to type', () => {
      expect(normalizeReportLanguage('en')).toBe('en');
      expect(normalizeReportLanguage('EN')).toBe('en');
      expect(normalizeReportLanguage('eng')).toBe('en');
      expect(normalizeReportLanguage('English')).toBe('en');
      expect(normalizeReportLanguage(' english ')).toBe('en');
    });

    it('treats the bare "sw" query value as Swahili', () => {
      expect(normalizeReportLanguage('sw')).toBe('sw');
      expect(normalizeReportLanguage('swahili')).toBe('sw');
    });
  });

  it('exposes both supported languages', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['sw', 'en']);
  });

  describe('dictionary shape', () => {
    const sw = getReportDictionary('sw');
    const en = getReportDictionary('en');

    it('defines the same keys in both languages so nothing is left untranslated', () => {
      const swKeys = Object.keys(sw).sort();
      const enKeys = Object.keys(en).sort();
      expect(enKeys).toEqual(swKeys);
    });

    it('keeps the grading letters identical between languages', () => {
      expect(Object.keys(en.gradeComments).sort()).toEqual(Object.keys(sw.gradeComments).sort());
    });

    it('keeps the trait codes 901-911 identical between languages', () => {
      expect(Object.keys(en.traits).sort()).toEqual(Object.keys(sw.traits).sort());
      expect(Object.keys(en.traits).sort()).toEqual([
        '901', '902', '903', '904', '905', '906', '907', '908', '909', '910', '911',
      ]);
    });

    it('has no leftover Swahili wording in the English dictionary', () => {
      const swahiliWords = [
        'Bora Sana',
        'Vizuri Sana',
        'Dhaifu',
        'Wastani',
        'Feli',
        'Mbaya',
        'KIDATO',
        'MUHULA',
        'MWAKA',
        'MWEZI',
        'JINSIA',
        'PAROKIA',
        'SAHIHI',
        'KIPENGELE',
        'MICHEZO',
      ];
      for (const word of swahiliWords) {
        expect(JSON.stringify(en)).not.toContain(word);
      }
    });
  });

  describe('getMonthAbbreviation', () => {
    it('uses the same abbreviations for both academic year types', () => {
      expect(getMonthAbbreviation('February', false)).toBe('Jrb1');
      expect(getMonthAbbreviation('August', false)).toBe('Jrb1');
      expect(getMonthAbbreviation('March', false)).toBe('Robo');
      expect(getMonthAbbreviation('September', false)).toBe('Robo');
      expect(getMonthAbbreviation('April', false)).toBe('Jrb2');
      expect(getMonthAbbreviation('October', false)).toBe('Jrb2');
    });

    it('swaps Nusu and Muh for Form V/VI', () => {
      expect(getMonthAbbreviation('May', true)).toBe('Muh');
      expect(getMonthAbbreviation('November', true)).toBe('Nusu');
      expect(getMonthAbbreviation('May', false)).toBe('Nusu');
      expect(getMonthAbbreviation('November', false)).toBe('Muh');
    });

    it('falls back to the month name for unknown months', () => {
      expect(getMonthAbbreviation('December', false)).toBe('December Test');
    });
  });

  describe('getGradeComment', () => {
    it('translates the ordinary grade comments', () => {
      expect(getGradeComment('sw', 'A')).toBe('Bora Sana');
      expect(getGradeComment('en', 'A')).toBe('Excellent');
      expect(getGradeComment('en', 'B')).toBe('Very Good');
      expect(getGradeComment('en', 'C')).toBe('Good');
      expect(getGradeComment('en', 'D')).toBe('Weak');
      expect(getGradeComment('en', 'F')).toBe('Fail');
    });

    it('uses the A-Level "very weak" wording only for A-Level forms', () => {
      expect(getGradeComment('en', 'E', { isALevel: true })).toBe('Very Weak');
      expect(getGradeComment('en', 'E', { isALevel: false })).toBe('Average');
      expect(getGradeComment('sw', 'E', { isALevel: true })).toBe('Dhaifu sana');
    });

    it('falls back to the failing comment for unknown grades', () => {
      expect(getGradeComment('en', 'Z')).toBe('Fail');
      expect(getGradeComment('sw', 'Z')).toBe('Feli');
    });
  });

  describe('getTraitDescription', () => {
    it('translates every trait', () => {
      expect(getTraitDescription('en', '901')).toBe('Diligent in work');
      expect(getTraitDescription('en', '911')).toBe('Participation in culture / games');
      expect(getTraitDescription('sw', '901')).toBe('Kufanya kazi kwa bidii');
    });

    it('returns an empty string for an unknown code instead of leaking a placeholder', () => {
      expect(getTraitDescription('en', '999')).toBe('');
    });

    it('lists trait codes in the same two columns as the printed report', () => {
      expect(TRAIT_CODES.left).toEqual(['901', '902', '903', '904', '905', '906']);
      expect(TRAIT_CODES.right).toEqual(['907', '908', '909', '910', '911']);
    });
  });

  describe('getMarksLegend', () => {
    it('preserves the supplied grade boundaries in both languages', () => {
      expect(getMarksLegend('sw', false)).toContain('A = 85 – 100');
      expect(getMarksLegend('en', false)).toContain('A = 85 – 100');
      expect(getMarksLegend('en', false)).toContain('C = 50 – 69');
      expect(getMarksLegend('en', false)).toContain('D = 40 – 49');
      expect(getMarksLegend('en', false)).toContain('F = 0 – 39');
    });

    it('uses the A-Level legend for Form V/VI', () => {
      expect(getMarksLegend('en', true)).toContain('E = 45+');
      expect(getMarksLegend('sw', true)).toContain('E = 45+');
    });

    it('wording the A-Level "E" grade identically on screen and in the PDF', () => {
      // The screen legend used to say "Wastani" while the PDF said "Dhaifu sana";
      // both surfaces now use the printed wording so parents see the same word.
      expect(getMarksLegend('sw', true)).toContain('E = 45+, Dhaifu sana');
      expect(getGradeComment('sw', 'E', { isALevel: true })).toBe('Dhaifu sana');
      expect(getGradeComment('en', 'E', { isALevel: true })).toBe('Very Weak');
    });
  });

  describe('isALevelForm', () => {
    it('detects Form V and Form VI regardless of case or spacing', () => {
      expect(isALevelForm('FORM V')).toBe(true);
      expect(isALevelForm('form vi')).toBe(true);
      expect(isALevelForm('  Form V  ')).toBe(true);
    });

    it('does not treat other forms as A-Level', () => {
      expect(isALevelForm('FORM I')).toBe(false);
      expect(isALevelForm('FORM II')).toBe(false);
      expect(isALevelForm('FORM IV')).toBe(false);
      expect(isALevelForm(undefined)).toBe(false);
    });
  });
});
