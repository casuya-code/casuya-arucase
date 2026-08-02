const crypto = require('crypto');

const { getThresholds } = require('../core/config');
const { createAlerter } = require('../core/alerts');
const { isHoneytokenPath } = require('../core/honeytokens');
const { createIpStore } = require('../core/ip_store');
const { applyLayerHeader } = require('../core/stealth');
const { shouldSkipProtected } = require('./shared');

function createTokenMonitor(options = {}) {
  const thresholds = getThresholds();
  const ttlHours = options.banTtlMs
    ? options.banTtlMs
    : (thresholds.block?.autoban_ttl_hours || 24) * 60 * 60 * 1000;
  const bans = createIpStore(ttlHours);
  const alerter = createAlerter({
    webhookUrl: options.webhookUrl || thresholds.alert?.webhook_url,
    signingKey: options.signingKey || thresholds.alert?.encryption_key || 'change-me',
  });

  function middleware(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress;

    if (bans.get(ip)) {
      if (shouldSkipProtected(req)) return next();
      return applyLayerHeader(res, 'token_monitor').status(403).send('Forbidden');
    }

    if (!isHoneytokenPath(req.path)) return next();
    if (shouldSkipProtected(req)) return next();

    bans.set(ip, true);
    alerter.send({ event: 'honeytoken_hit', ip, path: req.path, at: new Date().toISOString() });

    const junk = crypto.randomBytes(4096).toString('hex');
    applyLayerHeader(res, 'token_monitor')
      .status(200)
      .setHeader('Content-Type', 'application/octet-stream')
      .send(junk);
  }

  return middleware;
}

module.exports = { createTokenMonitor };
