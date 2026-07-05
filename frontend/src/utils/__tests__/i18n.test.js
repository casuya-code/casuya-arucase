import { describe, it, expect } from 'vitest';
import { t, createT } from '../i18n';

describe('i18n', () => {
  describe('t function', () => {
    it('returns Swahili translation for existing key', () => {
      expect(t('sw', 'common.loading')).toBe('Inapakia...');
      expect(t('sw', 'common.backToHome')).toBe('Rudi Nyumbani');
    });

    it('returns fallback for missing key', () => {
      expect(t('sw', 'nonexistent.key', 'Default')).toBe('Default');
    });

    it('returns key as fallback when no fallback provided', () => {
      expect(t('sw', 'missing.key')).toBe('missing.key');
    });

    it('returns contact translations', () => {
      expect(t('sw', 'contact.pageTitle')).toBe('Wasiliana Nasi');
      expect(t('sw', 'contact.phone')).toBe('Simu');
      expect(t('sw', 'contact.email')).toBe('Barua pepe');
    });

    it('returns department translations', () => {
      expect(t('sw', 'contact.departments.admissions')).toBe('Udahili');
      expect(t('sw', 'contact.departments.academics')).toBe('Masuala ya Taaluma');
    });
  });

  describe('createT', () => {
    it('creates a bound translation function for a language', () => {
      const swT = createT('sw');
      expect(swT('common.loading')).toBe('Inapakia...');
      expect(swT('nonexistent', 'Fall')).toBe('Fall');
    });
  });
});
