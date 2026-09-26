jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

const { query } = require('../../config/database');
const {
  getReportStudentLookupQuery,
  getStudentIndexListQuery,
  studentIndexForAdmNo,
  buildAdmNoToStudentIndexMap,
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

  it('filters the Form V photo index by term', () => {
    const { sql, params } = getStudentIndexListQuery(
      'FORM V',
      'HGE',
      2025,
      'First Term'
    );

    expect(sql).toContain('term = ANY($4::text[])');
    expect(params).toEqual([
      'FORM V',
      'HGE',
      2025,
      ['First Term', 'Term I', 'Term 1'],
    ]);
  });

  it('keeps the Form I photo index unscoped by term', () => {
    const { sql, params } = getStudentIndexListQuery(
      'FORM I',
      'A',
      2025,
      'First Term'
    );

    expect(sql).not.toContain('term =');
    expect(params).toEqual(['FORM I', 'A', 'NA', 2025]);
  });

  it('maps ordered term-specific rows to zero-based indexes', async () => {
    query.mockResolvedValueOnce({
      rows: [
        { adm_no: '1925' },
        { adm_no: '1929' },
      ],
    });

    const map = await buildAdmNoToStudentIndexMap(
      'FORM V',
      'HGE',
      2025,
      'Second Term'
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('term = ANY($4::text[])'),
      ['FORM V', 'HGE', 2025, ['Second Term', 'Term II', 'Term 2']]
    );
    expect(map).toEqual({ 1925: '0', 1929: '1' });
  });

  it('returns a term-specific index for the requested admission number', () => {
    const rows = [
      { adm_no: '1925', first_name: 'GRAYSON' },
      { adm_no: '1929', first_name: 'KENNEDY' },
    ];

    expect(studentIndexForAdmNo('1925', rows)).toBe('0');
    expect(studentIndexForAdmNo('1929', rows)).toBe('1');
  });
});
