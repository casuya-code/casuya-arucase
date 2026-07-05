import { describe, it, expect } from 'vitest';
import { PROD_DEFAULT_RAILWAY_API } from '../backendUrl';

describe('backendUrl', () => {
  describe('PROD_DEFAULT_RAILWAY_API', () => {
    it('is the production Railway API URL', () => {
      expect(PROD_DEFAULT_RAILWAY_API).toBe('https://arucase-production.up.railway.app/api');
    });

    it('ends with /api', () => {
      expect(PROD_DEFAULT_RAILWAY_API.endsWith('/api')).toBe(true);
    });
  });
});
