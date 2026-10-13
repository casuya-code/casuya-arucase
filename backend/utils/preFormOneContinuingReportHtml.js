/**
 * Pre-Form One Continuing Report (O-Level look & feel).
 *
 * Renders the same report card as `htmlReportRenderer.generateReportHTML`
 * (same CSS/classes so it prints identically to the O-Level report) but for
 * students on the Pre-Form One "continuing" track:
 *
 *  - Section A shows the class as PRE-FORM ONE (no stream).
 *  - Section B has ONE assessment column ("MATOKEO YA TATHMINI YA KOZI")
 *    instead of the four monthly test columns used by Form I-IV.
 *  - No pass-mark / month-weight configuration is required (a single
 *    assessment per subject is used).
 *  - Grades use the canonical O-Level scale (utils/oLevelGrading).
 *
 * Comments (Taaluma, Sala, Tabia, Mkuu wa Shule …) are read from the supplied
 * `comments` / `tabia_mwenendo` payload; until the Pre-Form One comment modules
 * exist these stay blank/default just like an O-Level report with no comments.
 */
const { HEAD_FONT_LINKS, FONT_STACK } = require('./reportPdfFontSnippets');
const {
  getAuthoritySignatureImageUrl,
  getAuthoritySignatureText,
} = require('./authoritySignature');
const { formatReportScore } = require('./reportScoreFormat');
const {
  TRAIT_CODES,
  getReportDictionary,
  getTraitDescription,
  getMarksLegend,
  normalizeReportLanguage,
} = require('./reportLang');
const { getCSSContent } = require('./htmlReportRenderer');
const { BULK_MULTI_PAGE_HEADER_CSS } = require('./bulkReportHeaderCss');

const REPORT_INNER_START = '<!-- __ARUCASE_REPORT_INNER_START__ -->';
const REPORT_INNER_END = '<!-- __ARUCASE_REPORT_INNER_END__ -->';

/** Column heading for the single continuing assessment (replaces 4 test columns). */
const COURSE_ASSESSMENT_LABEL = {
  sw: 'MATOKEO YA TATHMINI YA KOZI',
  en: 'COURSE ASSESSMENT RESULTS',
};

const CLASS_LABEL = {
  sw: 'PRE-FORM ONE',
  en: 'PRE-FORM ONE',
};

/** Pre-Form One continuing reports are always Term II (the end-of-year term). */
const CONTINUING_TERM = 'II';

function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveStaticOrigin(apiUrl) {
  const fromApi = (apiUrl || '').trim().replace(/\/api\/?$/i, '').replace(/\/$/, '');
  if (fromApi) return fromApi;
  const envOrigin = (
    process.env.PDF_STATIC_ORIGIN ||
    process.env.PUBLIC_BACKEND_URL ||
    process.env.RAILWAY_PUBLIC_URL ||
    ''
  )
    .trim()
    .replace(/\/$/, '');
  if (envOrigin) return envOrigin;
  return 'http://localhost:5000';
}

function getImageUrl(staticOrigin, imagePath) {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  if (cleanPath.startsWith('static/')) return `${staticOrigin}/${cleanPath}`;
  return `${staticOrigin}/static/${cleanPath}`;
}

function getCommentValue(comments, key) {
  if (!comments) return '';
  if (Array.isArray(comments)) {
    const comment =
      comments.find((c) => c.comment_type === key) ||
      comments.find((c) => c.comment_type === `${key}_comments`);
    return comment?.comment_text || '';
  }
  if (typeof comments === 'object') {
    return comments[key] || comments[`${key}_comments`] || '';
  }
  return '';
}

/** tabia/mwenendo payload may be an array of rows or a { code: grade } map. */
function getTabiaEvaluation(tabiaMwenendo, code) {
  if (!tabiaMwenendo) return 'C';
  if (Array.isArray(tabiaMwenendo)) {
    const found = tabiaMwenendo.find(
      (t) => String(t.criterion ?? t.code ?? '').trim() === String(code)
    );
    return found?.evaluation || found?.grade || 'C';
  }
  if (typeof tabiaMwenendo === 'object') {
    const value = tabiaMwenendo[code] ?? tabiaMwenendo[String(code)];
    return value || 'C';
  }
  return 'C';
}

function formatAuthorityDate(authorityData) {
  if (authorityData?.date) {
    try {
      const dateObj = new Date(authorityData.date);
      if (!Number.isNaN(dateObj.getTime())) {
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch {
      /* fall through */
    }
    return authorityData.date;
  }
  return new Date().toLocaleDateString('en-GB');
}

/**
 * Report card month for a Pre-Form One continuing report.
 *
 * Term II closes the year, so the report normally carries DECEMBER. If the
 * report is generated in November it carries NOVEMBER instead; any other
 * generation month also defaults to DECEMBER.
 * @param {Date} [date] generation date (defaults to now)
 * @returns {string}
 */
function getContinuingReportMonth(date = new Date()) {
  return date.getMonth() + 1 === 11 ? 'NOVEMBER' : 'DECEMBER';
}

/** Extra CSS tightening the single-assessment academic table column widths. */
function buildContinuingTableCss() {
  return `
    .academic-table.continuing-academic-table colgroup col:nth-child(1) { width: 33% !important; }
    .academic-table.continuing-academic-table colgroup col:nth-child(2) { width: 11% !important; }
    .academic-table.continuing-academic-table colgroup col:nth-child(3) { width: 6% !important; }
    .academic-table.continuing-academic-table colgroup col:nth-child(4) { width: 6% !important; }
    .academic-table.continuing-academic-table colgroup col:nth-child(5) { width: 6% !important; }
    .academic-table.continuing-academic-table colgroup col:nth-child(6) { width: 17% !important; }
    .academic-table.continuing-academic-table colgroup col:nth-child(7) { width: 21% !important; }
    .academic-table.continuing-academic-table .continuing-assessment-cell { white-space: normal !important; }
  `;
}

/**
 * @param {Object} data
 * @param {Object} [options]
 * @param {string} [options.apiUrl]
 * @param {string} [options.lang]
 * @returns {Promise<string>} full HTML document
 */
async function generatePreFormOneContinuingReportHtml(data = {}, options = {}) {
  const { apiUrl = 'http://localhost:5000', lang = 'sw' } = options;
  const {
    student = {},
    subjects = [],
    summary = {},
    comments,
    tabia_mwenendo: tabiaMwenendo,
    student_parish: studentParish,
    student_fees_debt: studentFeesDebt,
    class_fees_announcements: classFeesAnnouncements,
    school_logo: schoolLogo,
    school_stamp: schoolStamp,
    authority_data: authorityData,
    form = 'PRE-FORM ONE',
    year,
    lang: reportLang,
  } = data;

  const language = normalizeReportLanguage(reportLang || lang);
  const t = getReportDictionary(language);
  const staticOrigin = resolveStaticOrigin(apiUrl);

  const authoritySignatureImageUrl = getAuthoritySignatureImageUrl(authorityData, staticOrigin);
  const authoritySignatureText = getAuthoritySignatureText(authorityData);
  const authoritySignatureCellHtml = authoritySignatureImageUrl
    ? `<img src="${authoritySignatureImageUrl}" alt="Signature" class="signature-image" style="max-width: 300px; max-height: 30px;" />`
    : authoritySignatureText || '';
  const authoritySignatureBlockHtml = authoritySignatureImageUrl
    ? `<div class="signature-image-container" style="text-align: left; margin-bottom: 5px;"><img src="${authoritySignatureImageUrl}" alt="Signature" class="signature-image" style="max-width: 300px; max-height: 30px; display: inline-block; vertical-align: bottom;" /></div>`
    : authoritySignatureText
      ? `<div class="signature-text authority-signature">${authoritySignatureText}</div>`
      : '';

  const subjectsData = {};
  const subjectRows = (subjects || [])
    .map((subject) => {
      const raw = subject.score;
      const ok = raw !== undefined && raw !== null && raw !== '';
      const score = ok ? formatReportScore(raw) : '-';
      const grade = subject.grade || '-';
      const comment = subject.comment || '';
      const position = subject.position != null && subject.position !== '' ? subject.position : '-';
      if (ok && subject.subject_code) {
        subjectsData[subject.subject_code] = { grade };
      }
      return `
      <tr>
        <td class="continuing-assessment-cell">${escapeHtml(subject.subject_name || subject.subject_code || '')}</td>
        <td>${escapeHtml(score)}</td>
        <td><strong>${escapeHtml(score)}</strong></td>
        <td><strong>${escapeHtml(grade)}</strong></td>
        <td>${escapeHtml(String(position))}</td>
        <td>${escapeHtml(comment)}</td>
        <td class="teacher-signature"></td>
      </tr>`;
    })
    .join('');

  const buildTabiaRows = (codes) =>
    codes
      .map(
        (code) => `
    <tr>
      <td>${code}</td>
      <td>${getTraitDescription(language, code)}</td>
      <td>${getTabiaEvaluation(tabiaMwenendo, code)}</td>
    </tr>
  `
      )
      .join('');

  const tabiaRowsLeft = buildTabiaRows(TRAIT_CODES.left);
  const tabiaRowsRight = buildTabiaRows(TRAIT_CODES.right);

  const announcements = classFeesAnnouncements || {};
  const instructions =
    Object.keys(announcements).length > 0
      ? Array.from({ length: 10 }, (_, i) => i + 1)
          .map((num) => {
            const announcement = announcements[num.toString()] || announcements[num];
            return announcement
              ? `<p class="instruction-line">${num}. ${escapeHtml(announcement)}</p>`
              : '';
          })
          .filter(Boolean)
          .join('') || `<p class="instruction-line instruction-empty">${t.noAnnouncements}</p>`
      : `<p class="instruction-line instruction-empty">${t.noAnnouncements}</p>`;

  const cssContent = await getCSSContent();

  const studentName = [student.first_name, student.middle_name, student.surname]
    .filter(Boolean)
    .join(' ');

  const html = `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${language === 'en' ? 'Continuing Report' : 'Ripoti ya Kuendelea'} - ${escapeHtml(studentName)}</title>
  ${HEAD_FONT_LINKS}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <style>
    ${cssContent}
    ${buildContinuingTableCss()}
    /* Header and section titles: black bold (no blue accent) */
    .report-container .school-info h1,
    .report-container .school-info h2,
    .report-container .contact-info p,
    .report-container .report-section h3 {
      color: #000000 !important;
      font-weight: bold !important;
    }
    @media print {
      .download-section, .breadcrumb { display: none !important; }
      .report-container .school-info h1,
      .report-container .school-info h2,
      .report-container .contact-info p,
      .report-container .report-section h3 {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    ${REPORT_INNER_START}
    <div class="report-header">
      <div class="logo-section">
        ${schoolLogo?.logo_image_path ? `<img src="${getImageUrl(staticOrigin, schoolLogo.logo_image_path)}" alt="School Logo" class="school-logo" />` : '<div class="school-logo-placeholder"><i class="fas fa-school"></i></div>'}
      </div>
      <div class="school-info">
        <h1>CATHOLIC ARCHDIOCESE OF ARUSHA</h1>
        <h2>ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU</h2>
        <div class="contact-info">
          <p>P.O BOX 3102 Arusha, Tanzania</p>
          <p>+255 754 92 60 22 / +255 765 394 802 (Office)</p>
          <p>Email: arucase@gmail.com</p>
        </div>
      </div>
      <div class="student-photo">
        ${
          // Pre-Form One students have no photograph, so the photo slot is
          // filled with the school logo (same on the individual and bulk PDFs).
          schoolLogo?.logo_image_path
            ? `<img src="${getImageUrl(staticOrigin, schoolLogo.logo_image_path)}" alt="School Logo" class="school-logo" />`
            : '<div class="photo-placeholder"><i class="fas fa-user"></i></div>'
        }
      </div>
    </div>

    <div class="report-section section-taarifa">
      <h3>${t.sectionA}</h3>
      <table class="excel-table info-table">
        <tbody>
          <tr>
            <td><strong>${t.fullName}</strong></td>
            <td>${escapeHtml(studentName)}</td>
            <td><strong>${t.sex}</strong></td>
            <td>${escapeHtml(student.sex || '-')}</td>
            <td><strong>${t.classLevel}</strong></td>
            <td>${CLASS_LABEL[language] || CLASS_LABEL.sw}</td>
          </tr>
          <tr>
            <td><strong>${t.term}</strong></td>
            <td>${CONTINUING_TERM}</td>
            <td><strong>${t.month}</strong></td>
            <td>${getContinuingReportMonth()}</td>
            <td><strong>${t.year}</strong></td>
            <td>${escapeHtml(String(year ?? ''))}</td>
          </tr>
          <tr>
            <td><strong>${t.parish}</strong></td>
            <td colspan="5">${escapeHtml(studentParish || t.parishMissing)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="section-spacer-4px"></div>

    <div class="report-section section-ufanisi">
      <h3>${t.sectionB}</h3>
      <table class="excel-table academic-table continuing-academic-table">
        <colgroup>
          <col style="width: 33%" />
          <col style="width: 11%" />
          <col style="width: 6%" />
          <col style="width: 6%" />
          <col style="width: 6%" />
          <col style="width: 17%" />
          <col style="width: 21%" />
        </colgroup>
        <thead>
          <tr>
            <th rowspan="2">${t.subject}</th>
            <th colspan="1">${t.assessmentMarks}</th>
            <th rowspan="2" class="rotate-header">${t.total}</th>
            <th rowspan="2" class="rotate-header table-header-white">${t.grade}</th>
            <th rowspan="2" class="rotate-header table-header-white">${t.position}</th>
            <th rowspan="2" class="table-header-white">${t.comments}</th>
            <th rowspan="2" class="sahihi-header table-header-white">${t.teacherSignature.replace('\\n', '<br />')}</th>
          </tr>
          <tr>
            <th>${COURSE_ASSESSMENT_LABEL[language] || COURSE_ASSESSMENT_LABEL.sw}</th>
          </tr>
        </thead>
        <tbody>
          ${subjectRows}
        </tbody>
      </table>
    </div>

    <div class="report-section section-majumuisho">
      <h3>${t.academicSummary}</h3>
      <table class="excel-table summary-table">
        <tbody>
          <tr>
            <td><strong>${t.totalMarks}</strong></td>
            <td>${formatReportScore(summary.total_marks)}</td>
            <td><strong>${t.average}</strong></td>
            <td>${formatReportScore(summary.average)}</td>
            <td><strong>${t.grade}</strong></td>
            <td class="grade-cell grade-${String(summary.grade || 'f').toLowerCase()}">${escapeHtml(summary.grade || '-')}</td>
          </tr>
          <tr>
            <td><strong>${t.division}</strong></td>
            <td>${escapeHtml(summary.division || '0')}</td>
            <td><strong>${t.points}</strong></td>
            <td>${escapeHtml(String(summary.division_point ?? '0'))}</td>
            <td><strong>${t.positionOf}</strong></td>
            <td>${escapeHtml(String(summary.position ?? '-'))}</td>
          </tr>
          <tr>
            <td colspan="3"><strong>${t.amongStudents}</strong></td>
            <td colspan="3"><strong>${escapeHtml(String(summary.total_students ?? '-'))}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="report-section section-tabia">
      <h3>${t.sectionC}</h3>
      <div class="behavior-table-container">
        <table class="excel-table behavior-table behavior-table-left">
          <thead>
            <tr>
              <th>${t.no}</th>
              <th>${t.item}</th>
              <th>${t.grade}</th>
            </tr>
          </thead>
          <tbody>
            ${tabiaRowsLeft}
          </tbody>
        </table>
        <table class="excel-table behavior-table behavior-table-right">
          <thead>
            <tr>
              <th>${t.no}</th>
              <th>${t.item}</th>
              <th>${t.grade}</th>
            </tr>
          </thead>
          <tbody>
            ${tabiaRowsRight}
          </tbody>
        </table>
      </div>

      <div class="grade-key-legend" style="margin-top: 8px; padding: 4px; font-size: 10.5px; line-height: 1.4; white-space: nowrap; overflow: visible;">
        <strong>${t.marksKey}</strong> ${getMarksLegend(language, false)} | <strong>${t.conductKey}</strong> ${t.conductLegend}
      </div>
    </div>

    <div class="report-section section-maoni-taaluma">
      <h3>${t.sectionD}</h3>
      <table class="excel-table comments-table">
        <tbody>
          <tr>
            <td><strong>${t.subjectTeacher}</strong></td>
            <td colspan="3">${escapeHtml(getCommentValue(comments, 'mwalimu_taaluma'))}</td>
          </tr>
          <tr>
            <td><strong>${t.headTeacherComments}</strong></td>
            <td colspan="3">${escapeHtml(getCommentValue(comments, 'mkuu_shule'))}</td>
          </tr>
          <tr>
            <td><strong>${t.headTeacherSignature}</strong></td>
            <td class="authority-signature">
              ${authoritySignatureCellHtml}
            </td>
            <td><strong>${t.date}</strong></td>
            <td class="authority-date">${escapeHtml(formatAuthorityDate(authorityData))}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="report-section section-maoni">
      <h3>${t.generalComments}</h3>
      <table class="excel-table general-comments maoni-table">
        <tbody>
          <tr class="maoni-taaluma-row">
            <td class="maoni-label"><strong>${t.studies}</strong></td>
            <td class="maoni-content">${escapeHtml(getCommentValue(comments, 'taaluma'))}</td>
          </tr>
          <tr>
            <td class="maoni-label"><strong>${t.service}</strong></td>
            <td class="maoni-content">${escapeHtml(getCommentValue(comments, 'huduma'))}</td>
          </tr>
          <tr>
            <td class="maoni-label"><strong>${t.sports}</strong></td>
            <td class="maoni-content">${escapeHtml(getCommentValue(comments, 'michezo'))}</td>
          </tr>
          <tr class="maoni-tabia-row">
            <td class="maoni-label"><strong>${t.conduct}</strong></td>
            <td class="maoni-content">${escapeHtml(getCommentValue(comments, 'tabia'))}</td>
          </tr>
          <tr>
            <td class="maoni-label"><strong>${t.health}</strong></td>
            <td class="maoni-content">${escapeHtml(getCommentValue(comments, 'sala'))}</td>
          </tr>
          <tr>
            <td class="maoni-label"><strong>${t.feesDue}</strong></td>
            <td class="maoni-content">${escapeHtml(studentFeesDebt || '0.00')}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="section-spacer-4px"></div>

    <div class="report-closing-block">
      <div class="report-section section-mambo">
        <h3>${t.notes}</h3>
        <div class="instructions">
          ${instructions}
        </div>
      </div>

      <div class="signature-stamp-section">
        <div class="signature-block">
          ${authoritySignatureBlockHtml}
          <div class="signature-line">_________________________</div>
          <div class="signature-name">${escapeHtml(authorityData?.name || '')}</div>
          <div class="signature-title">${escapeHtml(authorityData?.title || '')}</div>
          <div class="signature-date">${t.dateShort} ${escapeHtml(formatAuthorityDate(authorityData))}</div>
        </div>
        <div class="stamp-block">
          ${schoolStamp?.stamp_image_path ? `<img src="${getImageUrl(staticOrigin, schoolStamp.stamp_image_path)}" alt="School Stamp" class="stamp-img" />` : '<div class="school-stamp"><div class="stamp-border"><div class="stamp-content"><div class="stamp-text-top">ARUSHA CATHOLIC</div><div class="stamp-motto">SEMINARY</div><div class="stamp-text-bottom">OLDONYOSAMBU</div></div></div></div>'}
        </div>
      </div>
    </div>
    ${REPORT_INNER_END}
  </div>
</body>
</html>`;

  return html;
}

/** Extract the report-container markup (between markers) from a full document. */
function extractReportInnerHtml(fullHtml) {
  const s = fullHtml.indexOf(REPORT_INNER_START);
  const e = fullHtml.indexOf(REPORT_INNER_END);
  if (s !== -1 && e !== -1 && e > s) {
    return fullHtml.slice(s + REPORT_INNER_START.length, e).trim();
  }
  const bodyMatch = fullHtml.match(/<body>([\s\S]*?)<\/body>/);
  if (bodyMatch && bodyMatch[1]) return bodyMatch[1].trim();
  return fullHtml;
}

/**
 * Combine many continuing reports into ONE HTML document with page breaks,
 * mirroring how the O-Level bulk report is rendered.
 * @param {Array<Object>} reportDataList
 * @param {Object} [options]
 * @returns {Promise<string>}
 */
async function buildPreFormOneContinuingBulkHtml(reportDataList, options = {}) {
  const { lang = 'sw' } = options;
  const language = normalizeReportLanguage(lang);
  const t = getReportDictionary(language);
  const cssContent = await getCSSContent();

  const innerBlocks = [];
  for (const [index, data] of (reportDataList || []).entries()) {
    const fullHtml = await generatePreFormOneContinuingReportHtml(data, { ...options, lang: language });
    // Page break before every report after the first. The O-Level bulk header CSS
    // already keeps the logo/photo on every report (flex+absolute breaks after page 1).
    const breakBefore = index > 0 ? ' style="page-break-before: always;"' : '';
    innerBlocks.push(`<div class="report-container"${breakBefore}>${extractReportInnerHtml(fullHtml)}</div>`);
  }

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <title>${language === 'en' ? 'Pre-Form One Continuing Reports' : 'Ripoti za Kuendelea za Pre-Form One'}</title>
  ${HEAD_FONT_LINKS}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <style>
    ${cssContent}
    ${buildContinuingTableCss()}
    .report-container .school-info h1,
    .report-container .school-info h2,
    .report-container .contact-info p,
    .report-container .report-section h3 {
      color: #000000 !important;
      font-weight: bold !important;
    }
    ${BULK_MULTI_PAGE_HEADER_CSS}
  </style>
</head>
<body class="bulk-pdf-document">
  ${innerBlocks.join('\n')}
</body>
</html>`;
}

module.exports = {
  generatePreFormOneContinuingReportHtml,
  buildPreFormOneContinuingBulkHtml,
  COURSE_ASSESSMENT_LABEL,
  CLASS_LABEL,
  CONTINUING_TERM,
  getContinuingReportMonth,
};
