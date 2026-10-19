/**
 * Pure helpers for backfilling student_photos.adm_no
 * (see scripts/linkStudentPhotosToAdmNo.js).
 *
 * Photos used to be stored against student_index — a position in the alphabetically
 * sorted class list. To recover who each photo belongs to we replay that same ordering.
 */

const TERM_ORDER = { 'First Term': 1, 'Second Term': 2, 'Third Term': 3 };

function nameSortKey(student) {
  return [
    String(student.first_name || '').toLowerCase().trim(),
    String(student.middle_name || '').toLowerCase().trim(),
    String(student.surname || '').toLowerCase().trim(),
  ];
}

/** Replicates the app's name ordering (PhotoManagement / report index). */
function sortByName(students) {
  return [...students].sort((a, b) => {
    const ka = nameSortKey(a);
    const kb = nameSortKey(b);
    for (let i = 0; i < ka.length; i += 1) {
      const cmp = ka[i].localeCompare(kb[i], undefined, { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

function termRank(term) {
  return TERM_ORDER[String(term || '').trim()] || 0;
}

function classKey(row) {
  return `${row.level}|${row.stream}|${row.year}`;
}

/**
 * Choose the roster that photos in this class were most likely uploaded against.
 *
 * FORM I-IV hold one row per student, so the choice is trivial. FORM V/VI hold one row
 * per *term* while photos carry no term — the index alone cannot identify it — so we
 * pick the smallest term roster that can still hold the deepest photo index (latest
 * term wins ties) and flag the class as ambiguous when more than one roster fits.
 *
 * @returns {{ roster: Array|null, term: string|null, ambiguous: boolean }}
 */
function selectRoster(studentsInClass, maxIdx) {
  const byTerm = new Map();
  for (const student of studentsInClass) {
    const term = String(student.term || '').trim();
    if (!byTerm.has(term)) byTerm.set(term, []);
    byTerm.get(term).push(student);
  }

  if (byTerm.size <= 1) {
    const term = [...byTerm.keys()][0] || null;
    return { roster: sortByName(studentsInClass), term, ambiguous: false };
  }

  const candidates = [...byTerm.entries()]
    .map(([term, list]) => ({ term, roster: sortByName(list) }))
    .filter((candidate) => candidate.roster.length > maxIdx)
    .sort((a, b) => (
      a.roster.length - b.roster.length || termRank(b.term) - termRank(a.term)
    ));

  if (candidates.length === 0) {
    return { roster: null, term: null, ambiguous: true };
  }

  return { ...candidates[0], ambiguous: candidates.length > 1 };
}

module.exports = {
  classKey,
  nameSortKey,
  sortByName,
  termRank,
  selectRoster,
};
