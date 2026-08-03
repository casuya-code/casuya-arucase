const { createIpStore } = require('../core/ip_store');
const { createSlowStream } = require('../core/streamer');
const { applyLayerHeader } = require('../core/stealth');
const { shouldSkipProtected } = require('./shared');

const FALLBACK_THRESHOLD = 75;
const DUMP_MARKER = 'data:';

function generateDumpRows(originalPath, rowCount) {
  const rows = [];
  for (let i = 0; i < rowCount; i += 1) {
    rows.push(`data: {"type":"customer","id":${1000 + i},"email":"user${i}@corp.example","credit_card":"4111-1111-1111-${String(i).padStart(4, '0')}"}`);
  }
  rows.push(`data: {"type":"dump_complete","source":"${originalPath}"}`);
  return rows.join('\n');
}

function createHornedLizard(options = {}) {
  const hits = createIpStore();
  const served = createIpStore();
  const activeStreams = createIpStore();

  function middleware(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress;
    if (shouldSkipProtected(req)) return next();
    const requestPath = req.path;

    const threshold = options.threshold || FALLBACK_THRESHOLD;
    const hitCount = hits.increment(ip);

    if (hitCount > threshold && !served.get(ip)) {
      served.set(ip, true);
      activeStreams.set(ip, true, 60000);

      const rowCount = options.dumpSize || 5000;
      const rows = generateDumpRows(requestPath, rowCount);

      res.status(200);
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('X-Autonomic-Exsanguination', 'true');
      applyLayerHeader(res, 'horned_lizard');

      const stop = createSlowStream(res, { chunkBytes: 65536, intervalMs: 50 });
      res.write(rows);
      res.end();

      res.on('close', () => {
        stop();
        activeStreams.set(ip, undefined, 1);
      });
      return;
    }

    if (activeStreams.get(ip)) return;

    return next();
  }

  return middleware;
}

module.exports = { createHornedLizard, generateDumpRows };
