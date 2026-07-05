const { getSafeMessage, sendError } = require('../../utils/safeError');

describe('safeError', () => {
  let originalNodeEnv;

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('getSafeMessage', () => {
    it('returns error.message when present', () => {
      const err = new Error('Something broke');
      expect(getSafeMessage(err, 500)).toBe('Something broke');
    });

    it('returns error.error property when message is absent', () => {
      const err = { error: 'Custom error field' };
      expect(getSafeMessage(err, 400)).toBe('Custom error field');
    });

    it('returns fallback for null/undefined', () => {
      expect(getSafeMessage(null, 500)).toBe('Internal server error');
      expect(getSafeMessage(undefined, 500)).toBe('Internal server error');
    });

    it('hides real message in production for 5xx', () => {
      process.env.NODE_ENV = 'production';
      const err = new Error('Sensitive DB details');
      expect(getSafeMessage(err, 500)).toBe('Internal server error');
    });

    it('shows real message in production for 4xx', () => {
      process.env.NODE_ENV = 'production';
      const err = new Error('Validation failed');
      expect(getSafeMessage(err, 400)).toBe('Validation failed');
    });

    it('shows real message in development for 5xx', () => {
      process.env.NODE_ENV = 'development';
      const err = new Error('Query failed');
      expect(getSafeMessage(err, 500)).toBe('Query failed');
    });
  });

  describe('sendError', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it('sends error with given status', () => {
      sendError(mockRes, new Error('Not found'), 404);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Not found' });
    });

    it('defaults to status 500 when omitted', () => {
      sendError(mockRes, new Error('Server error'));

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('uses error.status if available', () => {
      const err = new Error('Rate limited');
      err.status = 429;
      sendError(mockRes, err);

      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('returns generic message for 5xx in production', () => {
      process.env.NODE_ENV = 'production';
      sendError(mockRes, new Error('Real error'), 500);

      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });
});
