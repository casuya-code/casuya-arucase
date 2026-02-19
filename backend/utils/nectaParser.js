/**
 * Parse NECTA result page HTML into candidates and subject grades.
 * Handles common table layouts: No, Candidate No, Name, [subject columns], Division, Points.
 */
const cheerio = require('cheerio');

// Column headers that are not subjects (skip for grade columns)
const NON_SUBJECT_HEADERS = new Set([
  'NO', 'SNO', 'S/NO', '#', 'NUMBER', 'CANDIDATE NO', 'CANDIDATE NO.', 'CANDIDATE',
  'NAME', 'CANDIDATE NAME', 'SEX', 'GENDER', 'DIV', 'DIVISION', 'POINTS', 'TOTAL',
  'TOT', 'TOTAL POINTS', 'REGIST', 'REGISTRATION', 'CENTRE', 'SCHOOL'
]);

function normalizeHeader(text) {
  return (text || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * @param {string} html - NECTA result page HTML
 * @returns {{ candidates: Array<{ candidate_no: string, candidate_name: string, sex: string, division: string, points: number|null, grades: Array<{ subject_name: string, grade: string }> }> }}
 */
function parseNectaResultsTable(html) {
  const $ = cheerio.load(html);
  const candidates = [];
  let headerRow = [];
  let subjectColIndexes = []; // [{ index, name }]

  $('table').each((_, table) => {
    const rows = $(table).find('tr');
    if (rows.length < 2) return;

    rows.each((rowIdx, row) => {
      const cells = $(row).find('td, th');
      const cellTexts = cells.map((_, c) => $(c).text().trim()).get();

      if (cellTexts.length < 3) return;

      // Detect header row: first row, or any row that looks like column headers (NO, NAME, DIVISION, etc.)
      const normalized = cellTexts.map(normalizeHeader);
      const looksLikeHeader = normalized.some(h => h === 'NO' || h === 'S/NO' || h === 'NAME' || h === 'DIVISION' || (h && h.includes('CANDIDATE')));
      const isFirstRow = rowIdx === 0;
      if (isFirstRow || (headerRow.length === 0 && looksLikeHeader)) {
        const noIdx = normalized.findIndex(h => h === 'NO' || h === 'S/NO' || h === 'SNO' || h === '#');
        const candNoIdx = normalized.findIndex(h => h.includes('CANDIDATE') && (h.includes('NO') || h === 'CANDIDATE'));
        const nameIdx = normalized.findIndex(h => h === 'NAME' || h.includes('CANDIDATE NAME'));
        const sexIdx = normalized.findIndex(h => h === 'SEX' || h === 'GENDER');
        const divIdx = normalized.findIndex(h => h === 'DIV' || h === 'DIVISION');
        const pointsIdx = normalized.findIndex(h => h === 'POINTS' || h === 'TOTAL' || h === 'TOT');

        const numCol = noIdx >= 0 ? noIdx : 0;
        const candNoCol = candNoIdx >= 0 ? candNoIdx : (numCol + 1);
        const nameCol = nameIdx >= 0 ? nameIdx : (candNoCol + 1);
        const sexCol = sexIdx >= 0 ? sexIdx : nameCol + 1;
        const divCol = divIdx >= 0 ? divIdx : cellTexts.length - 2;
        const pointsCol = pointsIdx >= 0 ? pointsIdx : cellTexts.length - 1;

        headerRow = normalized;
        subjectColIndexes = [];
        normalized.forEach((h, i) => {
          if (i !== numCol && i !== candNoCol && i !== nameCol && i !== sexCol && i !== divCol && i !== pointsCol) {
            if (h && !NON_SUBJECT_HEADERS.has(h) && h.length <= 20) {
              subjectColIndexes.push({ index: i, name: cellTexts[i]?.trim() || h });
            }
          }
        });
        return;
      }

      // Data row: must have at least candidate no or name
      const candNo = (cellTexts[headerRow.findIndex(h => h.includes('CANDIDATE') && h.includes('NO'))] ?? cellTexts[1] ?? '').trim();
      const name = (cellTexts[headerRow.findIndex(h => h === 'NAME' || h.includes('NAME'))] ?? cellTexts[2] ?? '').trim();
      const div = (cellTexts[headerRow.findIndex(h => h === 'DIV' || h === 'DIVISION')] ?? cellTexts[cellTexts.length - 2] ?? '').trim();
      const pointsRaw = (cellTexts[headerRow.findIndex(h => h === 'POINTS' || h === 'TOTAL')] ?? cellTexts[cellTexts.length - 1] ?? '').trim();
      const points = parseInt(pointsRaw, 10);
      const sex = (cellTexts[headerRow.findIndex(h => h === 'SEX' || h === 'GENDER')] ?? '').trim();

      // Skip summary/total rows
      if (!name && !candNo) return;
      const firstUpper = (name || candNo || '').toUpperCase();
      if (['TOTAL', 'TOT', 'T', 'SUMMARY'].includes(firstUpper) || /^\d+$/.test(name)) return;

      const grades = [];
      subjectColIndexes.forEach(({ index, name: subjName }) => {
        const g = (cellTexts[index] ?? '').trim();
        if (g && subjName) grades.push({ subject_name: subjName, grade: g });
      });

      // If we didn't detect header, guess columns: 0=no, 1=candNo, 2=name, 3..n-2=subjects, n-1=div, n=points
      if (grades.length === 0 && cellTexts.length >= 5) {
        for (let i = 3; i < cellTexts.length - 2; i++) {
          const g = (cellTexts[i] ?? '').trim();
          if (g && (['I', 'II', 'III', 'IV', '0', 'F', 'A', 'B', 'C', 'D', 'E', '1', '2', '3', '4', '5', '6', '7'].includes(g) || g.length <= 3)) {
            grades.push({ subject_name: 'Subject' + (i - 2), grade: g });
          }
        }
      }

      candidates.push({
        candidate_no: candNo || String(candidates.length + 1),
        candidate_name: name || '',
        sex: sex || '',
        division: div || '',
        points: Number.isNaN(points) ? null : points,
        grades
      });
    });

    if (candidates.length > 0) return false; // break
  });

  return { candidates };
}

module.exports = { parseNectaResultsTable };
