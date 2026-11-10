jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

const {
  getReportStudentLookupQuery,
} = require('../../utils/reportStudentExtras');

describe('report student term queries', () => {
  it('filters Form V Term I student lookup by all term labels', () => {
    const { sql, params } = getReportStudentLookupQuery({
      admNo: '1925',
      form: 'FORM V',
      stream: 'HGE',
      normalizedStream: 'HGE',
      yearNum: 2025,
      normalizedTerm: 'First Term',
    });

    expect(sql).toContain('term = ANY($5::text[])');
    expect(params).toEqual([
      '1925',
      'FORM V',
      'HGE',
      2025,
      ['First Term', 'Term I', 'Term 1'],
    ]);
  });

  it('filters Form V Term II student lookup by all term labels', () => {
    const { sql, params } = getReportStudentLookupQuery({
      admNo: '1925',
      form: 'FORM V',
      stream: 'HGE',
      normalizedStream: 'HGE',
      yearNum: 2025,
      normalizedTerm: 'Second Term',
    });

    expect(sql).toContain('term = ANY($5::text[])');
    expect(params).toEqual([
      '1925',
      'FORM V',
      'HGE',
      2025,
      ['Second Term', 'Term II', 'Term 2'],
    ]);
  });

  it('keeps Form I lookup unscoped by term and compatible with both streams', () => {
    const { sql, params, uniqueStreams } = getReportStudentLookupQuery({
      admNo: '100',
      form: 'FORM I',
      stream: 'NA',
      normalizedStream: 'A',
      yearNum: 2025,
      normalizedTerm: 'First Term',
    });

    expect(sql).not.toContain('term =');
    expect(uniqueStreams).toEqual(['A', 'NA']);
    expect(params).toEqual(['100', 'FORM I', 'A', 'NA', 2025]);
  });
});
