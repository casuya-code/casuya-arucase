import { describe, it, expect } from 'vitest';
import { decodeToken, getTokenExpirationInfo } from '../tokenDecoder';

describe('tokenDecoder', () => {
  describe('decodeToken', () => {
    it('returns null for null/undefined token', () => {
      expect(decodeToken(null)).toBeNull();
      expect(decodeToken(undefined)).toBeNull();
    });

    it('returns null for invalid token format', () => {
      expect(decodeToken('not-a-jwt')).toBeNull();
      expect(decodeToken('only.two')).toBeNull();
    });

    it('decodes a valid JWT token', () => {
      const payload = { id: 1, role: 'admin', name: 'Test User' };
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const body = btoa(JSON.stringify(payload));
      const token = `${header}.${body}.signature`;

      const decoded = decodeToken(token);
      expect(decoded).toEqual(payload);
    });

    it('handles base64url encoding', () => {
      const payload = { data: 'test+/=' };
      const header = btoa(JSON.stringify({ alg: 'HS256' }));
      const encoded = btoa(JSON.stringify(payload))
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      const token = `${header}.${encoded}.sig`;

      const decoded = decodeToken(token);
      expect(decoded.data).toBe('test+/=');
    });
  });

  describe('getTokenExpirationInfo', () => {
    it('returns invalid for null token', () => {
      const info = getTokenExpirationInfo(null);
      expect(info.valid).toBe(false);
      expect(info.message).toContain('Invalid');
    });

    it('reports token as expired when exp is in the past', () => {
      const past = Math.floor(Date.now() / 1000) - 3600;
      const payload = { id: 1, exp: past };
      const header = btoa(JSON.stringify({ alg: 'HS256' }));
      const body = btoa(JSON.stringify(payload));
      const token = `${header}.${body}.sig`;

      const info = getTokenExpirationInfo(token);
      expect(info.valid).toBe(true);
      expect(info.isExpired).toBe(true);
    });

    it('reports token as valid when exp is in the future', () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      const payload = { id: 1, exp: future, iat: future - 3600 };
      const header = btoa(JSON.stringify({ alg: 'HS256' }));
      const body = btoa(JSON.stringify(payload));
      const token = `${header}.${body}.sig`;

      const info = getTokenExpirationInfo(token);
      expect(info.valid).toBe(true);
      expect(info.isExpired).toBe(false);
      expect(info.decoded.id).toBe(1);
      expect(info.issuedAt).not.toBe('Unknown');
    });

    it('reports missing exp claim', () => {
      const payload = { id: 1 };
      const header = btoa(JSON.stringify({ alg: 'HS256' }));
      const body = btoa(JSON.stringify(payload));
      const token = `${header}.${body}.sig`;

      const info = getTokenExpirationInfo(token);
      expect(info.valid).toBe(false);
      expect(info.message).toContain('no expiration');
    });
  });
});
