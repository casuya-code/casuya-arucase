const {
  sortByAdmNo,
  getTermFromMonth,
  buildRoster,
  admNoForIndex,
} = require('../../utils/monthlyResultsBackfill');

describe('monthlyResultsBackfill', () => {
  it('sorts students by adm_no', () => {
    const students = [{ adm_no: 'B' }, { adm_no: 'A' }, { adm_no: 'C' }];
    expect(sortByAdmNo(students).map((s) => s.adm_no)).toEqual(['A', 'B', 'C']);
  });

  it('sorts lexicographically like Postgres ORDER BY adm_no (not numerically)', () => {
    // '11754' < '1711' in Postgres; numeric sorting would put '1711' first.
    const students = [{ adm_no: '1711' }, { adm_no: '11754' }, { adm_no: '2026510' }, { adm_no: '202656' }];
    expect(sortByAdmNo(students).map((s) => s.adm_no)).toEqual(['11754', '1711', '2026510', '202656']);
  });

  it('derives term from month for Form V/VI', () => {
    expect(getTermFromMonth('August', 'FORM V')).toBe('First Term');
    expect(getTermFromMonth('May', 'FORM V')).toBe('Second Term');
    expect(getTermFromMonth('February', 'FORM I')).toBe('First Term');
  });

  it('builds Form I-IV roster from A+NA streams sorted by adm_no', () => {
    const students = [
      { adm_no: '2', stream: 'NA' },
      { adm_no: '1', stream: 'A' },
      { adm_no: '3', stream: 'B' },
    ];
    const { roster } = buildRoster(students, 'FORM I', 'A', 'March', false);
    expect(roster.map((s) => s.adm_no)).toEqual(['1', '2']);
  });

  it('builds Form V/VI roster filtered by term and promoted status', () => {
    const students = [
      { adm_no: '1', stream: 'HGE', term: 'First Term', status: 'PENDING' },
      { adm_no: '2', stream: 'HGE', term: 'Second Term', status: 'PENDING' },
      { adm_no: '3', stream: 'HGE', term: 'First Term', status: 'PROMOTED' },
    ];
    const { roster, term } = buildRoster(students, 'FORM V', 'HGE', 'August', true);
    expect(term).toBe('First Term');
    expect(roster.map((s) => s.adm_no)).toEqual(['1']);
  });

  it('filters stream-specific monthly rosters (not ALL)', () => {
    const students = [
      { adm_no: '1', stream: 'HGE', term: 'First Term', status: 'PENDING' },
      { adm_no: '2', stream: 'PCM', term: 'First Term', status: 'PENDING' },
      { adm_no: '3', stream: 'HGE', term: 'First Term', status: 'PENDING' },
    ];
    const { roster } = buildRoster(students, 'FORM V', 'PCM', 'August', true);
    expect(roster.map((s) => s.adm_no)).toEqual(['2']);
  });

  it('keeps every stream for monthly ALL rows', () => {
    const students = [
      { adm_no: '1', stream: 'HGE', term: 'First Term', status: 'PENDING' },
      { adm_no: '2', stream: 'PCM', term: 'First Term', status: 'PENDING' },
    ];
    const { roster } = buildRoster(students, 'FORM V', 'ALL', 'August', true);
    expect(roster.map((s) => s.adm_no)).toEqual(['1', '2']);
  });

  it('maps in-range index to adm_no', () => {
    const roster = [{ adm_no: 'X' }, { adm_no: 'Y' }];
    expect(admNoForIndex(roster, '1')).toBe('Y');
  });

  it('returns null for out-of-range index', () => {
    const roster = [{ adm_no: 'X' }];
    expect(admNoForIndex(roster, '5')).toBeNull();
    expect(admNoForIndex(roster, 'abc')).toBeNull();
  });
});
