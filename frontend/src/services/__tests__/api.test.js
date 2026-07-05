import { describe, it, expect, vi, beforeEach } from 'vitest';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const axios = await import('axios');
const api = (await import('../api')).default;

describe('API service', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('has baseURL configured', () => {
    expect(api.defaults.baseURL).toBeDefined();
    expect(typeof api.defaults.baseURL).toBe('string');
  });

  it('uses JSON content type', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('includes credentials', () => {
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('has 30 second timeout', () => {
    expect(api.defaults.timeout).toBe(30000);
  });

  it('attaches auth token from localStorage to requests', async () => {
    localStorageMock.getItem.mockReturnValue('test-jwt-token');

    const interceptor = api.interceptors.request.handlers[0];
    const config = await interceptor.fulfilled({ url: '/admin/users', headers: {} });

    expect(config.headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('does not attach token to public API requests', async () => {
    localStorageMock.getItem.mockReturnValue('test-jwt-token');

    const interceptor = api.interceptors.request.handlers[0];
    const config = await interceptor.fulfilled({ url: '/public/admissions', headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('does not add Authorization header if no token exists', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const interceptor = api.interceptors.request.handlers[0];
    const config = await interceptor.fulfilled({ url: '/admin/users', headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });
});
