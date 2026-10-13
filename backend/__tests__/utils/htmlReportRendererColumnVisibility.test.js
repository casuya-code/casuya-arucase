const {
  generateReportHTML,
  buildMonthlyDataMap,
  computeMonthColumnAvailability,
} = require('../../utils/htmlReportRenderer');

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
  monthly_results: [
    { subject_code: 'ENG', month: 'February', score: 80 },
    { subject_code: 'ENG', month: 'April', score: 82 },
  ],
  comments: [],
  tabia_mwenendo: [],
  subject_rankings: { ENG: { 1824: '3' } },
  subject_teacher_signatures: {},
  overall_rank: 3,
  total_students: 40,
  marks_config: { month_weights: { February: 50, March: 0, April: 50, May: 0 } },
  months: ['February', 'March', 'April', 'May'],
  summary_data: {
    total_marks: '162',
    average: '81',
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

const render = (overrides = {}) =>
  generateReportHTML({ ...baseReportData, ...overrides }, 'http://localhost:5000');

const countMatches = (html, re) => (html.match(re) || []).length;

describe('computeMonthColumnAvailability', () => {
  it('flags only the months that have a recorded score', () => {
    const monthlyData = buildMonthlyDataMap(baseReportData.monthly_results);
    expect(
      computeMonthColumnAvailability(baseReportData.months, baseReportData.subjects, monthlyData)
    ).toEqual([true, false, true, false]);
  });

  it('matches scores stored under the subject abbreviation', () => {
    const monthlyData = buildMonthlyDataMap([{ subject_code: 'ENG', month: 'March', score: 55 }]);
    expect(
      computeMonthColumnAvailability(baseReportData.months, baseReportData.subjects, monthlyData)
    ).toEqual([false, true, false, false]);
  });
});

describe('generateReportHTML hidden assessment columns', () => {
  it('drops an assessment column that has no results', async () => {
    const html = await render();
    expect(html).toContain('<th colspan="2">');
    expect(countMatches(html, /class="month-header/g)).toBe(2);
    expect(countMatches(html, /class="month-cell"/g)).toBe(2);
    // March (Robo) and May (Nusu) columns are gone from the table body/header.
    expect(html).not.toContain('>Robo<');
    expect(html).not.toContain('>Nusu<');
    // The remaining columns keep their labels.
    expect(html).toContain('>Jrb1<');
    expect(html).toContain('>Jrb2<');
  });

  it('keeps all four columns when every column is empty', async () => {
    const html = await render({ monthly_results: [] });
    expect(html).toContain('<th colspan="4">');
    expect(countMatches(html, /class="month-header/g)).toBe(4);
  });

  it('honours a class-wide availability override (bulk column_availability)', async () => {
    const html = await render({
      monthly_results: [{ subject_code: 'ENG', month: 'February', score: 80 }],
      column_availability: [true, false, true, false],
    });
    expect(html).toContain('<th colspan="2">');
    expect(countMatches(html, /class="month-header/g)).toBe(2);
    expect(countMatches(html, /class="month-cell"/g)).toBe(2);
  });

  it('never hides all four columns even if the override is all false', async () => {
    const html = await render({ column_availability: [false, false, false, false] });
    expect(html).toContain('<th colspan="4">');
    expect(countMatches(html, /class="month-header/g)).toBe(4);
  });
});
