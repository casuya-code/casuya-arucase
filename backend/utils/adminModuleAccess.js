/**
 * Admin Module Access
 * DB-fresh, cached lookup of which sidebar modules a given admin may use,
 * plus a cached "current user" snapshot used to refresh role/status/permissions
 * so SUPERADMIN re-allocations and grants apply without requiring a re-login.
 *
 * Admin allowlist semantics (matches frontend hasModule and AdminSidebar):
 *   - superadmin -> unrestricted (always allowed)
 *   - admin      -> allowed modules come from users.permissions.modules
 *                   null / missing / unconfigured = unrestricted (legacy backwards compatible)
 *                   [] (empty array) = NO access (fail closed)
 *                   array = only those modules
 *                   ['all'] = unrestricted (explicit full access)
 * Non-admin module checks also resolve fresh from the DB here; the JWT is only
 * a fallback so behavior never regresses when the lookup is unavailable.
 */
const { query } = require('../config/database');

const CACHE_TTL_MS = 30_000;
const USER_CACHE_TTL_MS = 15_000;
const cache = new Map(); // username -> { allowed: string[] | null, expiresAt: number }
const userCache = new Map(); // username -> { user: {role,status,permissions} | null, expiresAt: number }

function parseAllowedModules(rawPermissions) {
  let perms = null;
  if (typeof rawPermissions === 'string') {
    try {
      perms = JSON.parse(rawPermissions);
    } catch {
      perms = null;
    }
  } else if (rawPermissions && typeof rawPermissions === 'object') {
    perms = rawPermissions;
  }
  const modules = perms && perms.modules;
  if (!Array.isArray(modules)) return null;
  return modules;
}

function parsePermissionsObject(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw;
  return {};
}

/**
 * Resolve the module allowlist for an admin/superadmin username.
 * Returns null when the user is unrestricted (no configured list, or any error).
 * Results are cached for CACHE_TTL_MS; use clearAdminModuleCache(username) after
 * the user's permissions change.
 */
async function getAdminAllowedModules(username) {
  if (!username) return null;
  const now = Date.now();
  const hit = cache.get(username);
  if (hit && hit.expiresAt > now) return hit.allowed;

  let allowed = null;
  try {
    const result = await query(
      `SELECT permissions FROM users
       WHERE username = $1 AND LOWER(role) IN ('admin', 'superadmin')`,
      [username]
    );
    if (result.rows.length > 0) {
      allowed = parseAllowedModules(result.rows[0].permissions);
    }
  } catch (error) {
    console.error('getAdminAllowedModules error for user:', username, error.message);
    allowed = null;
  }

  cache.set(username, { allowed, expiresAt: now + CACHE_TTL_MS });
  return allowed;
}

/**
 * Cached snapshot of the user's current role/status/permissions from the DB.
 * Returns null when the user is not found or on error (callers fail open to the
 * JWT claims, preserving current behavior). Used by requireAuth to apply role,
 * status and permission changes without waiting for token expiry.
 */
async function getFreshUserCached(username) {
  if (!username) return null;
  const now = Date.now();
  const hit = userCache.get(username);
  if (hit && hit.expiresAt > now) return hit.user;

  let user = null;
  try {
    const result = await query(
      'SELECT role, status, permissions FROM users WHERE username = $1',
      [username]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      user = {
        role: row.role,
        status: row.status,
        permissions: parsePermissionsObject(row.permissions),
      };
    }
  } catch (error) {
    console.error('getFreshUserCached error for user:', username, error.message);
    user = null;
  }

  userCache.set(username, { user, expiresAt: now + USER_CACHE_TTL_MS });
  return user;
}

/** Drop cached data. Pass a username to invalidate just that user; omit for all. */
function clearAdminModuleCache(username) {
  if (username) {
    cache.delete(username);
    userCache.delete(username);
  } else {
    cache.clear();
    userCache.clear();
  }
}

module.exports = { getAdminAllowedModules, getFreshUserCached, clearAdminModuleCache };
