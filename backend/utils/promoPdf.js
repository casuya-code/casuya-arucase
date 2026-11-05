/**
 * PROMO PDF — Form One subject performance sheets for Form Two allocation.
 *
 * Renders a landscape A4 PDF: one compact table per student listing every
 * registered subject with the eight assessment months, total, average, grade,
 * position and the qualify/discuss/not-qualify remark.
 */
const { acquirePage, releasePage } = require('./puppeteerPool');

const escapeHtml = (value) =>
  String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatScore = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
};

const formatAverage = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(1);
};

const remarkClass = (remarks) => {
  const value = String(remarks || '').trim().toUpperCase();
  if (value === 'QUALIFY') return 'remark--qualify';
  if (value === 'DISCUSS') return 'remark--discuss';
  if (value === 'NOT QUALIFY') return 'remark--not';
  return 'remark--none';
};

const gradeClass = (grade) => {
  const value = String(grade || '').trim().toUpperCase();
  return ['A', 'B', 'C', 'D', 'F'].includes(value) ? `grade--${value.toLowerCase()}` : '';
};

function buildPromoFormOneHtml(data, qualifyThreshold = 65, discussThreshold = 54.5) {
  const months = data.months || [];
  const students = data.students || [];
  const year = data.year;
  const subjectCount = new Set(
    students.flatMap((student) => (student.subjects || []).map((subject) => subject.subject_code))
  ).size;

  const generatedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const colgroup = `
    <colgroup>
      <col style="width: 26%" />
      ${months.map(() => '<col style="width: 5.5%" />').join('')}
      <col style="width: 6%" />
      <col style="width: 6%" />
      <col style="width: 3.5%" />
      <col style="width: 3.5%" />
      <col style="width: 11%" />
    </colgroup>`;

  const studentBlocks = students.map((student, index) => {
    const subjects = student.subjects || [];
    const rows = subjects.length
      ? subjects
          .map(
            (subject) => `
              <tr>
                <td class="subject">
                  <span class="subject-name">${escapeHtml(subject.subject_name || subject.subject_code)}</span>
                  <span class="subject-code">${escapeHtml(subject.subject_code)}</span>
                </td>
                ${months
                  .map(
                    (month) =>
                      `<td class="num">${escapeHtml(formatScore(subject.scores ? subject.scores[month] : null))}</td>`
                  )
                  .join('')}
                <td class="num strong">${escapeHtml(formatScore(subject.total))}</td>
                <td class="num avg">${escapeHtml(formatAverage(subject.average))}</td>
                <td class="center"><span class="grade ${gradeClass(subject.grade)}">${escapeHtml(subject.grade || '-')}</span></td>
                <td class="num">${escapeHtml(subject.position || '-')}</td>
                <td class="center"><span class="remark ${remarkClass(subject.remarks)}">${escapeHtml(subject.remarks || '-')}</span></td>
              </tr>`
          )
          .join('')
      : `<tr><td colspan="${months.length + 6}" class="empty">No subjects registered for this class.</td></tr>`;

    return `
      <section class="student">
        <div class="student-head">
          <div class="student-id">${String(index + 1).padStart(2, '0')}</div>
          <div class="student-main">
            <div class="student-name">${escapeHtml(student.full_name || student.adm_no)}</div>
            <div class="student-meta">ADM: ${escapeHtml(student.adm_no)} &nbsp;·&nbsp; Form I &nbsp;·&nbsp; Stream ${escapeHtml(student.stream || '-')}</div>
          </div>
          <div class="student-term">${escapeHtml(student.term || 'Form One')}</div>
        </div>
        <table class="marks">
          ${colgroup}
          <thead>
            <tr>
              <th class="subject">SUBJECT</th>
              ${months.map((month) => `<th>${escapeHtml(String(month).toUpperCase())}</th>`).join('')}
              <th>TOTAL<br />SCORE</th>
              <th>AVERAGE</th>
              <th>GRADE</th>
              <th>POSITION</th>
              <th>REMARKS</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>PROMO - Form One ${escapeHtml(year)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    color: #1a1a1a;
    font-size: 8pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 0 0 6px;
    border-bottom: 2px solid #065f46;
    margin-bottom: 8px;
  }
  .doc-school { font-size: 13pt; font-weight: 800; letter-spacing: 0.02em; color: #064e3b; }
  .doc-title { margin-top: 2px; font-size: 10pt; font-weight: 800; color: #1a1a1a; }
  .doc-sub { margin-top: 2px; font-size: 7.5pt; color: #4a4a40; }
  .doc-meta { text-align: right; font-size: 7pt; color: #4a4a40; line-height: 1.5; white-space: nowrap; }
  .doc-meta strong { color: #064e3b; }
  .legend { display: flex; gap: 6px; align-items: center; margin-bottom: 8px; font-size: 7pt; color: #4a4a40; }
  .legend .pill { padding: 2px 7px; border-radius: 999px; font-weight: 800; font-size: 6.5pt; letter-spacing: 0.04em; }
  .pill--qualify, .remark--qualify { background: #dcfce7; color: #166534; }
  .pill--discuss, .remark--discuss { background: #fef3c7; color: #92400e; }
  .pill--not, .remark--not { background: #fee2e2; color: #991b1b; }
  .remark--none { background: #f3f4f6; color: #6b7280; }

  .student {
    border: 1px solid #d9d6cd;
    margin-bottom: 6px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .student-head {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px;
    background: #f3f7f4;
    border-bottom: 1px solid #d9d6cd;
  }
  .student-id {
    width: 16px; height: 16px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px; background: #065f46; color: #ffffff;
    font-size: 6pt; font-weight: 800;
  }
  .student-main { flex: 1; min-width: 0; }
  .student-name { font-size: 8pt; font-weight: 800; line-height: 1.15; }
  .student-meta { font-size: 6pt; color: #4a4a40; margin-top: 0; }
  .student-term {
    font-size: 6pt; font-weight: 800; color: #065f46;
    background: #dcfce7; border: 1px solid #a7f3d0; border-radius: 999px;
    padding: 1px 6px; white-space: nowrap;
  }

  table.marks { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.marks th {
    background: #eceee9;
    border-bottom: 1px solid #d9d6cd;
    border-right: 1px solid #e3e0d8;
    color: #3f3f38;
    font-size: 5.6pt;
    font-weight: 800;
    letter-spacing: 0.02em;
    text-align: center;
    padding: 2px 2px;
    line-height: 1.1;
  }
  table.marks th:last-child, table.marks td:last-child { border-right: none; }
  table.marks td {
    border-bottom: 1px solid #f1f0ea;
    border-right: 1px solid #f1f0ea;
    padding: 1.6px 2.5px;
    font-size: 6.4pt;
    line-height: 1.1;
    vertical-align: middle;
  }
  table.marks tbody tr:last-child td { border-bottom: none; }
  td.subject { padding-left: 6px; }
  .subject-name { font-weight: 700; font-size: 6.4pt; }
  .subject-code { margin-left: 3px; font-size: 5.2pt; color: #8a8a80; font-weight: 600; }
  td.num, td.center { text-align: center; }
  td.strong { font-weight: 800; }
  td.avg { font-weight: 800; color: #047857; }
  td.empty { text-align: center; color: #8a8a80; font-size: 6.8pt; padding: 6px; }

  .grade {
    display: inline-block; min-width: 12px; padding: 1px 3px; border-radius: 3px;
    font-size: 6.2pt; font-weight: 800; background: #f3f4f6; color: #4b5563;
  }
  .grade--a { background: #dcfce7; color: #166534; }
  .grade--b { background: #dbeafe; color: #1e40af; }
  .grade--c { background: #fef3c7; color: #92400e; }
  .grade--d { background: #ffedd5; color: #9a3412; }
  .grade--f { background: #fee2e2; color: #991b1b; }

  .remark {
    display: inline-block; padding: 1px 5px; border-radius: 999px;
    font-size: 5.6pt; font-weight: 800; letter-spacing: 0.02em; white-space: nowrap;
  }

  .doc-foot { margin-top: 10px; font-size: 6.5pt; color: #6b6b60; text-align: center; }
</style>
</head>
<body>
  <header class="doc-head">
    <div>
      <div class="doc-school">ARUSHA CATHOLIC SEMINARY</div>
      <div class="doc-title">PROMO — FORM ONE SUBJECT PERFORMANCE</div>
      <div class="doc-sub">Form Two subject allocation guide · Academic year ${escapeHtml(year)}</div>
    </div>
    <div class="doc-meta">
      Students: <strong>${students.length}</strong><br />
      Registered subjects: <strong>${subjectCount}</strong><br />
      Generated: ${escapeHtml(generatedAt)}
    </div>
  </header>

  <div class="legend">
    <strong>KEY:</strong>
    <span class="pill pill--qualify">QUALIFY</span> average ${qualifyThreshold} and above
    <span class="pill pill--discuss">DISCUSS</span> ${discussThreshold} to below ${qualifyThreshold}
    <span class="pill pill--not">NOT QUALIFY</span> below ${discussThreshold}
  </div>

  ${studentBlocks.join('\n')}

  <div class="doc-foot">PROMO report generated from recorded Form One monthly scores.</div>
</body>
</html>`;
}

/**
 * Render the PROMO report to a landscape A4 PDF buffer.
 * @param {object} data - Result of buildPromoFormOne (year, months, students).
 * @returns {Promise<Buffer>}
 */
async function renderPromoFormOnePdf(data, qualifyThreshold = 65, discussThreshold = 54.5) {
  const html = buildPromoFormOneHtml(data, qualifyThreshold, discussThreshold);
  let page = null;

  try {
    page = await acquirePage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try {
      await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
    } catch {
      /* fonts are optional */
    }

    const footer = `<div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:7px;color:#6b6b60;padding:0 8mm;display:flex;justify-content:space-between;">
      <span>PROMO — Form One ${escapeHtml(data.year)}</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`;

    const rawPdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      // Tagged PDFs duplicate every element with marked-content wrappers,
      // which bloats this report ~6x. Keep the file small and fast to save.
      tagged: false,
      outline: false,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: footer,
      margin: { top: '8mm', right: '8mm', bottom: '13mm', left: '8mm' },
      preferCSSPageSize: false,
    });

    return Buffer.from(rawPdf);
  } finally {
    if (page) {
      try {
        await releasePage(page);
      } catch (releaseError) {
        console.error('[PROMO-PDF] Error releasing page to pool:', releaseError.message);
      }
    }
  }
}

module.exports = {
  buildPromoFormOneHtml,
  renderPromoFormOnePdf,
};
