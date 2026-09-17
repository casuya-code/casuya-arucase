/**
 * Interview results PDF — same columns and calculations as the admin page preview.
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const PASS_MARK = 65;

const GRADING_SCALE = [
  { min: 80, grade: 'A', remarks: 'Excellent' },
  { min: 70, grade: 'B', remarks: 'Good' },
  { min: 65, grade: 'C', remarks: 'Satisfactory' },
  { min: 45, grade: 'D', remarks: 'Needs Improvement' },
  { min: 0, grade: 'F', remarks: 'Fail' },
];

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeSubjectCode(code) {
  if (code == null || code === '') return '';
  return String(code).trim().toUpperCase();
}

function admissionKey(value) {
  if (value == null || value === '') return '';
  return String(value).trim();
}

function scoreForSubject(scoresByCode, subjectCode) {
  if (!scoresByCode) return undefined;
  const key = normalizeSubjectCode(subjectCode);
  if (key && scoresByCode[key] !== undefined) return scoresByCode[key];
  return scoresByCode[subjectCode];
}

function formatSubjectScoreCell(value) {
  if (value === undefined || value === null || value === '') return '-';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
  return String(num);
}

function calculateInterviewMetrics(scoresByCode, activeSubjects) {
  if (!activeSubjects?.length) {
    return { total_marks: 0, average: 0, grade: '-', remarks: '-' };
  }

  let total_marks = 0;
  let scoredCount = 0;

  for (const subject of activeSubjects) {
    const raw = scoreForSubject(scoresByCode, subject.subject_code);
    if (raw !== null && raw !== undefined && raw !== '') {
      const num = Number(raw);
      if (Number.isFinite(num)) {
        total_marks += num;
        scoredCount++;
      }
    }
  }

  const average = scoredCount > 0 ? total_marks / scoredCount : 0;
  const gradeInfo =
    GRADING_SCALE.find((g) => average >= g.min) || GRADING_SCALE[GRADING_SCALE.length - 1];

  return {
    total_marks,
    average: Math.round(average * 100) / 100,
    grade: gradeInfo.grade,
    remarks: gradeInfo.remarks,
  };
}

function assignResultPositions(resultsObj) {
  const next = { ...resultsObj };
  const ranked = Object.keys(next)
    .map((adm) => ({ adm, avg: Number(next[adm]?.average) || 0 }))
    .sort((a, b) => b.avg - a.avg);

  ranked.forEach((item, index) => {
    next[item.adm] = { ...next[item.adm], position: index + 1 };
  });
  return next;
}

function mergeAutoAndSavedResult(auto, saved) {
  if (!auto && !saved) return {};
  if (!saved) return auto || {};
  if (!auto) return saved;

  return {
    ...saved,
    ...auto,
    position:
      saved.position != null && Number(saved.position) > 0
        ? saved.position
        : auto.position,
  };
}

function compareStudentNames(a, b) {
  const fn = (a.first_name || '').localeCompare(b.first_name || '', undefined, {
    sensitivity: 'base',
  });
  if (fn !== 0) return fn;
  const mn = (a.middle_name || '').localeCompare(b.middle_name || '', undefined, {
    sensitivity: 'base',
  });
  if (mn !== 0) return mn;
  return (a.surname || '').localeCompare(b.surname || '', undefined, {
    sensitivity: 'base',
  });
}

const PDF_KIND_CONFIG = {
  interview: {
    subjectsTable: 'preformone_interview_subjects',
    resultsTable: 'preform_one_interview_results',
    scoreType: 'interview',
    barLabel: 'PRE-FORM ONE INTERVIEW RESULTS',
    pageTitle: 'Pre-Form One Interview Results',
  },
  continuing: {
    subjectsTable: 'preformone_continuing_subjects',
    resultsTable: 'preform_one_continuing_results',
    scoreType: 'continuing',
    barLabel: 'PRE-FORM ONE CONTINUING RESULTS',
    pageTitle: 'Pre-Form One Continuing Results',
  },
};

/**
 * Load and merge data the same way as Pre-Form One results admin pages.
 * @param {'interview'|'continuing'} kind
 */
async function buildPreFormOneResultsPdfData(year, query, kind = 'interview') {
  const cfg = PDF_KIND_CONFIG[kind] || PDF_KIND_CONFIG.interview;
  const yearNum = parseInt(year, 10);

  const [studentsRes, savedRes, scoresRes] = await Promise.all([
    query(
      'SELECT * FROM preform_one_students WHERE year = $1 ORDER BY admission_number',
      [yearNum]
    ),
    query(`SELECT * FROM ${cfg.resultsTable} WHERE year = $1`, [yearNum]),
    query(
      `
      SELECT sc.student_id, sc.score, sub.id AS subject_id, sub.subject_code, sub.subject_name, st.admission_number
      FROM preform_one_scores sc
      JOIN ${cfg.subjectsTable} sub ON sc.subject_id = sub.id
      JOIN preform_one_students st ON sc.student_id = st.id
      WHERE sc.subject_type = $2 AND st.year = $1 AND sub.is_active = true AND sc.score IS NOT NULL
      `,
      [yearNum, cfg.scoreType]
    ),
  ]);

  const students = studentsRes.rows;

  // Build a set of subject_ids that have at least one real (non-null) score
  const subjectIdsWithScores = new Set();
  scoresRes.rows.forEach((row) => {
    if (row.subject_id && row.score != null) {
      const n = Number(row.score);
      if (Number.isFinite(n)) {
        subjectIdsWithScores.add(row.subject_id);
      }
    }
  });

  const seen = new Map();
  scoresRes.rows.forEach((row) => {
    const code = normalizeSubjectCode(row.subject_code);
    if (row.subject_id && code && !seen.has(row.subject_id) && subjectIdsWithScores.has(row.subject_id)) {
      seen.set(row.subject_id, {
        id: row.subject_id,
        subject_code: row.subject_code,
        subject_name: row.subject_name || row.subject_code,
      });
    }
  });
  const subjects = [...seen.values()].sort((a, b) =>
    normalizeSubjectCode(a.subject_code).localeCompare(
      normalizeSubjectCode(b.subject_code)
    )
  );

  if (students.length === 0) {
    return { students: [], subjects: [], rows: [] };
  }

  const subjectScores = {};
  scoresRes.rows.forEach((row) => {
    const adm = admissionKey(row.admission_number);
    const code = normalizeSubjectCode(row.subject_code);
    if (!adm || !code) return;
    if (!subjectScores[adm]) subjectScores[adm] = {};
    subjectScores[adm][code] = row.score;
  });

  const existingResults = {};
  savedRes.rows.forEach((row) => {
    const adm = admissionKey(row.admission_number);
    if (adm) existingResults[adm] = row;
  });

  const autoCalculated = {};
  students.forEach((student) => {
    const adm = admissionKey(student.admission_number);
    const scores = subjectScores[adm];
    if (!adm || !scores || Object.keys(scores).length === 0) return;
    autoCalculated[adm] = calculateInterviewMetrics(scores, subjects);
  });

  const displayResults = assignResultPositions(
    students.reduce((merged, student) => {
      const adm = admissionKey(student.admission_number);
      if (!adm) return merged;
      merged[adm] = mergeAutoAndSavedResult(autoCalculated[adm], existingResults[adm]);
      return merged;
    }, {})
  );

  const sortedStudents = [...students].sort((a, b) => {
    const resultA = displayResults[admissionKey(a.admission_number)];
    const resultB = displayResults[admissionKey(b.admission_number)];
    const avgA =
      resultA?.average != null ? Number(resultA.average) : null;
    const avgB =
      resultB?.average != null ? Number(resultB.average) : null;
    const aHasAvg = avgA != null && Number.isFinite(avgA) && avgA > 0;
    const bHasAvg = avgB != null && Number.isFinite(avgB) && avgB > 0;
    if (aHasAvg && bHasAvg && avgA !== avgB) return avgB - avgA;
    if (aHasAvg && !bHasAvg) return -1;
    if (!aHasAvg && bHasAvg) return 1;
    return compareStudentNames(a, b);
  });

  const rows = sortedStudents.map((student, index) => {
    const adm = admissionKey(student.admission_number);
    const result = displayResults[adm] || {};
    const scores = subjectScores[adm] || {};
    const avgValue = result.average != null ? Number(result.average) : null;

    return {
      sn: index + 1,
      first_name: student.first_name || '-',
      middle_name: student.middle_name || '-',
      surname: student.surname || '-',
      parish: student.parish || '-',
      subjectCells: subjects.map((subject) =>
        formatSubjectScoreCell(scoreForSubject(scores, subject.subject_code))
      ),
      total:
        result.total_marks != null && result.total_marks !== ''
          ? formatSubjectScoreCell(result.total_marks)
          : '-',
      average:
        avgValue != null && Number.isFinite(avgValue) ? String(Math.round(avgValue)) : '-',
      grade: result.grade || '-',
      avgValue,
      position: result.position || '-',
      remarks: result.remarks || '-',
    };
  });

  return { students, subjects, rows, barLabel: cfg.barLabel, pageTitle: cfg.pageTitle };
}

async function buildInterviewResultsPdfData(year, query) {
  const data = await buildPreFormOneResultsPdfData(year, query, 'interview');
  const { barLabel, pageTitle, ...rest } = data;
  return rest;
}

async function buildContinuingResultsPdfData(year, query) {
  const data = await buildPreFormOneResultsPdfData(year, query, 'continuing');
  const { barLabel, pageTitle, ...rest } = data;
  return rest;
}

/** Base URL for /static assets when API is behind Vite proxy (3001 → 5000). */
function resolveStaticOrigin(req) {
  if (process.env.PUBLIC_API_URL) {
    return process.env.PUBLIC_API_URL.replace(/\/api\/?$/, '');
  }
  if (process.env.PUBLIC_BACKEND_URL) {
    return String(process.env.PUBLIC_BACKEND_URL).replace(/\/$/, '');
  }
  const host = req?.get?.('host') || '';
  const apiPort = process.env.PORT || '5000';
  if (/localhost:3001|127\.0\.0\.1:3001|:5173/.test(host)) {
    return `http://127.0.0.1:${apiPort}`;
  }
  if (req?.protocol && host) {
    return `${req.protocol}://${host}`;
  }
  return `http://127.0.0.1:${apiPort}`;
}

function getStaticImageUrl(imagePath, staticOrigin) {
  if (!imagePath || !staticOrigin) return null;
  const clean = String(imagePath).replace(/^\/+/, '');
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  if (clean.startsWith('static/')) return `${staticOrigin}/${clean}`;
  return `${staticOrigin}/static/${clean}`;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Load logo bytes from Cloudinary URL or local static/uploads path. */
async function loadSchoolLogoBuffer(logoImagePath) {
  if (!logoImagePath) return null;
  const ref = String(logoImagePath).trim();

  if (/^https?:\/\//i.test(ref)) {
    const response = await axios.get(ref, { responseType: 'arraybuffer', timeout: 15000 });
    return Buffer.from(response.data);
  }

  const clean = ref.replace(/^\/+/, '');
  const candidates = [
    path.join(__dirname, '../static', clean),
    path.join(__dirname, '../static/uploads', path.basename(clean)),
    path.join(__dirname, '..', clean),
  ];
  if (ref.startsWith('/') || /^[A-Za-z]:/.test(ref)) {
    candidates.unshift(ref);
  }

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return fs.readFile(candidate);
    }
  }
  return null;
}

function logoBufferToDataUri(buffer, logoImagePath) {
  if (!buffer?.length) return null;
  let ext = path.extname(String(logoImagePath || '')).toLowerCase().replace('.', '');
  if (!ext && buffer[0] === 0x89 && buffer[1] === 0x50) ext = 'png';
  if (!ext) ext = 'jpeg';
  const mime =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/**
 * Inline logo for Puppeteer PDF (HTTP static URLs often fail in headless Chrome).
 */
async function resolveSchoolLogoDataUri(logoImagePath) {
  const buffer = await loadSchoolLogoBuffer(logoImagePath);
  return logoBufferToDataUri(buffer, logoImagePath);
}

/** Load school logo for PDF (inline data URI). */
async function resolveSchoolLogoForPdf(dbQuery) {
  const logoResult = await dbQuery('SELECT logo_image_path FROM school_logo WHERE id = 1');
  const path = logoResult.rows[0]?.logo_image_path;
  if (!path) return null;
  return resolveSchoolLogoDataUri(path);
}

function buildLogoBlockHtml(logoUrl) {
  if (!logoUrl) {
    return '<div class="school-logo-placeholder"></div>';
  }
  const src = String(logoUrl);
  // Inline data URIs must not be HTML-escaped (breaks long src; Puppeteer won't render)
  if (/^data:image\/[a-z0-9+.-]+;base64,/i.test(src)) {
    return `<img src="${src}" alt="School logo" class="school-logo" />`;
  }
  return `<img src="${escapeHtml(src)}" alt="School logo" class="school-logo" />`;
}

function generatePreFormOneResultsPdfHtml({
  subjects,
  rows,
  year,
  logoUrl,
  barLabel = 'PRE-FORM ONE RESULTS',
  pageTitle = 'Pre-Form One Results',
}) {
  const subjectHeaders = subjects
    .map(
      (s) =>
        `<th class="subject-col"><span class="rotate-header">${escapeHtml(s.subject_code)}</span></th>`
    )
    .join('');

  const tableRows = rows
    .map(
      (row) => {
        let gradeClass = '';
        if (row.grade && row.grade !== '-') {
          if (row.grade === 'C' && row.avgValue != null && row.avgValue < 65) {
            gradeClass = 'grade-row-C-low';
          } else {
            gradeClass = `grade-row-${row.grade}`;
          }
        }
        return `
    <tr class="${gradeClass}">
      <td class="col-sn">${row.sn}</td>
      <td class="col-fname">${escapeHtml(row.first_name)}</td>
      <td class="col-mname">${escapeHtml(row.middle_name)}</td>
      <td class="col-sname">${escapeHtml(row.surname)}</td>
      <td class="col-parish">${escapeHtml(row.parish)}</td>
      ${row.subjectCells.map((cell) => `<td class="subject-col">${escapeHtml(cell)}</td>`).join('')}
      <td class="result-col tot-col">${escapeHtml(row.total)}</td>
      <td class="result-col">${escapeHtml(row.average)}</td>
      <td class="result-col grd-col">${escapeHtml(row.grade)}</td>
      <td class="result-col">${escapeHtml(row.position)}</td>
      <td class="result-col">${escapeHtml(row.remarks)}</td>
    </tr>`;
      }
    )
    .join('');

  const logoBlock = buildLogoBlockHtml(logoUrl);

  const FONT_LINKS = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
`;
  const FONT_STACK = "'Tinos', 'Times New Roman', 'Liberation Serif', 'Times', serif";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(pageTitle)} ${escapeHtml(year)}</title>
  ${FONT_LINKS}
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: ${FONT_STACK};
      margin: 0;
      padding: 12px;
      font-size: 14px;
      color: #000000;
      line-height: 1.3;
    }
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border: 1px solid #000000;
      margin-bottom: 0;
    }
    .logo-section { flex: 0 0 130px; text-align: center; }
    .school-logo { width: 120px; height: 120px; object-fit: contain; }
    .school-logo-placeholder {
      width: 120px; height: 120px; background: #ffffff; border: 1px solid #000000;
    }
    .school-info { flex: 1; text-align: center; padding: 0 8px; }
    .school-info h1 { margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #000000; }
    .school-info h2 { margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #000000; }
    .contact-info p { margin: 2px 0; font-size: 14px; color: #000000; }
    .test-info-bar {
      text-align: center;
      padding: 10px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.02em;
      border: 1px solid #000000;
      border-top: none;
      margin-bottom: 12px;
      color: #000000;
    }
    table.compact-results-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      line-height: 1.3;
    }
    table.compact-results-table th,
    table.compact-results-table td {
      border: 1px solid #000000;
      padding: 3px 4px;
      text-align: center;
      vertical-align: middle;
      color: #000000;
    }
    table.compact-results-table th {
      background: #ffffff;
      font-weight: 700;
      color: #000000;
    }
    .col-sn { min-width: 22px; }
    .col-fname, .col-mname, .col-sname { min-width: 48px; text-align: left; }
    .col-parish { min-width: 56px; text-align: left; }
    .subject-col { min-width: 24px; max-width: 34px; }
    .result-col { min-width: 28px; font-weight: 600; }
    .tot-col, .grd-col { font-weight: 700; }
    .rotate-header {
      display: inline-block;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      max-height: 120px;
      line-height: 1.1;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .grade-row-A, .grade-row-A td { background: linear-gradient(90deg, #166534 0%, #22c55e 100%) !important; color: white !important; }
    .grade-row-B, .grade-row-B td { background: #86efac !important; color: #14532d !important; }
    .grade-row-C, .grade-row-C td { background: #fef9c3 !important; color: #713f12 !important; }
    .grade-row-C-low, .grade-row-C-low td { background: #fecaca !important; color: #7f1d1d !important; }
    .grade-row-D, .grade-row-E, .grade-row-S, .grade-row-F { background: #fecaca !important; color: #7f1d1d !important; }
    .grade-row-D td, .grade-row-E td, .grade-row-S td, .grade-row-F td { background: #fecaca !important; color: #7f1d1d !important; }
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
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
  <div class="test-info-bar">${escapeHtml(barLabel)} ${escapeHtml(year)}</div>
  <table class="compact-results-table">
    <thead>
      <tr>
        <th class="col-sn">S/N</th>
        <th class="col-fname">First Name</th>
        <th class="col-mname">Middle Name</th>
        <th class="col-sname">Surname</th>
        <th class="col-parish">Parish</th>
        ${subjectHeaders}
        <th class="result-col">TOT</th>
        <th class="result-col">AVR</th>
        <th class="result-col">GRD</th>
        <th class="result-col">POS</th>
        <th class="result-col">REMARKS</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`;
}

/**
 * Render HTML to PDF buffer using shared Puppeteer launch (Railway/local).
 */
async function renderHtmlToPdfBuffer(htmlContent) {
  const { launchBrowser } = require('./puppeteerLaunch');
  const browser = await launchBrowser({ timeout: 120000 });
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img.school-logo'));
      return Promise.all(
        imgs.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete && img.naturalHeight > 0) {
                resolve();
                return;
              }
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            })
        )
      );
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
    const rawPdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '12px', right: '12px', bottom: '12px', left: '12px' },
      timeout: 60000,
    });
    // page.pdf() returns Uint8Array; normalize so callers can validate/send reliably
    return Buffer.from(rawPdf);
  } finally {
    await browser.close();
  }
}

function generateInterviewResultsPdfHtml(opts) {
  return generatePreFormOneResultsPdfHtml({
    ...opts,
    barLabel: 'PRE-FORM ONE INTERVIEW RESULTS',
    pageTitle: 'Pre-Form One Interview Results',
  });
}

function generateContinuingResultsPdfHtml(opts) {
  return generatePreFormOneResultsPdfHtml({
    ...opts,
    barLabel: 'PRE-FORM ONE CONTINUING RESULTS',
    pageTitle: 'Pre-Form One Continuing Results',
  });
}

module.exports = {
  buildInterviewResultsPdfData,
  buildContinuingResultsPdfData,
  buildPreFormOneResultsPdfData,
  generateInterviewResultsPdfHtml,
  generateContinuingResultsPdfHtml,
  generatePreFormOneResultsPdfHtml,
  getStaticImageUrl,
  resolveStaticOrigin,
  resolveSchoolLogoDataUri,
  resolveSchoolLogoForPdf,
  buildLogoBlockHtml,
  renderHtmlToPdfBuffer,
};
