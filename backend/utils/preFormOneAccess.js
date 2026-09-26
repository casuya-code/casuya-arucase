/**
 * Shared Pre-Form One access helpers.
 *
 * Pre-Form One data is cohort scoped: a non-admin user may only touch the years
 * and the subject allocations an administrator granted them through
 * users.permissions. These helpers are the single implementation used by the
 * student, score and promotion routes so every entry point enforces the same
 * rules.
 *
 *   permissions.preformone_module_years      -> allowed years (optional)
 *   permissions.preformone_score_subjects    -> { '<year>': ['interview:1', ...] }
 *
 * Admins and superadmins are unrestricted (null).
 */

const NOT_ALLOCATED_MESSAGE =
  'You are not allocated to this Pre-Form One subject for this year. Contact an administrator to assign subjects.';
const NO_YEAR_ACCESS_MESSAGE =
  'You do not have access to Pre-Form One data for this year. Contact an administrator.';

const VALID_SUBJECT_TYPES = new Set(['interview', 'continuing']);

function parsePermissions(user) {
  const raw = user && user.permissions;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw;
  return {};
}

function isPreFormOneAdmin(user) {
  const role = ((user && user.role) || '').toLowerCase();
  return role === 'admin' || role === 'superadmin';
}

function normalizeSubjectType(type) {
  if (type === undefined || type === null || type === '') return 'interview';
  const value = String(type).trim().toLowerCase();
  return VALID_SUBJECT_TYPES.has(value) ? value : null;
}

function getPreFormOneModuleYears(user) {
  if (isPreFormOneAdmin(user)) return null;
  const permissions = parsePermissions(user);
  const explicit = Array.isArray(permissions.preformone_module_years)
    ? permissions.preformone_module_years.map(Number)
    : [];
  const allocs = permissions.preformone_score_subjects;
  const scoreYears =
    allocs && typeof allocs === 'object'
      ? Object.keys(allocs).filter((y) => Array.isArray(allocs[y]) && allocs[y].length > 0).map(Number)
      : [];
  const union = [...new Set([...explicit, ...scoreYears])];
  return union.length ? union : null;
}

function userHasPreFormOneYearAccess(user, year) {
  const allowedYears = getPreFormOneModuleYears(user);
  if (allowedYears === null) return true;
  return allowedYears.includes(parseInt(year, 10));
}

/**
 * Allocation keys for a year: { '2026': ['interview:1', 'continuing:3'] }.
 * null means unrestricted (admin).
 */
function getPreFormOneAllocatedKeys(user, year) {
  if (isPreFormOneAdmin(user)) return null;
  const permissions = parsePermissions(user);
  const allocations = permissions.preformone_score_subjects;
  if (!allocations || typeof allocations !== 'object') return [];
  const list = allocations[String(year)];
  return Array.isArray(list) ? list : [];
}

function isUserAllocatedToPreFormOneSubject(user, year, subjectId, subjectType) {
  const keys = getPreFormOneAllocatedKeys(user, year);
  if (keys === null) return true;
  return keys.includes(`${subjectType}:${String(subjectId)}`);
}

function hasAnyPreFormOneAllocation(user, year) {
  if (isPreFormOneAdmin(user)) return true;
  return getPreFormOneAllocatedKeys(user, year).length > 0;
}

module.exports = {
  NOT_ALLOCATED_MESSAGE,
  NO_YEAR_ACCESS_MESSAGE,
  parsePermissions,
  isPreFormOneAdmin,
  normalizeSubjectType,
  getPreFormOneModuleYears,
  userHasPreFormOneYearAccess,
  getPreFormOneAllocatedKeys,
  isUserAllocatedToPreFormOneSubject,
  hasAnyPreFormOneAllocation,
};
