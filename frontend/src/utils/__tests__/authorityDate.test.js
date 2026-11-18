import { describe, it, expect } from 'vitest';
import {
  AUTHORITY_DATE_HINT,
  parseAuthorityDate,
  normalizeAuthorityDate,
  formatAuthorityDate,
  validateAuthorityDateInput,
} from '../authorityDate';

describe('authorityDate', () => {
  // `new Date('02.05.2025')` returns 5 February 2025 (month first); the admin
  // typed 2 May, so parsing must be day first for the report to match.
  describe('parseAuthorityDate', () => {
    it('reads DD.MM.YYYY and DD/MM/YYYY as day first', () => {
      const dotted = parseAuthorityDate('02.05.2025');
      expect(dotted.getDate()).toBe(2);
      expect(dotted.getMonth()).toBe(4); // May
      expect(dotted.getFullYear()).toBe(2025);

      const slashed = parseAuthorityDate('02/05/2026');
      expect(slashed.getDate()).toBe(2);
      expect(slashed.getMonth()).toBe(4);
      expect(slashed.getFullYear()).toBe(2026);
    });

    it('accepts single digit day and month', () => {
      const date = parseAuthorityDate('2.5.2026');
      expect(date.getDate()).toBe(2);
      expect(date.getMonth()).toBe(4);
      expect(date.getFullYear()).toBe(2026);
    });

    it('rejects impossible dates', () => {
      expect(parseAuthorityDate('31.02.2025')).toBeNull();
      expect(parseAuthorityDate('02/13/2025')).toBeNull();
      expect(parseAuthorityDate('not a date')).toBeNull();
      expect(parseAuthorityDate('')).toBeNull();
    });
  });

  describe('normalizeAuthorityDate', () => {
    it('pads single digits and keeps the typed separator', () => {
      expect(normalizeAuthorityDate('2.5.2026')).toBe('02.05.2026');
      expect(normalizeAuthorityDate('2/5/2026')).toBe('02/05/2026');
      expect(normalizeAuthorityDate('02.05.2025')).toBe('02.05.2025');
    });

    it('converts legacy ISO values and flags junk', () => {
      expect(normalizeAuthorityDate('2025-05-02')).toBe('02/05/2025');
      expect(normalizeAuthorityDate('')).toBe('');
      expect(normalizeAuthorityDate('soon')).toBeNull();
    });
  });

  describe('formatAuthorityDate', () => {
    it('prints what the admin saved, so the preview matches the PDF', () => {
      expect(formatAuthorityDate('02.05.2025')).toBe('02.05.2025');
      expect(formatAuthorityDate('02/05/2026')).toBe('02/05/2026');
      expect(formatAuthorityDate('2.5.2026')).toBe('02.05.2026');
    });

    it('falls back to today only when nothing is stored', () => {
      const today = new Date();
      const expected = [
        String(today.getDate()).padStart(2, '0'),
        String(today.getMonth() + 1).padStart(2, '0'),
        today.getFullYear(),
      ].join('/');

      expect(formatAuthorityDate('')).toBe(expected);
      expect(formatAuthorityDate(null)).toBe(expected);
      expect(formatAuthorityDate('', { fallbackToToday: false })).toBe('');
    });
  });

  describe('validateAuthorityDateInput', () => {
    it('allows the optional field to stay empty', () => {
      expect(validateAuthorityDateInput('')).toEqual({
        valid: true,
        empty: true,
        value: '',
        message: '',
      });
    });

    it('returns the padded value that will be saved', () => {
      expect(validateAuthorityDateInput('2/5/2026').value).toBe('02/05/2026');
      expect(validateAuthorityDateInput('02.05.2025').value).toBe('02.05.2025');
    });

    it('explains the accepted formats when the value is wrong', () => {
      const bad = validateAuthorityDateInput('May 2025');
      expect(bad.valid).toBe(false);
      expect(bad.message).toContain('DD.MM.YYYY');
      expect(bad.message).toContain('DD/MM/YYYY');
      expect(AUTHORITY_DATE_HINT).toContain('02.05.2025');
    });
  });
});
