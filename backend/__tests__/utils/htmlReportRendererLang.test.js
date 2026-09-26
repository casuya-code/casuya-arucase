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
  },
  subjects: [
    { id: 1, subject_code: 'ENG', subject_abbreviation: 'ENG', subject_name: 'English' },
  ],
  monthly_results: [
    { subject_code: 'ENG', month: 'February', score: 80 },
    { subject_code: 'ENG', month: 'March', score: 78 },
    { subject_code: 'ENG', month: 'April', score: 82 },
    { subject_code: 'ENG', month: 'May', score: 80 },
  ],
  comments: [
    { comment_type: 'taaluma', comment_text: 'Hardworking' },
    { comment_type: 'tabia', comment_text: 'Respectful' },
  ],
  tabia_mwenendo: [{ criterion: '901', evaluation: 'A' }],
  subject_rankings: { ENG: { 1824: '3' } },
  subject_teacher_signatures: { ENG: 'Mr. Otieno' },
  overall_rank: 3,
  total_students: 40,
  marks_config: { month_weights: { February: 13, March: 25, April: 13, May: 49 } },
  months: ['February', 'March', 'April', 'May'],
  summary_data: {
    total_marks: '320',
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

const render = (overrides = {}, apiUrl = 'http://localhost:5000') =>
  generateReportHTML({ ...baseReportData, ...overrides }, apiUrl);

describe('generateReportHTML language support', () => {
  it('defaults to Swahili so the existing report is unchanged', async () => {
    const html = await render();
    expect(html).toContain('A. TAARIFA YA MAENDELEO YA MWANAFUNZI');
    expect(html).toContain('JINA KAMILI');
    expect(html).toContain('Kufanya kazi kwa bidii');
    expect(html).toContain('Bora Sana');
    expect(html).toContain('<html lang="sw">');
  });

  it('renders the English report when lang = en', async () => {
    const html = await generateReportHTML(baseReportData, 'http://localhost:5000', 'en');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('A. STUDENT PROGRESS INFORMATION');
    expect(html).toContain('FULL NAME');
    expect(html).toContain('Diligent in work');
    expect(html).toContain('Very Good');
    expect(html).toContain('SUBJECT');
    expect(html).toContain('TOTAL MARKS IN ALL SUBJECTS:');
    expect(html).toContain('ACADEMIC SUMMARY');
    expect(html).toContain('BEHAVIOUR AND CONDUCT');
    expect(html).toContain('COMMENTS ON STUDIES');
    expect(html).toContain("HEAD TEACHER'S SIGNATURE:");
    expect(html).toContain('THINGS TO NOTE');
  });

  it('reads lang from the report data object as well as the argument', async () => {
    const html = await render({ lang: 'en' });
    expect(html).toContain('A. STUDENT PROGRESS INFORMATION');
  });

  it('falls back to Swahili for an unsupported lang', async () => {
    const html = await generateReportHTML(baseReportData, 'http://localhost:5000', 'fr');
    expect(html).toContain('A. TAARIFA YA MAENDELEO YA MWANAFUNZI');
  });

  it('keeps the codes, abbreviations and numbers identical across languages', async () => {
    const sw = await render();
    const en = await generateReportHTML(baseReportData, 'http://localhost:5000', 'en');

    // Trait codes 901-911, same order, same position
    for (const code of ['901', '902', '903', '904', '905', '906', '907', '908', '909', '910', '911']) {
      expect(sw).toContain(`<td>${code}</td>`);
      expect(en).toContain(`<td>${code}</td>`);
    }

    // Shared month abbreviations stay in the KEY line in both languages
    for (const abbr of ['Jrb1', 'Robo', 'Jrb2', 'Nusu', 'Muh']) {
      expect(sw).toContain(abbr);
      expect(en).toContain(abbr);
    }

    // Scores, grade letters, rank and totals are untouched by translation
    for (const value of ['>320<', '>B<', '>II<', '>3<', '>40<', '>80<']) {
      expect(sw).toContain(value);
      expect(en).toContain(value);
    }

    // Both languages keep the supplied grade boundaries
    expect(sw).toContain('A = 85 – 100');
    expect(en).toContain('A = 85 – 100');
    expect(sw).toContain('C = 50 – 69');
    expect(en).toContain('C = 50 – 69');
  });

  it('translates the KEY line and the no-announcements notice', async () => {
    const en = await generateReportHTML(baseReportData, 'http://localhost:5000', 'en');
    expect(en).toContain('Jrb1 = Test 1, Robo = Mid-term');
    expect(en).toContain('No class fee announcements have been set for this class.');

    const sw = await render();
    expect(sw).toContain('Jrb1 = Jaribio 1, Robo = Robo Muhula');
    expect(sw).toContain('Hakuna matangazo ya ada yaliyowekwa kwa darasa hili.');
  });

  it('preserves the A-Level grade comment wording in both languages', async () => {
    const formV = { form: 'FORM V' };
    const sw = await render(formV);
    const en = await generateReportHTML({ ...baseReportData, ...formV }, 'http://localhost:5000', 'en');

    expect(sw).toContain('E = 45+');
    expect(en).toContain('E = 45+');
    expect(en).toContain('CONDUCT:');
    // The printed Form V/VI legend wording is unchanged from the original PDF.
    expect(sw).toContain('E = 45+, Dhaifu sana');
  });

  it('leaves the O-Level report identical in both languages apart from wording', async () => {
    // FORM II (the route this feature was requested for) uses the O-Level scale,
    // where the legend and grade comments are the only translated parts.
    const sw = await render();
    const en = await generateReportHTML(baseReportData, 'http://localhost:5000', 'en');
    expect(sw).toContain('A = 85 – 100');
    expect(en).toContain('A = 85 – 100');
    expect(sw).not.toContain('E = 45+');
    expect(en).not.toContain('E = 45+');
  });

  it('keeps user-entered comments in the teacher language, not the report language', async () => {
    const en = await generateReportHTML(baseReportData, 'http://localhost:5000', 'en');
    expect(en).toContain('Hardworking');
    expect(en).toContain('Respectful');
    expect(en).toContain('Mr. Otieno');
  });

  it('translates the comment section labels without touching the parish value', async () => {
    const en = await generateReportHTML(baseReportData, 'http://localhost:5000', 'en');
    expect(en).toContain('Subject Teacher:');
    expect(en).toContain("Head Teacher's Comments:");
    expect(en).toContain('STUDIES:');
    expect(en).toContain('SERVICE:');
    expect(en).toContain('SPORTS:');
    expect(en).toContain('CONDUCT:');
    expect(en).toContain('HEALTH:');
    expect(en).toContain('FEES DUE:');
    expect(en).toContain('PARISH');
    expect(en).toContain('Arusha');
  });
});
