const {
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
} = require('../../utils/preFormOneAccess');

const admin = { role: 'superadmin', permissions: null };
const teacher = {
  role: 'teacher',
  permissions: {
    preformone_score_subjects: { 2026: ['interview:1', 'continuing:3'] },
  },
};

describe('preFormOneAccess', () => {
  describe('parsePermissions', () => {
    it('parses string, object and missing permissions', () => {
      expect(parsePermissions({ permissions: '{"a":1}' })).toEqual({ a: 1 });
      expect(parsePermissions({ permissions: { a: 1 } })).toEqual({ a: 1 });
      expect(parsePermissions({ permissions: 'not json' })).toEqual({});
      expect(parsePermissions({})).toEqual({});
      expect(parsePermissions(null)).toEqual({});
    });
  });

  describe('isPreFormOneAdmin', () => {
    it('recognizes admin and superadmin case-insensitively', () => {
      expect(isPreFormOneAdmin({ role: 'admin' })).toBe(true);
      expect(isPreFormOneAdmin({ role: 'SUPERADMIN' })).toBe(true);
      expect(isPreFormOneAdmin({ role: 'teacher' })).toBe(false);
      expect(isPreFormOneAdmin(null)).toBe(false);
    });
  });

  describe('normalizeSubjectType', () => {
    it('defaults blank values to interview', () => {
      expect(normalizeSubjectType(undefined)).toBe('interview');
      expect(normalizeSubjectType('')).toBe('interview');
      expect(normalizeSubjectType(null)).toBe('interview');
    });

    it('normalizes known types', () => {
      expect(normalizeSubjectType('INTERVIEW')).toBe('interview');
      expect(normalizeSubjectType(' Continuing ')).toBe('continuing');
    });

    it('rejects unknown types', () => {
      expect(normalizeSubjectType('other')).toBeNull();
      expect(normalizeSubjectType('interviews')).toBeNull();
    });
  });

  describe('getPreFormOneModuleYears', () => {
    it('is unrestricted for admins', () => {
      expect(getPreFormOneModuleYears(admin)).toBeNull();
    });

    it('unions explicit years with score allocation years', () => {
      const user = {
        role: 'teacher',
        permissions: {
          preformone_module_years: [2026],
          preformone_score_subjects: { 2027: ['interview:1'], 2028: [] },
        },
      };
      expect(getPreFormOneModuleYears(user).sort()).toEqual([2026, 2027]);
    });

    it('falls back to unrestricted when nothing is granted', () => {
      expect(getPreFormOneModuleYears({ role: 'teacher', permissions: {} })).toBeNull();
    });

    it('returns an empty grant list as unrestricted-free', () => {
      const user = { role: 'teacher', permissions: { preformone_score_subjects: { 2026: [] } } };
      expect(getPreFormOneModuleYears(user)).toBeNull();
    });
  });

  describe('userHasPreFormOneYearAccess', () => {
    it('allows admins any year', () => {
      expect(userHasPreFormOneYearAccess(admin, 1999)).toBe(true);
    });

    it('blocks years outside the grant', () => {
      expect(userHasPreFormOneYearAccess(teacher, 2026)).toBe(true);
      expect(userHasPreFormOneYearAccess(teacher, 2025)).toBe(false);
    });
  });

  describe('subject allocations', () => {
    it('returns null keys for admins', () => {
      expect(getPreFormOneAllocatedKeys(admin, 2026)).toBeNull();
      expect(isUserAllocatedToPreFormOneSubject(admin, 2026, 99, 'interview')).toBe(true);
      expect(hasAnyPreFormOneAllocation(admin, 2026)).toBe(true);
    });

    it('matches the exact type:id key', () => {
      expect(isUserAllocatedToPreFormOneSubject(teacher, 2026, 1, 'interview')).toBe(true);
      expect(isUserAllocatedToPreFormOneSubject(teacher, 2026, 1, 'continuing')).toBe(false);
      expect(isUserAllocatedToPreFormOneSubject(teacher, 2026, 3, 'interview')).toBe(false);
    });

    it('does not leak allocations across years', () => {
      expect(getPreFormOneAllocatedKeys(teacher, 2025)).toEqual([]);
      expect(isUserAllocatedToPreFormOneSubject(teacher, 2025, 1, 'interview')).toBe(false);
      expect(hasAnyPreFormOneAllocation(teacher, 2025)).toBe(false);
    });

    it('returns an empty list when permissions are missing', () => {
      const user = { role: 'teacher' };
      expect(getPreFormOneAllocatedKeys(user, 2026)).toEqual([]);
      expect(isUserAllocatedToPreFormOneSubject(user, 2026, 1, 'interview')).toBe(false);
    });

    it('ignores malformed allocation payloads', () => {
      const user = { role: 'teacher', permissions: { preformone_score_subjects: 'nope' } };
      expect(getPreFormOneAllocatedKeys(user, 2026)).toEqual([]);
      const user2 = { role: 'teacher', permissions: { preformone_score_subjects: { 2026: 'a' } } };
      expect(getPreFormOneAllocatedKeys(user2, 2026)).toEqual([]);
    });
  });

  describe('messages', () => {
    it('exposes stable user-facing messages', () => {
      expect(NOT_ALLOCATED_MESSAGE).toMatch(/not allocated/i);
      expect(NO_YEAR_ACCESS_MESSAGE).toMatch(/do not have access/i);
    });
  });
});
