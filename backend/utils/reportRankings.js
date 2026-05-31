/**
 * Report ranking utilities.
 * Form V/VI: subject nafasi among all students taking that subject across combinations;
 * overall nafasi among all students in the form level (same term).
 * Form I–IV: rankings stay within the class stream (unchanged).
 */

const combinationSubjects = {
  PCB: ['PHY', 'CHE', 'BIO', 'BAM', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
  PCM: ['PHY', 'CHE', 'MAT', 'MATH', 'MATHEMATICS', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
  CBG: ['CHE', 'BIO', 'GEO', 'BAM', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
  PGM: ['PHY', 'GEO', 'MAT', 'MATH', 'MATHEMATICS', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
  HGE: ['HIS', 'GEO', 'ECO', 'BAM', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
  HKL: ['HIS', 'KIS', 'ENG', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
  HGK: ['HIS', 'GEO', 'KIS', 'BAM', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
  EGM: ['ECO', 'GEO', 'MAT', 'MATH', 'MATHEMATICS', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
  HGL: ['HIS', 'GEO', 'ENG', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
};

function normalizeTermForRanking(termParam) {
  if (!termParam) return 'First Term';
  const t = String(termParam).trim();
  if (/^Term\s+I$/i.test(t) || /^Term\s+1$/i.test(t)) return 'First Term';
  if (/^Term\s+II$/i.test(t) || /^Term\s+2$/i.test(t)) return 'Second Term';
  if (/^First\s+Term$/i.test(t)) return 'First Term';
  if (/^Second\s+Term$/i.test(t)) return 'Second Term';
  return t;
}

function isFormVOrVIForm(form) {
  const formCode = String(form || '').replace(/^FORM\s+/i, '').trim();
  return ['V', 'VI', '5', '6'].includes(formCode);
}

function isScoreValid(score) {
  return score !== null && score !== undefined && score !== '' && score !== '-';
}

function doesCombinationTakeSubject(combination, subjectCode) {
  if (!combination || !subjectCode) return false;
  const subjects = combinationSubjects[combination];
  if (!subjects) return false;
  const subjectUpper = String(subjectCode).toUpperCase();
  return subjects.some((s) => {
    const sUpper = s.toUpperCase();
    if (subjectUpper.includes(sUpper) || sUpper.includes(subjectUpper)) {
      return true;
    }
    const subjectKeywords = ['MAT', 'MATH', 'MATHEMATICS', 'APPLIED'];
    if (sUpper === 'MAT' && subjectKeywords.some((kw) => subjectUpper.includes(kw))) {
      return true;
    }
    return false;
  });
}

function subjectCodesToMatch(subject) {
  return [subject.subject_code, subject.subject_abbreviation].filter(Boolean);
}

function findScoreRow(rows, admNo, codesToMatch, month) {
  return rows.find(
    (r) => r.adm_no === admNo && codesToMatch.includes(r.subject_code) && r.month === month
  );
}

function computeSubjectWeightedAverage(rows, admNo, codesToMatch, months, monthWeights) {
  let total = 0;
  let validMonths = 0;
  months.forEach((month) => {
    const result = findScoreRow(rows, admNo, codesToMatch, month);
    if (result && isScoreValid(result.score)) {
      const weight = monthWeights[month] || 0;
      total += parseFloat(result.score) * (weight / 100);
      validMonths++;
    }
  });
  return { average: validMonths > 0 ? total / validMonths : 0, validMonths };
}

function sortAndRank(entries) {
  return Object.entries(entries)
    .sort((a, b) => {
      const scoreDiff = b[1] - a[1];
      if (scoreDiff !== 0) return scoreDiff;
      return String(a[0]).localeCompare(String(b[0]));
    })
    .map((entry, index) => ({ adm_no: entry[0], rank: index + 1 }));
}

/**
 * Load students and score rows used for ranking.
 */
async function loadRankingCohort(query, {
  form,
  yearNum,
  months,
  normalizedTerm,
  isFormVOrVI,
  actualStream,
  normalizedStream,
}) {
  if (isFormVOrVI) {
    const allStudentsResult = await query(
      'SELECT adm_no, stream FROM students WHERE level = $1 AND year = $2 AND term = $3',
      [form, yearNum, normalizedTerm]
    );
    const allMonthlyResults = await query(
      `SELECT i.* FROM individual_scores i
       INNER JOIN students s ON i.adm_no = s.adm_no
       WHERE i.level = $1 AND i.year = $2 AND i.month = ANY($3::text[])
       AND s.term = $4`,
      [form, yearNum, months, normalizedTerm]
    );
    const subjectsByStreamResult = await query(
      'SELECT stream, subject_code, subject_abbreviation FROM subjects WHERE level = $1 AND year = $2 ORDER BY subject_code',
      [form, yearNum]
    );
    const subjectsByStream = {};
    subjectsByStreamResult.rows.forEach((row) => {
      const streamKey = row.stream;
      if (!subjectsByStream[streamKey]) subjectsByStream[streamKey] = [];
      subjectsByStream[streamKey].push(row);
    });
    return {
      rankingStudents: allStudentsResult.rows,
      rankingScores: allMonthlyResults.rows,
      subjectsByStream,
    };
  }

  const allStudentsResult = await query(
    'SELECT adm_no, stream FROM students WHERE level = $1 AND stream IN ($2, $3) AND year = $4',
    [form, actualStream, normalizedStream, yearNum]
  );
  const allMonthlyResults = await query(
    'SELECT * FROM individual_scores WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = ANY($5::text[])',
    [form, actualStream, normalizedStream, yearNum, months]
  );
  return {
    rankingStudents: allStudentsResult.rows,
    rankingScores: allMonthlyResults.rows,
    subjectsByStream: null,
  };
}

/**
 * Compute subject and overall rankings for a student report.
 */
function computeReportRankings({
  form,
  admNo,
  reportSubjects,
  rankingStudents,
  rankingScores,
  subjectsByStream,
  months,
  monthWeights,
  isFormVOrVI,
}) {
  const subjectRankings = {};

  reportSubjects.forEach((subject) => {
    const codesToMatch = subjectCodesToMatch(subject);
    const subjectTotals = {};

    rankingStudents.forEach((student) => {
      if (isFormVOrVI && !doesCombinationTakeSubject(student.stream, subject.subject_code)) {
        return;
      }
      const { average } = computeSubjectWeightedAverage(
        rankingScores,
        student.adm_no,
        codesToMatch,
        months,
        monthWeights
      );
      subjectTotals[student.adm_no] = average;
    });

    const sorted = sortAndRank(subjectTotals);
    subjectRankings[subject.subject_code] = {};
    sorted.forEach((item) => {
      subjectRankings[subject.subject_code][item.adm_no] = item.rank;
    });
  });

  const overallTotals = {};
  rankingStudents.forEach((student) => {
    let grandTotal = 0;
    let validSubjects = 0;

    const studentSubjects = isFormVOrVI
      ? (subjectsByStream?.[student.stream] || [])
      : reportSubjects;

    studentSubjects.forEach((subject) => {
      const codesToMatch = subjectCodesToMatch(subject);
      const { average, validMonths } = computeSubjectWeightedAverage(
        rankingScores,
        student.adm_no,
        codesToMatch,
        months,
        monthWeights
      );
      if (validMonths > 0) {
        grandTotal += average;
        validSubjects++;
      }
    });

    if (validSubjects > 0) {
      overallTotals[student.adm_no] = grandTotal / validSubjects;
    }
  });

  const sortedOverall = sortAndRank(overallTotals);
  const overallRank = sortedOverall.find((item) => item.adm_no === admNo)?.rank || '-';

  return {
    subjectRankings,
    overallRank,
    totalStudents: rankingStudents.length,
  };
}

/**
 * Fetch cohort data and compute rankings (convenience wrapper for report endpoints).
 */
async function getReportRankings(query, options) {
  const {
    form,
    yearNum,
    months,
    normalizedTerm,
    actualStream,
    normalizedStream,
    admNo,
    reportSubjects,
  } = options;

  const isFormVOrVI = isFormVOrVIForm(form);
  const dbTerm = normalizeTermForRanking(normalizedTerm);
  const { rankingStudents, rankingScores, subjectsByStream } = await loadRankingCohort(query, {
    form,
    yearNum,
    months,
    normalizedTerm: dbTerm,
    isFormVOrVI,
    actualStream,
    normalizedStream,
  });

  return computeReportRankings({
    form,
    admNo,
    reportSubjects,
    rankingStudents,
    rankingScores,
    subjectsByStream,
    months,
    monthWeights: options.monthWeights || {},
    isFormVOrVI,
  });
}

module.exports = {
  isFormVOrVIForm,
  doesCombinationTakeSubject,
  normalizeTermForRanking,
  loadRankingCohort,
  computeReportRankings,
  getReportRankings,
};
