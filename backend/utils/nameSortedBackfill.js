const { sortByName } = require('./studentPhotoBackfill');

function normalizeTerm(term) {
  const t = String(term || '').trim();
  if (/^Term\s+I$/i.test(t) || /^First\s+Term$/i.test(t)) return 'First Term';
  if (/^Term\s+II$/i.test(t) || /^Second\s+Term$/i.test(t)) return 'Second Term';
  return t || null;
}

function isFormVOrVI(level) {
  const l = String(level || '').trim().toUpperCase();
  return l === 'FORM V' || l === 'FORM VI';
}

/**
 * Build the name-sorted roster the app used when it assigned student_index
 * for comments/tabia/parishes/debt.
 *
 * IMPORTANT: the app's roster comes from SQL ordered by
 *   first_name ASC, middle_name ASC NULLS LAST, surname ASC
 * (`routes/students.js` and the parish endpoint). A JavaScript sort is not a
 * faithful substitute: NULL middle names and collation differences can change
 * the order. Callers that already fetched rows with that ORDER BY must pass
 * `{ presorted: true }` so the SQL order is preserved exactly. Filtering below
 * never reorders, so a presorted input stays in SQL order.
 *
 * Do not filter by status: the app's roster endpoint does not, so a student
 * whose status changed after the data was entered still occupies their slot.
 */
function buildRoster(allStudents, level, stream, year, term, options = {}) {
  const vOrVi = isFormVOrVI(level);
  const streamKey = String(stream || '').trim().toUpperCase();
  const combinedANa = streamKey === 'A' || streamKey === 'NA';

  let filtered = allStudents.filter((s) => {
    if (String(s.level || '').trim().toUpperCase() !== String(level || '').trim().toUpperCase()) return false;
    if (parseInt(s.year, 10) !== parseInt(year, 10)) return false;
    const sStream = String(s.stream || '').trim().toUpperCase();
    if (combinedANa) {
      if (sStream !== 'A' && sStream !== 'NA') return false;
    } else if (sStream !== streamKey) {
      return false;
    }
    return true;
  });

  const normTerm = normalizeTerm(term);
  if (vOrVi && normTerm) {
    filtered = filtered.filter((s) => normalizeTerm(s.term) === normTerm);
  }

  // The parish endpoint builds its roster with SELECT adm_no ... ORDER BY name
  // and then drops repeated adm_no values (FORM V/VI students have one row per
  // term but parishes are stored per class, not per term). Callers that mirror
  // that endpoint must request the same de-duplication.
  if (options.dedupeByAdmNo) {
    const seen = new Set();
    filtered = filtered.filter((s) => {
      const key = String(s.adm_no ?? '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return options.presorted ? filtered : sortByName(filtered);
}

function admNoForIndex(roster, studentIndex) {
  const idx = parseInt(studentIndex, 10);
  if (Number.isNaN(idx) || idx < 0 || idx >= roster.length) return null;
  return roster[idx]?.adm_no || null;
}

module.exports = { normalizeTerm, isFormVOrVI, buildRoster, admNoForIndex, sortByName };
