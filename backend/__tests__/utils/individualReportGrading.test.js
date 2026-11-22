const { generateReportHTML } = require('../../utils/htmlReportRenderer');

/**
 * Forms I-IV must use the school's O-Level scale:
 * A = 85-100 | B = 70-84 | C = 50-69 | D = 40-49 | F = 0-39
 *
 * 55 is only the "low C" colour band used by the marks view and is NOT a
 * grade boundary. These tests guard the individual report (screen + PDF).
 */
describe('individual report O-Level grading (Forms I-IV)', () => {
  const buildReport = (form = 'FORM I') => ({
    form,
    term: 'Term I',
    year: 2026,
    student: { adm_no: '1001', first_name: 'Test', surname: 'Student' },
    months: ['February', 'March', 'April', 'May'],
    marks_config: { month_weights: { February: 100, March: 0, April: 0, May: 0 } },
    subjects: [
      { subject_code: 'BIO', subject_name: 'BIOLOGY' },
      { subject_code: 'HIS', subject_name: 'HISTORIA YA TANZANIA NA MAADILI' },
      { subject_code: 'PHY', subject_name: 'PHYSICS' },
      { subject_code: 'GEO', subject_name: 'GEOGRAPHY' },
      { subject_code: 'BST', subject_name: 'BUSINESS STUDIES' },
    ],
    monthly_results: [
      { subject_code: 'BIO', month: 'February', score: 64 },
      { subject_code: 'HIS', month: 'February', score: 51 },
      { subject_code: 'PHY', month: 'February', score: 52 },
      { subject_code: 'GEO', month: 'February', score: 84.6 },
      { subject_code: 'BST', month: 'February', score: 92 },
    ],
  });

  const rowFor = (html, subjectName) =>
    html.match(new RegExp(`<td class="subject-name">${subjectName}</td>[\\s\\S]*?</tr>`))?.[0] || '';

  it('grades 50-54 as C (not D)', async () => {
    const html = await generateReportHTML(buildReport());
    expect(rowFor(html, 'HISTORIA YA TANZANIA NA MAADILI')).toContain(
      '<td class="grade-col"><strong>C</strong></td>'
    );
    expect(rowFor(html, 'PHYSICS')).toContain('<td class="grade-col"><strong>C</strong></td>');
  });

  it('grades a displayed total of 85 as A (grade matches the JUMLA shown)', async () => {
    const html = await generateReportHTML(buildReport());
    const geographyRow = rowFor(html, 'GEOGRAPHY');
    expect(geographyRow).toContain('<td class="total-col"><strong>85</strong></td>');
    expect(geographyRow).toContain('<td class="grade-col"><strong>A</strong></td>');
  });

  it('keeps the other O-Level bands intact', async () => {
    const html = await generateReportHTML(buildReport());
    expect(rowFor(html, 'BIOLOGY')).toContain('<td class="grade-col"><strong>C</strong></td>');
    expect(rowFor(html, 'BUSINESS STUDIES')).toContain('<td class="grade-col"><strong>A</strong></td>');
  });

  it('shows decimal parts of configured assessment weights in the column headers', async () => {
    const report = buildReport();
    report.marks_config = {
      month_weights: { February: 20.5, March: 29.25, April: 0, May: 50.25 },
    };
    // Every month needs a score, otherwise its column (and weight header) is hidden.
    report.monthly_results = ['February', 'March', 'April', 'May'].flatMap((month) =>
      report.subjects.map((subject) => ({
        subject_code: subject.subject_code,
        month,
        score: 10,
      }))
    );
    const html = await generateReportHTML(report);
    expect(html).toContain('(20.5%)');
    expect(html).toContain('(29.25%)');
    expect(html).toContain('(50.25%)');
    expect(html).not.toContain('(21%)');
  });
});
