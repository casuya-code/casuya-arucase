const { sendSuccess, sendError } = require('../../utils/responseHelper');

describe('responseHelper', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('sendSuccess', () => {
    it('sends success response with status code, message, and data', () => {
      sendSuccess(mockRes, 200, 'OK', { id: 1 });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'OK',
          data: { id: 1 },
        })
      );
    });

    it('sends success response with null data when omitted', () => {
      sendSuccess(mockRes, 201, 'Created');

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Created',
          data: null,
        })
      );
    });

    it('includes a timestamp in the response', () => {
      const before = new Date().toISOString().slice(0, 19);
      sendSuccess(mockRes, 200, 'OK');
      const after = new Date().toISOString().slice(0, 19);
      const callArg = mockRes.json.mock.calls[0][0];

      expect(callArg.timestamp).toBeDefined();
      expect(callArg.timestamp.slice(0, 19)).toBe(before);
    });

    it('returns the response object', () => {
      const result = sendSuccess(mockRes, 200, 'OK');
      expect(result).toEqual(
        expect.objectContaining({ success: true, message: 'OK' })
      );
    });
  });

  describe('sendError', () => {
    it('sends error response with status code and message', () => {
      sendError(mockRes, 400, 'Bad request');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Bad request',
        })
      );
    });

    it('extracts error message from Error object', () => {
      sendError(mockRes, 500, 'Server error', new Error('DB connection failed'));

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'DB connection failed',
        })
      );
    });

    it('handles null error gracefully', () => {
      sendError(mockRes, 500, 'Server error', null);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unknown error',
        })
      );
    });

    it('handles string error', () => {
      sendError(mockRes, 422, 'Validation failed', 'Invalid email');

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid email',
        })
      );
    });
  });
});
