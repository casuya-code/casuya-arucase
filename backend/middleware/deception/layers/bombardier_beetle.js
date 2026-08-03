const { getTarpitConfig } = require('../core/config');
const { createIpStore } = require('../core/ip_store');
const { applyLayerHeader } = require('../core/stealth');
const { shouldSkipProtected } = require('./shared');

const FALLBACK_THRESHOLD = 25;
const FALLBACK_RATE_LIMIT = 100;

function createBombardierBeetle(options = {}) {
  const hits = createIpStore();
  const blockedUntil = createIpStore();
  let resourcePool = 100;

  function sendResponse(res, status, body, extraHeaders = {}) {
    const headers = {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      ...extraHeaders,
    };
    res.status(status);
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value);
    }
    applyLayerHeader(res, 'bombardier_beetle').send(body);
  }

  function middleware(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress;
    if (shouldSkipProtected(req)) return next();

    if (blockedUntil.get(ip)) {
      return sendResponse(
        res,
        503,
        'Service Temporarily Unavailable',
        { 'Retry-After': '300' },
      );
    }

    const config = getTarpitConfig();
    const threshold = config.threshold_requests || FALLBACK_THRESHOLD;
    const rateLimit = config.rate_limit || FALLBACK_RATE_LIMIT;

    const hitCount = hits.increment(ip);

    if (hitCount > rateLimit) {
      resourcePool = Math.max(0, resourcePool - 15);
      blockedUntil.set(ip, true, 300000);
      return sendResponse(res, 429, 'Rate limit exceeded', { 'Retry-After': '300' });
    }

    if (hitCount > threshold) {
      resourcePool = Math.max(0, resourcePool - 15);

      let temperature = 0;
      while (temperature < 100) {
        temperature += Math.floor(Math.random() * 20) + 20;
      }
      temperature = Math.min(temperature, 100);

      return sendResponse(res, 429, 'Connection rejected', {
        'X-Exothermic-Output': String(temperature),
      });
    }

    return next();
  }

  return middleware;
}

module.exports = { createBombardierBeetle };
