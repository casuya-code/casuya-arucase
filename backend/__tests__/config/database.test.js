describe('DatabaseOverloadError', () => {
  let DatabaseOverloadError;

  beforeAll(() => {
    DatabaseOverloadError = require('../../config/database').DatabaseOverloadError;
  });

  it('has correct name and status', () => {
    const err = new DatabaseOverloadError();

    expect(err.name).toBe('DatabaseOverloadError');
    expect(err.status).toBe(503);
    expect(err.message).toBe('Database at capacity; try again shortly');
  });

  it('accepts custom message', () => {
    const err = new DatabaseOverloadError('Too many connections');

    expect(err.message).toBe('Too many connections');
    expect(err.status).toBe(503);
  });

  it('is an instance of Error', () => {
    const err = new DatabaseOverloadError();

    expect(err).toBeInstanceOf(Error);
  });
});
