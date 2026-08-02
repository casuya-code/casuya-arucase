const { getTarpitConfig } = require('../core/config');
const { createIpStore } = require('../core/ip_store');
const { applyLayerHeader } = require('../core/stealth');
const { createSlowStream } = require('../core/streamer');
const { isCrawlerUserAgent } = require('../core/ua');
const { shouldSkipProtected } = require('./shared');

function createTarpit(options = {}) {
  const hits = createIpStore();

  function middleware(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress;
    if (!isCrawlerUserAgent(req.headers['user-agent'])) return next();
    if (shouldSkipProtected(req)) return next();

    const config = getTarpitConfig();
    const threshold = options.threshold || config.threshold_requests || 25;
    const chunkBytes = options.chunkBytes || config.slow_stream_bytes || 1048576;

    if (hits.increment(ip) < threshold) return next();

    applyLayerHeader(res, 'recursive_tarpit')
      .status(200)
      .setHeader('Content-Type', 'application/octet-stream')
      .setHeader('Content-Disposition', 'attachment; filename=data.bin');

    createSlowStream(res, { chunkBytes });
  }

  return middleware;
}

module.exports = { createTarpit };
