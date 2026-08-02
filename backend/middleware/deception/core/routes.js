const fs = require('fs');
const path = require('path');

const { getRoutes } = require('./config');

const TEMPLATES_DIR = path.join(__dirname, '..', 'assets', 'templates');
const HONEYTOKENS_DIR = path.join(__dirname, '..', 'assets', 'honeytokens');

const DEFAULT_ROUTES = {
  '/wp-admin': 'admin_login_fake.html',
  '/.env': 'config_env_canary.json',
  '/backup.zip': 'backup_dashboard.html',
  '/phpmyadmin': 'admin_login_fake.html',
  '/server-status': 'backup_dashboard.html',
  '/config.php': 'admin_login_fake.html',
};

function loadRouteMap() {
  const data = getRoutes();
  const bait = data.bait_routes || Object.keys(DEFAULT_ROUTES);
  const mapping = data.bait_templates || DEFAULT_ROUTES;
  const map = {};
  for (const route of bait) {
    map[route] = mapping[route] || DEFAULT_ROUTES[route] || 'admin_login_fake.html';
  }
  return map;
}

function isBaitPath(requestPath) {
  const cleaned = requestPath.replace(/\/+$/, '');
  return Object.keys(loadRouteMap()).some((route) => cleaned === route || cleaned.startsWith(route + '/'));
}

function matchBait(requestPath) {
  const cleaned = requestPath.replace(/\/+$/, '');
  return Object.keys(loadRouteMap()).find((route) => cleaned === route || cleaned.startsWith(route + '/'));
}

function isProtectedPath(requestPath) {
  const cleaned = requestPath.replace(/\/+$/, '');
  const protectedPaths = (getRoutes().protected_paths || []).filter((p) => typeof p === 'string');
  return protectedPaths.some((p) => cleaned === p || cleaned.startsWith(p + '/'));
}

function getTemplateFor(route, fallback = 'admin_login_fake.html') {
  const info = getTemplateInfo(route, fallback);
  return info.content;
}

function getTemplateInfo(route, fallback = 'admin_login_fake.html') {
  const name = loadRouteMap()[route] || fallback;
  for (const dir of [TEMPLATES_DIR, HONEYTOKENS_DIR]) {
    const target = path.join(dir, name);
    if (fs.existsSync(target)) return { name, content: fs.readFileSync(target, 'utf8') };
  }
  return { name, content: null };
}

function contentTypeFor(name) {
  const ext = path.extname(name || '').toLowerCase();
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.sql') return 'text/plain; charset=utf-8';
  if (ext === '.html') return 'text/html; charset=utf-8';
  return 'application/octet-stream';
}

module.exports = {
  isBaitPath,
  matchBait,
  isProtectedPath,
  getTemplateFor,
  getTemplateInfo,
  contentTypeFor,
  loadRouteMap,
  TEMPLATES_DIR,
};
