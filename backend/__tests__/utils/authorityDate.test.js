const {
  AUTHORITY_DATE_HINT,
  parseAuthorityDate,
  normalizeAuthorityDate,
  formatAuthorityDate,
  validateAuthorityDateInput,
} = require('../../utils/authorityDate');

describe('authorityDate', () => {
  // `new Date('02.05.2025')` returns 5 February 2025 (month first), which is
  // how the authorization date was being printed before: every one of these
  // cases guards against day and month swapping again.
  describe('parseAuthorityDate', () => {
    it('reads DD.MM.YYYY as day first', () => {
      const date = parseAuthorityDate('02.05.2025');
      expect(date).not.toBeNull();
      expect(date.getDate()).toBe(2);
      expect(date.getMonth()).toBe(4); // May
      expect(date.getFullYear()).toBe(2025);
    });

    it('reads DD/MM/YYYY as day first', () => {
      const date = parseAuthorityDate('02/05/2026');
      expect(date.getDate()).toBe(2);
      expect(date.getMonth()).toBe(4);
      expect(date.getFullYear()).toBe(2026);
    });

    it('accepts single digit day and month', () => {
      const date = parseAuthorityDate('2/5/2026');
      expect(date.getDate()).toBe(2);
      expect(date.getMonth()).toBe(4);
      expect(date.getFullYear()).toBe(2026);
    });

    it('accepts dash separated day-first dates', () => {
      const date = parseAuthorityDate('02-05-2025');
      expect(date.getDate()).toBe(2);
      expect(date.getMonth()).toBe(4);
    });

    it('reads legacy ISO values as day first too', () => {
      const date = parseAuthorityDate('2025-05-02');
      expect(date.getDate()).toBe(2);
      expect(date.getMonth()).toBe(4);
      expect(date.getFullYear()).toBe(2025);
    });

    it('rejects impossible or malformed dates', () => {
      expect(parseAuthorityDate('31.02.2025')).toBeNull();
      expect(parseAuthorityDate('00.05.2025')).toBeNull();
      expect(parseAuthorityDate('02.13.2025')).toBeNull();
      expect(parseAuthorityDate('29.02.2025')).toBeNull(); // 2025 is not a leap year
      expect(parseAuthorityDate('02/05.2025')).toBeNull(); // mixed separators
      expect(parseAuthorityDate('abc')).toBeNull();
      expect(parseAuthorityDate('')).toBeNull();
      expect(parseAuthorityDate(null)).toBeNull();
    });

    it('builds the date without a timezone shift', () => {
      // Local construction keeps 01.01.2026 on 1 January in every timezone.
      const date = parseAuthorityDate('01.01.2026');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(1);
    });
  });

  describe('normalizeAuthorityDate', () => {
    it('pads a single digit day and month', () => {
      expect(normalizeAuthorityDate('2.5.2026')).toBe('02.05.2026');
      expect(normalizeAuthorityDate('2/5/2026')).toBe('02/05/2026');
    });

    it('keeps the separator the admin typed', () => {
      expect(normalizeAuthorityDate('02.05.2025')).toBe('02.05.2025');
      expect(normalizeAuthorityDate('02/05/2026')).toBe('02/05/2026');
      expect(normalizeAuthorityDate(' 02/05/2026 ')).toBe('02/05/2026');
    });

    it('converts legacy ISO values to DD/MM/YYYY', () => {
      expect(normalizeAuthorityDate('2025-05-02')).toBe('02/05/2025');
    });

    it('treats empty input as empty and junk as invalid', () => {
      expect(normalizeAuthorityDate('')).toBe('');
      expect(normalizeAuthorityDate(null)).toBe('');
      expect(normalizeAuthorityDate(undefined)).toBe('');
      expect(normalizeAuthorityDate('not a date')).toBeNull();
    });
  });

  describe('formatAuthorityDate', () => {
    const today = new Date();
    const todayExpected = [
      String(today.getDate()).padStart(2, '0'),
      String(today.getMonth() + 1).padStart(2, '0'),
      today.getFullYear(),
    ].join('/');

    it('prints the stored date exactly as saved', () => {
      expect(formatAuthorityDate('02.05.2025')).toBe('02.05.2025');
      expect(formatAuthorityDate('02/05/2026')).toBe('02/05/2026');
      expect(formatAuthorityDate('2.5.2026')).toBe('02.05.2026');
      expect(formatAuthorityDate('2025-05-02')).toBe('02/05/2025');
    });

    it('falls back to today when nothing is stored', () => {
      expect(formatAuthorityDate('')).toBe(todayExpected);
      expect(formatAuthorityDate(null)).toBe(todayExpected);
      expect(formatAuthorityDate(undefined)).toBe(todayExpected);
      expect(formatAuthorityDate('   ')).toBe(todayExpected);
    });

    it('can suppress the today fallback', () => {
      expect(formatAuthorityDate('', { fallbackToToday: false })).toBe('');
    });

    it('keeps an unrecognised legacy value visible instead of hiding it', () => {
      expect(formatAuthorityDate('May 2025')).toBe('May 2025');
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
      expect(validateAuthorityDateInput(undefined).valid).toBe(true);
      expect(validateAuthorityDateInput('   ').valid).toBe(true);
    });

    it('returns the padded value to save for every accepted format', () => {
      expect(validateAuthorityDateInput('02.05.2025')).toEqual({
        valid: true,
        empty: false,
        value: '02.05.2025',
        message: '',
      });
      expect(validateAuthorityDateInput('2/5/2026').value).toBe('02/05/2026');
      expect(validateAuthorityDateInput('2025-05-02').value).toBe('02/05/2025');
    });

    it('rejects values that reports could not print correctly', () => {
      const bad = validateAuthorityDateInput('2 May 2025');
      expect(bad.valid).toBe(false);
      expect(bad.message).toContain(AUTHORITY_DATE_HINT);

      expect(validateAuthorityDateInput('31.02.2025').valid).toBe(false);
      expect(validateAuthorityDateInput('02/13/2025').valid).toBe(false);
    });
  });

  it('describes both accepted formats to the admin', () => {
    expect(AUTHORITY_DATE_HINT).toContain('DD.MM.YYYY');
    expect(AUTHORITY_DATE_HINT).toContain('DD/MM/YYYY');
  });
});
