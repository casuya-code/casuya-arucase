/**
 * Maintenance mode settings.
 *
 * The whole website can be put behind a maintenance notice. Two modes:
 *   - 'everyone'  : the public site and all normal users are blocked.
 *   - 'logged_in' : the public site stays open; a normal user sees the notice
 *                   only after signing in.
 * A superadmin is never blocked, so they can always turn the notice off.
 *
 * A schedule window (starts_at / ends_at) is optional. When set, maintenance
 * activates automatically inside the window; the `enabled` switch is the master
 * switch.
 */
const { query } = require('../config/database');

const DEFAULT_MESSAGE = 'The website is currently under maintenance. Please check back soon.';
const VALID_MODES = ['everyone', 'logged_in'];
const CACHE_TTL_MS = 3000;

let cache = { value: null, expiresAt: 0 };

const TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS maintenance_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    message TEXT NOT NULL DEFAULT '${DEFAULT_MESSAGE.replace(/'/g, "''")}',
    mode VARCHAR(20) NOT NULL DEFAULT 'everyone',
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(255),
    CONSTRAINT maintenance_settings_single_row CHECK (id = 1),
    CONSTRAINT maintenance_settings_mode_check CHECK (mode IN ('everyone', 'logged_in'))
  )
`;

function normalizeRow(row) {
  if (!row) {
    return {
      enabled: false,
      message: DEFAULT_MESSAGE,
      mode: 'everyone',
      startsAt: null,
      endsAt: null,
      updatedAt: null,
      updatedBy: null,
    };
  }
  return {
    enabled: row.enabled === true,
    message: row.message || DEFAULT_MESSAGE,
    mode: VALID_MODES.includes(row.mode) ? row.mode : 'everyone',
    startsAt: row.starts_at ? new Date(row.starts_at).toISOString() : null,
    endsAt: row.ends_at ? new Date(row.ends_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    updatedBy: row.updated_by || null,
  };
}

/** True when maintenance is enabled and `now` is inside the optional window. */
function computeMaintenanceActive(settings, now = new Date()) {
  if (!settings || !settings.enabled) return false;
  const t = now.getTime();
  if (settings.startsAt) {
    const start = new Date(settings.startsAt).getTime();
    if (!Number.isNaN(start) && t < start) return false;
  }
  if (settings.endsAt) {
    const end = new Date(settings.endsAt).getTime();
    if (!Number.isNaN(end) && t > end) return false;
  }
  return true;
}

function parseOptionalDate(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${field} is not a valid date`);
    error.status = 400;
    throw error;
  }
  return date.toISOString();
}

/** Validate and normalise a settings payload before it reaches SQL. */
function normalizeMaintenancePayload(payload = {}) {
  const enabled = payload.enabled === true || payload.enabled === 'true';
  const message = String(payload.message ?? '').trim() || DEFAULT_MESSAGE;
  if (message.length > 2000) {
    const error = new Error('Maintenance message must be 2000 characters or fewer');
    error.status = 400;
    throw error;
  }
  const mode = String(payload.mode ?? 'everyone').trim();
  if (!VALID_MODES.includes(mode)) {
    const error = new Error(`mode must be one of: ${VALID_MODES.join(', ')}`);
    error.status = 400;
    throw error;
  }
  const startsAt = parseOptionalDate(payload.startsAt ?? payload.starts_at, 'startsAt');
  const endsAt = parseOptionalDate(payload.endsAt ?? payload.ends_at, 'endsAt');
  if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
    const error = new Error('endsAt must be after startsAt');
    error.status = 400;
    throw error;
  }
  return { enabled, message, mode, startsAt, endsAt };
}

function statusView(settings, now = new Date()) {
  return {
    enabled: settings.enabled,
    active: computeMaintenanceActive(settings, now),
    message: settings.message,
    mode: settings.mode,
    startsAt: settings.startsAt,
    endsAt: settings.endsAt,
    serverTime: now.toISOString(),
  };
}

async function fetchSettingsRow() {
  const result = await query('SELECT * FROM maintenance_settings WHERE id = 1');
  return result.rows[0] || null;
}

async function ensureMaintenanceTable() {
  await query(TABLE_DDL);
  await query('INSERT INTO maintenance_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
}

function invalidateMaintenanceCache() {
  cache = { value: null, expiresAt: 0 };
}

async function getMaintenanceSettings({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache.value && cache.expiresAt > now) return cache.value;

  let row;
  try {
    row = await fetchSettingsRow();
  } catch (error) {
    // Fresh/older databases may not have the table yet: create it once, retry.
    if (error.code === '42P01') {
      await ensureMaintenanceTable();
      row = await fetchSettingsRow();
    } else {
      throw error;
    }
  }

  const settings = normalizeRow(row);
  cache = { value: settings, expiresAt: now + CACHE_TTL_MS };
  return settings;
}

/** Fail-open state used by the request guard: DB errors never lock the site. */
async function getMaintenanceState(now = new Date()) {
  try {
    const settings = await getMaintenanceSettings();
    return statusView(settings, now);
  } catch (error) {
    console.warn('[maintenance] status lookup failed:', error.message);
    return statusView(normalizeRow(null), now);
  }
}

async function updateMaintenanceSettings(payload, updatedBy = null) {
  const settings = normalizeMaintenancePayload(payload);
  await ensureMaintenanceTable();
  const result = await query(
    `UPDATE maintenance_settings
     SET enabled = $1, message = $2, mode = $3, starts_at = $4, ends_at = $5,
         updated_at = NOW(), updated_by = $6
     WHERE id = 1
     RETURNING *`,
    [settings.enabled, settings.message, settings.mode, settings.startsAt, settings.endsAt, updatedBy]
  );
  invalidateMaintenanceCache();
  const saved = normalizeRow(result.rows[0]);
  cache = { value: saved, expiresAt: Date.now() + CACHE_TTL_MS };
  return saved;
}

module.exports = {
  DEFAULT_MESSAGE,
  VALID_MODES,
  computeMaintenanceActive,
  normalizeMaintenancePayload,
  normalizeRow,
  statusView,
  ensureMaintenanceTable,
  getMaintenanceSettings,
  getMaintenanceState,
  updateMaintenanceSettings,
  invalidateMaintenanceCache,
};
