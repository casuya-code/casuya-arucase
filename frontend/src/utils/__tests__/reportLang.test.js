import { describe, it, expect } from 'vitest';
import {
  REPORT_LANGUAGES,
  REPORT_TRAIT_CODES,
  normalizeReportLanguage,
  getReportDictionary,
  getMonthAbbreviation,
  getGradeComment,
  getTraitDescription,
  getMarksLegend,
  isALevelForm,
} from '../reportLang';

describe('reportLang', () => {
  describe('normalizeReportLanguage', () => {
    it('defaults to Swahili so existing report links keep working', () => {
      expect(normalizeReportLanguage(undefined)).toBe('sw');
      expect(normalizeReportLanguage('')).toBe('sw');
      expect(normalizeReportLanguage('fr')).toBe('sw');
    });

    it('accepts the English aliases users are likely to type', () => {
      expect(normalizeReportLanguage('en')).toBe('en');
      expect(normalizeReportLanguage('EN')).toBe('en');
      expect(normalizeReportLanguage('English')).toBe('en');
      expect(normalizeReportLanguage(' english ')).toBe('en');
    });
  });

  it('exposes both supported languages', () => {
    expect(REPORT_LANGUAGES).toEqual(['sw', 'en']);
  });

  describe('dictionary parity', () => {
    it('defines the same keys in both languages', () => {
      expect(Object.keys(getReportDictionary('en')).sort()).toEqual(
        Object.keys(getReportDictionary('sw')).sort()
      );
    });

    it('keeps the grading letters and trait codes identical', () => {
      const sw = getReportDictionary('sw');
      const en = getReportDictionary('en');
      expect(Object.keys(en.gradeComments).sort()).toEqual(Object.keys(sw.gradeComments).sort());
      expect(Object.keys(en.traits).sort()).toEqual(Object.keys(sw.traits).sort());
      expect(Object.keys(en.traits).sort()).toEqual([
        '901', '902', '903', '904', '905', '906', '907', '908', '909', '910', '911',
      ]);
    });

    it('leaves no Swahili wording in the English dictionary', () => {
      const en = getReportDictionary('en');
      for (const word of ['Bora Sana', 'Vizuri Sana', 'Dhaifu', 'Wastani', 'Feli', 'Mbaya', 'KIDATO', 'MUHULA', 'MWEZI', 'KIPENGELE', 'MICHEZO']) {
        expect(JSON.stringify(en)).not.toContain(word);
      }
    });

    it('provides the button labels the report page renders', () => {
      expect(getReportDictionary('en').downloadEnglish).toBe('Download English Report');
      expect(getReportDictionary('en').downloadPdf).toBe('Download PDF Report');
      expect(getReportDictionary('sw').downloadEnglish).toBe('Download English Report');
      expect(getReportDictionary('sw').downloadPdf).toBe('Download PDF Report');
    });
  });

  describe('getMonthAbbreviation', () => {
    it('keeps the abbreviations shared by the KEY line in both academic year types', () => {
      expect(getMonthAbbreviation('February', false)).toBe('Jrb1');
      expect(getMonthAbbreviation('March', false)).toBe('Robo');
      expect(getMonthAbbreviation('April', false)).toBe('Jrb2');
      expect(getMonthAbbreviation('May', false)).toBe('Nusu');
      expect(getMonthAbbreviation('May', true)).toBe('Muh');
      expect(getMonthAbbreviation('November', true)).toBe('Nusu');
      expect(getMonthAbbreviation('November', false)).toBe('Muh');
    });
  });

  describe('getGradeComment', () => {
    it('translates the grade comments', () => {
      expect(getGradeComment('sw', 'A')).toBe('Bora Sana');
      expect(getGradeComment('en', 'A')).toBe('Excellent');
      expect(getGradeComment('en', 'E', { isALevel: true })).toBe('Very Weak');
      expect(getGradeComment('en', 'E')).toBe('Average');
    });
  });

  describe('getTraitDescription', () => {
    it('translates every trait and keeps the two-column order', () => {
      expect(getTraitDescription('en', '901')).toBe('Diligent in work');
      expect(getTraitDescription('en', '911')).toBe('Participation in culture / games');
      expect(getTraitDescription('en', '999')).toBe('');
      expect(REPORT_TRAIT_CODES.left).toEqual(['901', '902', '903', '904', '905', '906']);
      expect(REPORT_TRAIT_CODES.right).toEqual(['907', '908', '909', '910', '911']);
    });
  });

  describe('getMarksLegend', () => {
    it('preserves the supplied grade boundaries in both languages', () => {
      expect(getMarksLegend('en', false)).toContain('A = 85 – 100');
      expect(getMarksLegend('en', false)).toContain('C = 50 – 69');
      expect(getMarksLegend('sw', false)).toContain('C = 50 – 69');
      expect(getMarksLegend('en', true)).toContain('E = 45+');
    });

    it('wording the A-Level "E" grade identically on screen and in the PDF', () => {
      expect(getMarksLegend('sw', true)).toContain('E = 45+, Dhaifu sana');
      expect(getGradeComment('sw', 'E', { isALevel: true })).toBe('Dhaifu sana');
      expect(getGradeComment('en', 'E', { isALevel: true })).toBe('Very Weak');
    });
  });

  describe('isALevelForm', () => {
    it('detects A-Level forms only', () => {
      expect(isALevelForm('FORM V')).toBe(true);
      expect(isALevelForm('form vi')).toBe(true);
      expect(isALevelForm('FORM IV')).toBe(false);
      expect(isALevelForm(undefined)).toBe(false);
    });
  });
});
