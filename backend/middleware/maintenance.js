/**
 * Maintenance-mode request guard.
 *
 * Mounted on /api before the feature routers. Behaviour:
 *   - maintenance off / outside schedule -> every request continues.
 *   - mode 'everyone'  -> every non-superadmin API request gets 503.
 *   - mode 'logged_in' -> only authenticated non-superadmin requests get 503.
 *
 * Superadmins always pass so they can reach the settings page and turn the
 * notice off. Auth, maintenance status and health endpoints stay reachable so
 * sessions can refresh (and superadmins can sign in) while the notice is up.
 */
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');
const { getFreshUserCached } = require('../utils/adminModuleAccess');
const { getMaintenanceState } = require('../utils/maintenance');

const EXEMPT_PREFIXES = ['/maintenance', '/auth', '/health'];

function isExemptPath(pathname) {
  const path = String(pathname || '');
  return EXEMPT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function readToken(req) {
  const accessToken = req.cookies?.accessToken;
  const legacyToken = req.cookies?.token;
  const headerToken = req.headers.authorization?.split(' ')[1];
  return accessToken || legacyToken || headerToken || null;
}

async function resolveSession(req) {
  const token = readToken(req);
  if (!token) return { authenticated: false, role: null };
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const fresh = await getFreshUserCached(decoded.user_id);
    if (fresh && fresh.status && fresh.status !== 'active') {
      return { authenticated: false, role: null };
    }
    const role = String(fresh?.role || decoded.role || '').toLowerCase();
    return { authenticated: true, role };
  } catch {
    return { authenticated: false, role: null };
  }
}

async function maintenanceGuard(req, res, next) {
  try {
    if (req.method === 'OPTIONS') return next();
    if (isExemptPath(req.path)) return next();

    const state = await getMaintenanceState();
    if (!state.active) return next();

    const session = await resolveSession(req);
    if (session.role === 'superadmin') return next();

    // 'logged_in' leaves the public site and sign-in page usable; the notice
    // only replaces the app for users who are actually logged in.
    if (state.mode === 'logged_in' && !session.authenticated) return next();

    if (state.endsAt) {
      const seconds = Math.max(0, Math.ceil((new Date(state.endsAt).getTime() - Date.now()) / 1000));
      if (Number.isFinite(seconds) && seconds > 0) {
        res.setHeader('Retry-After', String(seconds));
      }
    }

    return res.status(503).json({
      maintenance: true,
      message: state.message,
      mode: state.mode,
      startsAt: state.startsAt,
      endsAt: state.endsAt,
    });
  } catch (error) {
    // Never lock the site because the guard itself failed.
    console.warn('[maintenance] guard error:', error.message);
    return next();
  }
}

module.exports = { maintenanceGuard, isExemptPath };
