const { createIpStore } = require('../core/ip_store');
const { applyLayerHeader } = require('../core/stealth');
const { shouldSkipProtected } = require('./shared');

const FALLBACK_THRESHOLD = 40;
const DEAD_SERVICE_TTL_MS = 24 * 60 * 60 * 1000;

function generateDeathResponse(originalPath) {
  const variants = [
    `<!DOCTYPE html>
<html>
<head><title>Application Error</title></head>
<body>
<h1>503 Service Unavailable</h1>
<p>The server is currently unable to handle the request due to a temporary overloading or maintenance of the server.</p>
</body>
</html>`,
    `<!DOCTYPE html>
<html>
<head><title>Database Connection Error</title></head>
<body>
<h1>500 Internal Server Error</h1>
<p>Connection to database failed: <code>Error: connect ECONNREFUSED</code></p>
</body>
</html>`,
    `<!DOCTYPE html>
<html>
<head><title>Maintenance</title></head>
<body>
<h1>503 Service Temporarily Unavailable</h1>
<p>This service is currently undergoing maintenance. Please try again later.</p>
</body>
</html>`,
  ];
  const chosen = variants[Math.floor(Math.random() * variants.length)];
  return chosen.replace('<body>', `<body><!-- requested: ${originalPath} -->`);
}

function createOpossum(options = {}) {
  const hits = createIpStore();
  const deadServices = createIpStore(DEAD_SERVICE_TTL_MS);

  function middleware(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress;
    if (shouldSkipProtected(req)) return next();
    const requestPath = req.path;

    if (deadServices.get(ip)) {
      const body = generateDeathResponse(requestPath);
      res.status(503);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(body));
      res.setHeader('Retry-After', '86400');
      applyLayerHeader(res, 'opossum').send(body);
      return;
    }

    const threshold = options.threshold || FALLBACK_THRESHOLD;
    const hitCount = hits.increment(ip);

    if (hitCount > threshold) {
      deadServices.set(ip, true, DEAD_SERVICE_TTL_MS);
      const body = generateDeathResponse(requestPath);
      res.status(503);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(body));
      res.setHeader('Retry-After', '86400');
      applyLayerHeader(res, 'opossum').send(body);
      return;
    }

    return next();
  }

  return middleware;
}

module.exports = { createOpossum, generateDeathResponse };
