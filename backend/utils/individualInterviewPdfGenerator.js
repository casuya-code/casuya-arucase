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
  reportKind = 'interview',
  authoritySigDataUri = null,
  authorityName = '',
  authorityTitle = '',
  schoolStampDataUri = null
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
      padding: 14px;
      font-size: 18px;
      color: #111827;
      line-height: 1.35;
    }
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border: 1px solid #e5e7eb;
      margin-bottom: 12px;
    }
    .logo-section { flex: 0 0 70px; text-align: center; }
    .school-logo { width: 60px; height: 60px; object-fit: contain; }
    .school-logo-placeholder {
      width: 60px; height: 60px; background: #f3f4f6; border: 1px solid #e5e7eb;
    }
    .school-info { flex: 1; text-align: center; padding: 0 8px; }
    .school-info h1 { margin: 0 0 3px; font-size: 22px; font-weight: 700; }
    .school-info h2 { margin: 0 0 5px; font-size: 19px; font-weight: 600; color: #374151; }
    .contact-info p { margin: 1px 0; font-size: 15px; color: #6b7280; }
    .report-title {
      text-align: center;
      font-size: 23px;
      font-weight: 700;
      margin: 0 0 12px;
      padding-bottom: 5px;
      border-bottom: 2px solid #374151;
    }
    .summary-section {
      margin-bottom: 12px;
      padding: 8px 10px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    .summary-row-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
      font-size: 18px;
    }
    .summary-row-table td {
      padding: 3px 5px;
      vertical-align: top;
      white-space: normal;
    }
    .results-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    .results-table th,
    .results-table td {
      border: 1px solid #e5e7eb;
      padding: 5px 8px;
      text-align: left;
      font-size: 18px;
    }
    .results-table th {
      background: #f3f4f6;
      font-weight: 600;
    }
    .signature-section {
      margin-top: 20px;
    }
    .signature-section p { margin: 5px 0; font-size: 18px; }
    .signature-footer-table {
      width: auto;
      margin-left: auto;
      margin-top: 10px;
    }
    .signature-footer-table td {
      text-align: right;
      padding-left: 18px;
      font-size: 18px;
    }
    .grade-badge {
      display: inline-block;
      padding: 1px 10px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 18px;
    }
    .grade-badge-A { background: linear-gradient(90deg, #166534, #22c55e); color: white; }
    .grade-badge-B { background: #86efac; color: #14532d; }
    .grade-badge-C { background: #fef9c3; color: #713f12; }
    .grade-badge-C-low { background: #fecaca; color: #7f1d1d; }
    .grade-badge-D, .grade-badge-E, .grade-badge-S, .grade-badge-F { background: #fecaca; color: #7f1d1d; }
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
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

  <div class="report-title">TAARIFA YA USAILI WA PRE-FORM ONE ${escapeHtml(year)}</div>

  <div class="summary-section">
    <table class="summary-row-table">
      <tr>
        <td><strong>JINA LA MTAHINIWA:</strong> ${escapeHtml(studentName)}</td>
        <td><strong>PAROKIA:</strong> ${escapeHtml(student.parish || 'N/A')}</td>
        <td><strong>JINSIA:</strong> ${escapeHtml(student.sex || 'N/A')}</td>
      </tr>
    </table>
  </div>

  <table class="results-table">
    <thead>
      <tr>
        <th>SOMO</th>
        <th>ALAMA</th>
        <th>DARAJA</th>
      </tr>
    </thead>
    <tbody>${subjectRows}</tbody>
  </table>

  <div class="summary-section">
    <table class="summary-row-table">
      <tr>
        <td><strong>JUMLA:</strong> ${escapeHtml(formatScore(result.total_marks))}</td>
        <td><strong>WASTANI:</strong> ${escapeHtml(formatScore(result.average))}</td>
        <td><strong>DARAJA LA WASTANI:</strong> ${result.grade ? `<span class="grade-badge grade-badge-${result.grade === 'C' && result.average != null && Number(result.average) < 55 ? 'C-low' : result.grade}">${escapeHtml(result.grade)}</span>` : 'N/A'}</td>
        <td><strong>NAFASI:</strong> ${escapeHtml(result.position != null ? result.position : 'N/A')}</td>
        <td><strong>MAONI:</strong> ${result.average != null && Number(result.average) >= 55 ? 'Amechaguliwa' : 'Hajachaguliwa. Alama alizopata hazijafikia vigezo vya ufaulu vinavyohitajika ili kujiunga na shule hii.'}</td>
      </tr>
    </table>
  </div>

  <div class="signature-section" style="position: relative;">
    ${schoolStampDataUri ? `<img src="${schoolStampDataUri}" style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); width: 220px; opacity: 0.30; pointer-events: none; z-index: 0;" />` : ''}
    <p style="position: relative; z-index: 1;"><strong>Maoni ya Baba Gombera:</strong> ${result.average != null && Number(result.average) >= 55 ?       'Hongera sana kwa kuchaguliwa kujiunga na seminari yetu. Karibu sana katika kitalu hiki cha kulea na kukuza miito. Tumia nafasi hii vizuri kwa ajili ya ustawi wa masomo yako na malezi ya kiroho.' : 'Ninakushukuru kwa uthubutu wako mkubwa wa kuja kufanya usaili katika seminari yetu. Ingawa hukuweza kufikia vigezo vya ushindani vya seminari yetu kwa sasa, usikate tamaa kamwe. Ninakutakia baraka njema na milango ya kupata nafasi ya shule huko utakakokwenda.'}</p>
    <table class="summary-row-table signature-footer-table" style="position: relative; z-index: 1;">
      <tr>
        <td><strong>Sahihi ya Baba Gombera:</strong> ${authoritySigDataUri ? `<img src="${authoritySigDataUri}" style="height: 30px; vertical-align: middle;" />` : '_________________________'}</td>
        <td><strong>Tarehe:</strong> ${(() => { const d = new Date(); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })()}</td>
      </tr>
      ${authorityName ? `<tr><td colspan="2" style="text-align: center; font-size: 15px; padding-top: 2px;">${escapeHtml(authorityName)}${authorityTitle ? `, ${escapeHtml(authorityTitle)}` : ''}</td></tr>` : ''}
    </table>
  </div>
  ${result.average != null && Number(result.average) >= 55 ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; text-align: center; padding: 4px; border-top: 1px solid #166534; background-color: #f0fdf4; font-size: 13px;"><strong>Matokeo haya yameambatana na Fomu yako ya kujiunga, ifanyiwe kazi. Seminari itafungua tarehe 02/10/2026.</strong></div>` : ''}
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
  reportKind = 'interview',
  authoritySigDataUri = null,
  authorityName = '',
  authorityTitle = '',
  schoolStampDataUri = null
) {
  const htmlContent = buildIndividualInterviewReportHtml(
    student,
    result,
    subjects,
    scores,
    year,
    logoUrl,
    reportKind,
    authoritySigDataUri,
    authorityName,
    authorityTitle,
    schoolStampDataUri
  );
  return renderHtmlToPdfBuffer(htmlContent);
}

module.exports = {
  buildIndividualInterviewReportHtml,
  generateIndividualInterviewPDF,
};
