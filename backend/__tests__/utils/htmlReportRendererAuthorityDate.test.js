const { generateReportHTML } = require('../../utils/htmlReportRenderer');

jest.mock('../../utils/authoritySignature', () => ({
  getAuthoritySignatureImageUrl: () => null,
  getAuthoritySignatureText: () => '',
}));

const baseReportData = {
  student: {
    first_name: 'Amina',
    middle_name: '',
    surname: 'Juma',
    sex: 'F',
    photo_path: null,
    adm_no: '1824',
  },
  subjects: [
    { id: 1, subject_code: 'ENG', subject_abbreviation: 'ENG', subject_name: 'English' },
  ],
  monthly_results: [{ subject_code: 'ENG', month: 'February', score: 80 }],
  comments: [],
  tabia_mwenendo: [],
  subject_rankings: { ENG: { 1824: '3' } },
  subject_teacher_signatures: {},
  overall_rank: 3,
  total_students: 40,
  marks_config: { month_weights: { February: 100, March: 0, April: 0, May: 0 } },
  months: ['February', 'March', 'April', 'May'],
  summary_data: {
    total_marks: '80',
    average: '80',
    grade: 'B',
    division: 'II',
    division_point: '2',
    position: '3',
    total_students: '40',
  },
  student_parish: 'Arusha',
  student_fees_debt: '0.00',
  class_fees_announcements: {},
  form: 'FORM II',
  term: 'Term I',
  year: 2026,
};

const render = (authorityData) =>
  generateReportHTML({ ...baseReportData, authority_data: authorityData }, 'http://localhost:5000');

const countMatches = (html, re) => (html.match(re) || []).length;

// The authorization date is printed in two places (the header table and the
// signature block) and the individual report, the bulk report and the
// downloaded PDFs all render through this same function, so these assertions
// cover every copy of the report.
describe('generateReportHTML authorization date', () => {
  it('prints a DD.MM.YYYY date day first instead of swapping day and month', async () => {
    const html = await render({ name: 'Fr. Moses Assey', title: 'Rector', date: '02.05.2025' });

    expect(html).toContain('<td class="authority-date">02.05.2025</td>');
    expect(html).toContain('02.05.2025');
    // The old `new Date('02.05.2025')` path rendered 5 February as 05/02/2025.
    expect(html).not.toContain('05/02/2025');
    expect(countMatches(html, /02\.05\.2025/g)).toBe(2);
  });

  it('prints a DD/MM/YYYY date exactly as saved', async () => {
    const html = await render({ name: 'Fr. Moses Assey', title: 'Rector', date: '02/05/2026' });

    expect(html).toContain('<td class="authority-date">02/05/2026</td>');
    expect(html).not.toContain('05/02/2026');
  });

  it('zero-pads a date typed with single digit day and month', async () => {
    const html = await render({ name: 'Fr. Moses Assey', title: 'Rector', date: '2.5.2026' });

    expect(html).toContain('<td class="authority-date">02.05.2026</td>');
  });

  it('converts a legacy YYYY-MM-DD value to DD/MM/YYYY', async () => {
    const html = await render({ name: 'Fr. Moses Assey', title: 'Rector', date: '2025-05-02' });

    expect(html).toContain('<td class="authority-date">02/05/2025</td>');
    // No timezone shift: the ISO value must not leak through as 01/05/2025.
    expect(html).not.toContain('01/05/2025');
  });

  it('falls back to today when the admin saved no date', async () => {
    const html = await render({ name: 'Fr. Moses Assey', title: 'Rector', date: '' });
    const today = new Date();
    const expected = [
      String(today.getDate()).padStart(2, '0'),
      String(today.getMonth() + 1).padStart(2, '0'),
      today.getFullYear(),
    ].join('/');

    expect(html).toContain(`<td class="authority-date">${expected}</td>`);
  });

  it('keeps the same date in the header table and the signature block', async () => {
    const html = await render({ name: 'Fr. Moses Assey', title: 'Rector', date: '02.05.2025' });

    expect(html).toContain('<td class="authority-date">02.05.2025</td>');
    expect(html).toMatch(/class="signature-date">[^<]*02\.05\.2025/);
  });
});
