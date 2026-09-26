const {
  MAX_SUBJECT_TEACHER_ROWS,
  buildSubjectTeacherCsv,
  parseSubjectTeacherCsv,
  validateSubjectTeacherRows,
} = require('../../utils/subjectTeacherCsv');

const subjects = [
  {
    subject_code: '0181',
    subject_name: 'Mathematics, Advanced',
    subject_abbreviation: 'MATH',
  },
  {
    subject_code: 'ENG',
    subject_name: 'English',
    subject_abbreviation: 'ENG',
  },
];

describe('subject teacher CSV', () => {
  it('builds a UTF-8 template with current assignments and CSV escaping', () => {
    const csv = buildSubjectTeacherCsv(subjects, {
      '0181': {
        teacher_name: 'Doe, Jane',
        teacher_signature: '=SIGN',
      },
    });

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('Subject Code,Subject Name,Teacher Name,Teacher Signature');
    expect(csv).toContain('0181,"Mathematics, Advanced","Doe, Jane",\'=SIGN');
    expect(csv).toContain('ENG,English,,');
  });

  it('parses headers, quoted commas, escaped quotes, and Excel-safe values', () => {
    const rows = parseSubjectTeacherCsv(
      '\uFEFFSubject Code,Subject Name,Teacher Name,Teacher Signature\r\n' +
      '0181,"Mathematics, Advanced","Jane ""JJ"" Doe",\'=SIGN\r\n'
    );

    expect(rows).toEqual([
      {
        row: 2,
        subjectCode: '0181',
        subjectName: 'Mathematics, Advanced',
        teacherName: 'Jane "JJ" Doe',
        teacherSignature: '=SIGN',
      },
    ]);
  });

  it('rejects missing required headers and malformed quoted fields', () => {
    expect(() => parseSubjectTeacherCsv('Subject,Name\nMath,John'))
      .toThrow('Subject Code and Teacher Name');
    expect(() => parseSubjectTeacherCsv('Subject Code,Teacher Name\n0181,"Jane'))
      .toThrow('unclosed quoted field');
  });

  it('enforces the data-row limit', () => {
    const header = 'Subject Code,Teacher Name\n';
    const rows = Array.from(
      { length: MAX_SUBJECT_TEACHER_ROWS + 1 },
      () => '0181,Jane Doe'
    ).join('\n');

    expect(() => parseSubjectTeacherCsv(header + rows))
      .toThrow(`more than ${MAX_SUBJECT_TEACHER_ROWS} data rows`);
  });

  it('maps numeric subject codes to abbreviations and skips blank teacher rows', () => {
    const rows = parseSubjectTeacherCsv(
      'Subject Code,Teacher Name\n' +
      '0181,Jane Doe\n' +
      'ENG,,'
    );
    const result = validateSubjectTeacherRows(rows, subjects);

    expect(result.errors).toEqual([]);
    expect(result.skipped).toBe(1);
    expect(result.assignments).toEqual([
      expect.objectContaining({
        row: 2,
        subjectCode: 'MATH',
        subjectCodes: ['0181', 'MATH'],
        teacherName: 'Jane Doe',
        teacherSignature: null,
      }),
    ]);
  });

  it('rejects unknown subjects, duplicates, and invalid long values', () => {
    const rows = parseSubjectTeacherCsv(
      'Subject Code,Teacher Name,Teacher Signature\n' +
      'BAD,Unknown Teacher,\n' +
      'ENG,First Teacher,\n' +
      'eng,Second Teacher,\n' +
      `ENG,${'T'.repeat(256)},${'S'.repeat(256)}`
    );
    const result = validateSubjectTeacherRows(rows, subjects);

    expect(result.assignments).toHaveLength(1);
    expect(result.errors).toEqual([
      expect.objectContaining({ row: 2, error: 'Subject does not belong to this class' }),
      expect.objectContaining({ row: 4, error: 'Subject appears more than once in the CSV' }),
      expect.objectContaining({ row: 5, error: 'Teacher Name cannot exceed 255 characters' }),
      expect.objectContaining({ row: 5, error: 'Teacher Signature cannot exceed 255 characters' }),
    ]);
  });
});
