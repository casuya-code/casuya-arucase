const crypto = require('crypto');
const { createIpStore } = require('../core/ip_store');
const { applyLayerHeader, pickFallback } = require('../core/stealth');
const { shouldSkipProtected } = require('./shared');

const FALLBACK_THRESHOLD = 25;

const MORPH_MATRIX = {
  scanner: {
    responseType: 'vulnerable_server',
    headers: {
      Server: 'Apache/2.4.41 (Ubuntu)',
      'X-Powered-By': 'PHP/7.4.3',
      'X-AspNet-Version': '4.0.30319',
    },
    bodyVariants: [
      '<html><body><h1>403 Forbidden</h1><p>Access denied by server configuration.</p></body></html>',
      '<html><body><h1>404 Not Found</h1><p>The requested URL was not found on this server.</p></body></html>',
      '<html><body><h1>500 Internal Server Error</h1><p>An unexpected error occurred.</p></body></html>',
    ],
  },
  crawler: {
    responseType: 'cms_backend',
    headers: {
      Server: 'nginx/1.18.0',
      'X-Generator': 'WordPress 5.8.2',
      Link: '<http://example.com/wp-json/>; rel="https://api.w.org/"',
    },
    bodyVariants: [
      '{"code":"rest_no_route","message":"No route was found matching the URL and request method.","data":{"status":404}}',
      '{"error":"unauthorized","message":"Authentication required"}',
    ],
  },
  exploitKit: {
    responseType: 'legacy_service',
    headers: {
      Server: 'Microsoft-IIS/7.5',
      'X-AspNet-Version': '2.0.50727',
      'X-Powered-By': 'ASP.NET',
    },
    bodyVariants: [
      '<!DOCTYPE html><html><head><title>Application Error</title></head><body><h1>Application Error</h1><p>An application error occurred on the server.</p></body></html>',
    ],
  },
  default: {
    responseType: 'generic_proxy',
    headers: {
      Server: 'cloudflare',
    },
    bodyVariants: [
      '<html><body><h1>502 Bad Gateway</h1></body></html>',
      '<html><body><h1>503 Service Temporarily Unavailable</h1></body></html>',
    ],
  },
};

function fingerprintRequest(userAgent = '') {
  const ua = (userAgent || '').toLowerCase();
  if (/nmap|masscan|zmap|sqlmap/.test(ua)) return 'scanner';
  if (/googlebot|bingbot|slurp/.test(ua)) return 'crawler';
  if (/metasploit|nikto|burp/.test(ua)) return 'exploitKit';
  return 'default';
}

function createMimicOctopus(options = {}) {
  const hits = createIpStore();

  function middleware(req, res, next) {
    if (shouldSkipProtected(req)) return next();

    const ip = req.ip || req.socket.remoteAddress;
    const threshold = options.threshold || FALLBACK_THRESHOLD;
    const hitCount = hits.increment(ip);

    if (hitCount <= threshold) return next();

    const fingerprint = fingerprintRequest(req.headers['user-agent']);
    const profile = MORPH_MATRIX[fingerprint] || MORPH_MATRIX.default;

    const seed = `${ip}:${Math.floor(Date.now() / 300000)}`;
    const variantIndex = parseInt(crypto.createHash('md5').update(seed).digest('hex').slice(0, 8), 16) % profile.bodyVariants.length;
    const body = profile.bodyVariants[variantIndex];

    res.status(200);
    for (const [name, value] of Object.entries(profile.headers)) {
      res.setHeader(name, value);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(body));
    applyLayerHeader(res, 'mimic_octopus').send(body);
  }

  return middleware;
}

module.exports = { createMimicOctopus, fingerprintRequest, MORPH_MATRIX };
