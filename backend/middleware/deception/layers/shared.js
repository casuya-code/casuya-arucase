const { isProtectedPath } = require('../core/routes');

function shouldSkipProtected(req) {
  return isProtectedPath(req.path) || req.path === '/health' || req.path.startsWith('/static');
}

module.exports = { shouldSkipProtected };
