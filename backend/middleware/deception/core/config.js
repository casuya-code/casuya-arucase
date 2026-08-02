const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', 'config');

function loadJson(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, name), 'utf8'));
  } catch {
    return {};
  }
}

function loadConf(name) {
  const result = {};
  let current = null;
  try {
    const lines = fs.readFileSync(path.join(CONFIG_DIR, name), 'utf8').split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || line.startsWith(';')) continue;
      const section = line.match(/^\[(.+)\]$/);
      if (section) {
        current = result[section[1].toLowerCase()] = {};
        continue;
      }
      const kv = line.match(/^([^#=]+?)\s*=\s*(.*)$/);
      if (kv && current) {
        current[kv[1].trim().toLowerCase()] = coerce(kv[2].trim());
      }
    }
  } catch {
    // config file may not exist yet
  }
  return result;
}

function coerce(value) {
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/^https?:\/\//i.test(value)) return value;
  const asInt = parseInt(value, 10);
  return Number.isNaN(asInt) ? value : asInt;
}

function getRoutes() {
  return loadJson('deception_routes.json');
}

function getThresholds() {
  return loadConf('threshold_rules.conf');
}

module.exports = { getRoutes, getThresholds, getTarpitConfig: () => getThresholds().tarpit || {} };
