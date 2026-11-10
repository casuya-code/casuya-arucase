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
 */
function buildRoster(allStudents, level, stream, year, term) {
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
    filtered = filtered.filter((s) => String(s.status || '').toUpperCase() !== 'PROMOTED');
  }

  return sortByName(filtered);
}

function admNoForIndex(roster, studentIndex) {
  const idx = parseInt(studentIndex, 10);
  if (Number.isNaN(idx) || idx < 0 || idx >= roster.length) return null;
  return roster[idx]?.adm_no || null;
}

module.exports = { normalizeTerm, isFormVOrVI, buildRoster, admNoForIndex, sortByName };
