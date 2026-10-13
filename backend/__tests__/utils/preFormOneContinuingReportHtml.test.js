const {
  generatePreFormOneContinuingReportHtml,
  buildPreFormOneContinuingBulkHtml,
  COURSE_ASSESSMENT_LABEL,
  CONTINUING_TERM,
  getContinuingReportMonth,
} = require('../../utils/preFormOneContinuingReportHtml');

jest.mock('../../utils/authoritySignature', () => ({
  getAuthoritySignatureImageUrl: () => null,
  getAuthoritySignatureText: () => '',
}));

const baseData = {
  student: {
    first_name: 'Juma',
    middle_name: 'Hassan',
    surname: 'Mwinyi',
    sex: 'Male',
    admission_number: 'PF-001',
    photo_path: null,
  },
  subjects: [
    { subject_code: 'MATH', subject_name: 'Mathematics', score: 88, grade: 'A', comment: 'Bora Sana', position: 1 },
    { subject_code: 'ENG', subject_name: 'English', score: 45, grade: 'D', comment: 'Dhaifu', position: 4 },
  ],
  summary: {
    total_marks: '133',
    average: '66.5',
    grade: 'C',
    division: 'II',
    division_point: 11,
    position: 3,
    total_students: 12,
  },
  comments: {},
  tabia_mwenendo: [],
  student_parish: 'KIA',
  student_fees_debt: null,
  class_fees_announcements: {},
  year: 2026,
  form: 'PRE-FORM ONE',
};

describe('generatePreFormOneContinuingReportHtml', () => {
  it('renders the O-Level report shell with a single course assessment column', async () => {
    const html = await generatePreFormOneContinuingReportHtml(baseData);
    expect(html).toContain('<html lang="sw">');
    expect(html).toContain('A. TAARIFA YA MAENDELEO YA MWANAFUNZI');
    expect(html).toContain('C. TABIA NA MWENENDO');
    expect(html).toContain('D. MAONI KATIKA TAALUMA');
    expect(html).toContain('MAMBO YA KUFAHAMU');
    expect(html).toContain(COURSE_ASSESSMENT_LABEL.sw);
    // Single assessment per subject — no four-month header row / weight config.
    expect(html).not.toContain('month_weights');
    expect(html).not.toContain('(13%)');
  });

  it('shows the PRE-FORM ONE class and the O-Level remarks/grade', async () => {
    const html = await generatePreFormOneContinuingReportHtml(baseData);
    expect(html).toContain('PRE-FORM ONE');
    expect(html).toContain('Bora Sana');
    expect(html).toContain('Dhaifu');
    expect(html).toContain('KIA');
  });

  it('always prints Term II and the generation-based month', async () => {
    const html = await generatePreFormOneContinuingReportHtml(baseData);
    // Term cell is always II for Pre-Form One (never a dash).
    expect(html).toContain(`<td>${CONTINUING_TERM}</td>`);
    // Month cell follows the generation rule (NOVEMBER in November, else DECEMBER).
    expect(html).toContain(`<td>${getContinuingReportMonth()}</td>`);
  });

  it('renders an English report when lang = en', async () => {
    const html = await generatePreFormOneContinuingReportHtml(baseData, { lang: 'en' });
    expect(html).toContain('<html lang="en">');
    expect(html).toContain(COURSE_ASSESSMENT_LABEL.en);
    expect(html).toContain('A. STUDENT PROGRESS INFORMATION');
  });

  it('defaults behaviour/mwenendo grades to C when no data is supplied', async () => {
    const html = await generatePreFormOneContinuingReportHtml(baseData);
    expect(html).toContain('Kufanya kazi kwa bidii');
    // 11 tabia criteria each default to C.
    expect((html.match(/<td>C<\/td>/g) || []).length).toBeGreaterThanOrEqual(11);
  });

  it('combines many reports into one document with page breaks', async () => {
    const html = await buildPreFormOneContinuingBulkHtml([baseData, baseData]);
    expect((html.match(/class="report-container"/g) || []).length).toBe(2);
    // First report starts on page 1; the next one is forced onto a fresh page.
    expect((html.match(/page-break-before: always;/g) || []).length).toBe(1);
    expect(html).toContain('<body class="bulk-pdf-document">');
    // Grid header CSS keeps the logo/photo on every report in a multi-page PDF.
    expect(html).toContain('.bulk-pdf-document .report-container .report-header');
    expect(html).toContain('display: grid !important');
  });

  it('renders Pre-Form One comments and tabia evaluations from the modules', async () => {
    const html = await generatePreFormOneContinuingReportHtml({
      ...baseData,
      comments: {
        taaluma: 'Amefanya vizuri katika masomo',
        sala: 'Anahudhuria sala kwa bidii',
        mkuu_shule: 'Hongera kwa juhudi',
        mwalimu_taaluma: 'Amefanya vizuri',
      },
      tabia_mwenendo: { '901': 'A', '902': 'B' },
    });
    expect(html).toContain('Amefanya vizuri katika masomo');
    expect(html).toContain('Anahudhuria sala kwa bidii');
    expect(html).toContain('Hongera kwa juhudi');
    // The 901 (Kufanya kazi kwa bidii) row must carry the supplied grade A.
    expect(html).toMatch(/901[\s\S]*?Kufanya kazi kwa bidii[\s\S]*?<td>A<\/td>/);
  });

  it('fills the missing student photo slot with the school logo', async () => {
    const html = await generatePreFormOneContinuingReportHtml({
      ...baseData,
      school_logo: { logo_image_path: 'uploads/logo/school.png' },
    });
    const photoBlock = html.match(/<div class="student-photo">([\s\S]*?)<\/div>/);
    expect(photoBlock).not.toBeNull();
    expect(photoBlock[1]).toMatch(/<img[^>]*class="school-logo"/);
    expect(photoBlock[1]).not.toContain('photo-placeholder');
  });

  it('shows the placeholder only when no school logo is configured', async () => {
    const html = await generatePreFormOneContinuingReportHtml({
      ...baseData,
      school_logo: null,
    });
    const photoBlock = html.match(/<div class="student-photo">([\s\S]*?)<\/div>/);
    expect(photoBlock).not.toBeNull();
    expect(photoBlock[1]).toContain('photo-placeholder');
  });
});

describe('getContinuingReportMonth', () => {
  it('prints NOVEMBER when generated in November', () => {
    expect(getContinuingReportMonth(new Date(2026, 10, 15))).toBe('NOVEMBER');
  });

  it('prints DECEMBER when generated in December', () => {
    expect(getContinuingReportMonth(new Date(2026, 11, 15))).toBe('DECEMBER');
  });

  it('defaults to DECEMBER outside November/December', () => {
    // January, June and October all fall back to the Term II exam month.
    expect(getContinuingReportMonth(new Date(2027, 0, 10))).toBe('DECEMBER');
    expect(getContinuingReportMonth(new Date(2026, 5, 10))).toBe('DECEMBER');
    expect(getContinuingReportMonth(new Date(2026, 9, 10))).toBe('DECEMBER');
  });
});
