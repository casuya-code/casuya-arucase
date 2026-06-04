/**
 * Individual Pre-Form One Interview Report PDF
 */
const {
  buildLogoBlockHtml,
  renderHtmlToPdfBuffer,
} = require('./preFormOneInterviewResultsPdf');

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getGrade(score) {
  const num = Number(score);
  if (!Number.isFinite(num)) return '-';
  if (num >= 80) return 'A';
  if (num >= 70) return 'B';
  if (num >= 55) return 'C';
  if (num >= 45) return 'D';
  return 'F';
}

function formatScore(value) {
  if (value === undefined || value === null || value === '') return '-';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
  return String(num);
}

function scoreForSubject(scores, subjectCode) {
  if (!scores || subjectCode == null) return undefined;
  const code = String(subjectCode).trim();
  if (scores[code] !== undefined) return scores[code];
  const upper = code.toUpperCase();
  if (scores[upper] !== undefined) return scores[upper];
  return scores[code.toLowerCase()];
}

/**
 * Build HTML for a single student's interview report.
 */
const REPORT_LABELS = {
  interview: 'INTERVIEW',
  continuing: 'CONTINUING',
};

function buildIndividualInterviewReportHtml(
  student,
  result,
  subjects,
  scores,
  year,
  logoUrl,
  reportKind = 'interview'
) {
  const label = REPORT_LABELS[reportKind] || REPORT_LABELS.interview;
  const logoBlock = buildLogoBlockHtml(logoUrl);
  const subjectRows = (subjects || [])
    .map((subject) => {
      const raw = scoreForSubject(scores, subject.subject_code);
      const score = formatScore(raw);
      const grade = score !== '-' ? getGrade(raw) : '-';
      return `
        <tr>
          <td>${escapeHtml(subject.subject_code)}</td>
          <td>${escapeHtml(score)}</td>
          <td>${escapeHtml(grade)}</td>
        </tr>`;
    })
    .join('');

  const studentName = [student.first_name, student.middle_name, student.surname]
    .filter(Boolean)
    .join(' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Pre-Form One ${label} Report ${escapeHtml(year)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 20px;
      font-size: 12px;
      color: #111827;
      line-height: 1.5;
    }
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border: 1px solid #e5e7eb;
      margin-bottom: 16px;
    }
    .logo-section { flex: 0 0 80px; text-align: center; }
    .school-logo { width: 72px; height: 72px; object-fit: contain; }
    .school-logo-placeholder {
      width: 72px; height: 72px; background: #f3f4f6; border: 1px solid #e5e7eb;
    }
    .school-info { flex: 1; text-align: center; padding: 0 8px; }
    .school-info h1 { margin: 0 0 4px; font-size: 14px; font-weight: 700; }
    .school-info h2 { margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #374151; }
    .contact-info p { margin: 2px 0; font-size: 10px; color: #6b7280; }
    .report-title {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #374151;
    }
    .summary-section {
      margin-bottom: 16px;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    .summary-row-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 10px;
    }
    .summary-row-table td {
      padding: 4px 6px;
      vertical-align: top;
      white-space: nowrap;
    }
    .results-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .results-table th,
    .results-table td {
      border: 1px solid #e5e7eb;
      padding: 8px;
      text-align: left;
    }
    .results-table th {
      background: #f3f4f6;
      font-weight: 600;
    }
    .signature-section {
      margin-top: 32px;
    }
    .signature-section p { margin: 8px 0; }
    .signature-footer-table {
      width: auto;
      margin-left: auto;
      margin-top: 12px;
    }
    .signature-footer-table td {
      text-align: right;
      padding-left: 24px;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="logo-section">${logoBlock}</div>
    <div class="school-info">
      <h1>CATHOLIC ARCHDIOCESE OF ARUSHA</h1>
      <h2>ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU</h2>
      <div class="contact-info">
        <p>P.O BOX 3102 Arusha, Tanzania</p>
        <p>+255 754 92 60 22 / +255 765 394 802</p>
        <p>Email: arucase@gmail.com</p>
      </div>
    </div>
    <div class="logo-section">${logoBlock}</div>
  </div>

  <div class="report-title">PRE-FORM ONE ${label} REPORT ${escapeHtml(year)}</div>

  <div class="summary-section">
    <table class="summary-row-table">
      <tr>
        <td><strong>Student Name:</strong> ${escapeHtml(studentName)}</td>
        <td><strong>Admission Number:</strong> ${escapeHtml(student.admission_number)}</td>
        <td><strong>Parish:</strong> ${escapeHtml(student.parish || 'N/A')}</td>
        <td><strong>Sex:</strong> ${escapeHtml(student.sex || 'N/A')}</td>
      </tr>
    </table>
  </div>

  <table class="results-table">
    <thead>
      <tr>
        <th>Subject</th>
        <th>Score</th>
        <th>Grade</th>
      </tr>
    </thead>
    <tbody>${subjectRows}</tbody>
  </table>

  <div class="summary-section">
    <table class="summary-row-table">
      <tr>
        <td><strong>Total Score:</strong> ${escapeHtml(formatScore(result.total_marks))}</td>
        <td><strong>Average:</strong> ${escapeHtml(formatScore(result.average))}</td>
        <td><strong>Grade:</strong> ${escapeHtml(result.grade || 'N/A')}</td>
        <td><strong>Position:</strong> ${escapeHtml(result.position != null ? result.position : 'N/A')}</td>
        <td><strong>Remarks:</strong> ${escapeHtml(result.remarks || 'N/A')}</td>
      </tr>
    </table>
  </div>

  <div class="signature-section">
    <p><strong>Mwalimu wa Taaluma:</strong> ________________________</p>
    <p><strong>Maoni ya Mkuu wa Shule:</strong> ________________________</p>
    <table class="summary-row-table signature-footer-table">
      <tr>
        <td><strong>Sahihi ya Mkuu wa Shule:</strong> Signature</td>
        <td><strong>Tarehe:</strong> ${escapeHtml(new Date().toLocaleDateString())}</td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

/**
 * @returns {Promise<Buffer>}
 */
async function generateIndividualInterviewPDF(
  student,
  result,
  subjects,
  scores,
  year,
  logoUrl = null,
  reportKind = 'interview'
) {
  const htmlContent = buildIndividualInterviewReportHtml(
    student,
    result,
    subjects,
    scores,
    year,
    logoUrl,
    reportKind
  );
  return renderHtmlToPdfBuffer(htmlContent);
}

module.exports = {
  buildIndividualInterviewReportHtml,
  generateIndividualInterviewPDF,
};
