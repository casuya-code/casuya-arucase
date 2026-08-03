const { createIpStore } = require('../core/ip_store');
const { applyLayerHeader } = require('../core/stealth');
const { shouldSkipProtected } = require('./shared');

const FALLBACK_THRESHOLD = 50;
const DESTRUCTION_COOLDOWN_MS = 300 * 1000;

function generateSacrificeResponse(originalPath) {
  return `<!DOCTYPE html>
<html>
<head><title>Configuration Backup</title></head>
<body>
<h1>Database Configuration</h1>
<pre>
DB_HOST=localhost
DB_PORT=5432
DB_NAME=production
DB_USER=admin
DB_PASSWORD=PLACEHOLDER_PASSWORD
</pre>
<p>File: ${originalPath}</p>
</body>
</html>`;
}

function generateTrapResponse(trapPath) {
  return `<!DOCTYPE html>
<html>
<head><title>Secure Area</title></head>
<body>
<h1>Access Restricted</h1>
<p>This area requires additional authentication.</p>
<form action="${trapPath}" method="POST">
<label>Username: <input type="text" name="username"></label><br>
<label>Password: <input type="password" name="password"></label><br>
<button type="submit">Login</button>
</form>
</body>
</html>`;
}

function createHairyFrog(options = {}) {
  const hits = createIpStore();
  const destructionActive = createIpStore(DESTRUCTION_COOLDOWN_MS);
  const sacrificedEndpoints = new Map();
  let health = 100;

  function sendHtml(res, body, headerName, headerValue) {
    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(body));
    if (headerName) res.setHeader(headerName, headerValue);
    applyLayerHeader(res, 'hairy_frog').send(body);
  }

  function middleware(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress;
    if (shouldSkipProtected(req)) return next();
    const requestPath = req.path;

    if (destructionActive.get(ip)) {
      if (sacrificedEndpoints.has(requestPath)) {
        const trapPath = sacrificedEndpoints.get(requestPath);
        return sendHtml(res, generateTrapResponse(trapPath), 'X-Trap-Activated', 'true');
      }
      return next();
    }

    const threshold = options.threshold || FALLBACK_THRESHOLD;
    const hitCount = hits.increment(ip);

    if (hitCount > threshold) {
      health = Math.max(0, health - 8);

      const trapPath = `/trap_${Math.abs(hashString(requestPath)) % 10000}`;
      sacrificedEndpoints.set(requestPath, trapPath);
      destructionActive.set(ip, true, DESTRUCTION_COOLDOWN_MS);

      return sendHtml(res, generateSacrificeResponse(requestPath), 'X-Structural-Fracture', 'true');
    }

    return next();
  }

  return middleware;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

module.exports = { createHairyFrog, generateSacrificeResponse, generateTrapResponse };
