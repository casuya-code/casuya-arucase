const crypto = require('crypto');

const { getThresholds } = require('./config');

const FALLBACK_VARIANTS = [
  '<html><body>Unauthorized</body></html>',
  '<html><body>401 Forbidden</body></html>',
  '<html><body>Access denied by policy</body></html>',
  '<html><body>Not found</body></html>',
  '<html><body>Server error</body></html>',
];

function stealthConfig() {
  return getThresholds().stealth || {};
}

function emitLayerHeaders() {
  return stealthConfig().emit_layer_headers === true;
}

function varyResponse() {
  return stealthConfig().vary_response !== false;
}

function rotationIntervalHours() {
  return parseInt(stealthConfig().rotation_interval_hours, 10) || 168;
}

function applyLayerHeader(res, layer) {
  if (emitLayerHeaders()) res.setHeader('X-Deception-Layer', layer);
  return res;
}

function pickFallback(html) {
  if (html) return html;
  if (!varyResponse()) return FALLBACK_VARIANTS[0];
  return FALLBACK_VARIANTS[Math.floor(Math.random() * FALLBACK_VARIANTS.length)];
}

function rotateName(name, seedKey) {
  const interval = rotationIntervalHours();
  const hash = crypto.createHash('sha256').update(seedKey).digest('hex');
  const slot = parseInt(hash.slice(0, 8), 16) % Math.max(interval, 1);
  return `${name}_${slot}`;
}

module.exports = { emitLayerHeaders, varyResponse, rotationIntervalHours, applyLayerHeader, pickFallback, rotateName };
