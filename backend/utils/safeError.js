/**
 * Safe error response helpers.
 * In production, avoid sending internal error details to the client.
 */

const isProd = () => process.env.NODE_ENV === 'production';

/**
 * Returns a message safe to send to the client for the given status.
 * For 5xx in production, returns a generic message; otherwise returns the original or a fallback.
 */
function getSafeMessage(error, status = 500) {
  if (!error || typeof error !== 'object') return 'Internal server error';
  const msg = error.message || error.error || 'Internal server error';
  if (isProd() && status >= 500) return 'Internal server error';
  return msg;
}

/**
 * Sends a JSON error response. In production, 5xx responses get a generic message.
 * Use in route catch blocks: safeError(res, error, 500) or safeError(res, error).
 */
function sendError(res, error, status = 500) {
  const code = error?.status || error?.statusCode || status;
  const message = getSafeMessage(error, code);
  if (code >= 500) console.error('Error:', error);
  return res.status(code).json({ message });
}

module.exports = { getSafeMessage, sendError };
