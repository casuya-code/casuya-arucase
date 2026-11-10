/**
 * Pure helpers for backfilling monthly_results.adm_no.
 *
 * monthly_results used to be keyed by student_index — a position in the class
 * roster returned by Postgres `ORDER BY adm_no`. That order is lexicographic:
 * '11754' sorts before '1711'. Sorting numerically changes the mapping whenever
 * admission numbers have different lengths, so this helper must stay
 * lexicographic to match the app.
 */
function sortByAdmNo(students) {
  return [...students].sort((a, b) =>
    String(a.adm_no || '').localeCompare(String(b.adm_no || ''), undefined, { sensitivity: 'base' })
  );
}

// Derive canonical term label from assessment month (mirrors routes/students.js).
function getTermFromMonth(month, level) {
  const monthStr = String(month || '').trim();
  const normalizedLevel = String(level || '').trim().toUpperCase();
  const isFormVOrVI = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';
  const firstTermMonths = isFormVOrVI
    ? ['August', 'September', 'October', 'November']
    : ['February', 'March', 'April', 'May'];
  const secondTermMonths = isFormVOrVI
    ? ['February', 'March', 'April', 'May']
    : ['August', 'September', 'October', 'November'];

  if (firstTermMonths.includes(monthStr)) return 'First Term';
  if (secondTermMonths.includes(monthStr)) return 'Second Term';
  return null;
}

/**
 * Build the roster the app used when it calculated monthly_results for a class.
 *
 * The app's monthly-results query:
 *  - stream === 'ALL': all students for level/year (term-filtered for FORM V/VI)
 *  - FORM I-IV stream A/NA: students of stream A/NA combined
 *  - otherwise: students of exactly that stream
 * ...always sorted by adm_no.
 *
 * @param {Array} studentsInClass - all students for the level/year (any stream/term)
 * @param {string} level
 * @param {string} stream - the monthly_results stream value
 * @param {string} month
 * @param {boolean} isFormVOrVI
 * @returns {{ roster: Array, term: string|null }}
 */
function buildRoster(studentsInClass, level, stream, month, isFormVOrVI) {
  const normalizedLevel = String(level || '').trim().toUpperCase();
  const formVOrVI = isFormVOrVI || normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';
  const streamKey = String(stream || '').trim().toUpperCase();
  const isAll = streamKey === 'ALL';
  const isFormIToIV = /^FORM\s+(I|II|III|IV)$/i.test(normalizedLevel);

  let filtered = studentsInClass;
  let term = null;

  if (formVOrVI) {
    term = getTermFromMonth(month, level);
    if (term) {
      filtered = filtered.filter((s) => String(s.term || '').trim() === term);
    }
    filtered = filtered.filter((s) => String(s.status || '').toUpperCase() !== 'PROMOTED');
  }

  if (!isAll) {
    if (isFormIToIV && (streamKey === 'A' || streamKey === 'NA')) {
      filtered = filtered.filter((s) => {
        const st = String(s.stream || '').trim().toUpperCase();
        return st === 'A' || st === 'NA';
      });
    } else {
      filtered = filtered.filter((s) => String(s.stream || '').trim().toUpperCase() === streamKey);
    }
  }

  return { roster: sortByAdmNo(filtered), term };
}

/**
 * Map a monthly_results row's student_index to an adm_no using the roster.
 * Returns null when the index is out of range (orphaned/legacy row).
 */
function admNoForIndex(roster, studentIndex) {
  const idx = parseInt(studentIndex, 10);
  if (Number.isNaN(idx) || idx < 0 || idx >= roster.length) return null;
  return roster[idx]?.adm_no || null;
}

module.exports = {
  sortByAdmNo,
  getTermFromMonth,
  buildRoster,
  admNoForIndex,
};
