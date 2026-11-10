/**
 * Generate a human-review CSV for FORM V/VI student_parishes.
 *
 * student_parishes has no term column, but FORM V/VI rosters are term-scoped in
 * the app. When those rows were backfilled, the roster was built without a term
 * filter, so the stored adm_no may be wrong for some rows. This script does not
 * change data: it lists each row together with the candidate student implied by
 * every term roster, so the school can confirm against source records.
 *
 * Run: node scripts/generateParishReviewCsv.js [--out=path/to/file.csv]
 */
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const { sortByName } = require('../utils/studentPhotoBackfill');

const LEVELS = ['FORM V', 'FORM VI'];
const DEFAULT_OUT = path.join(
  __dirname,
  '..',
  'reports',
  `form_v_vi_parish_review_${new Date().toISOString().slice(0, 10)}.csv`
);

const TERM_RANK = { 'First Term': 1, 'Second Term': 2, 'Third Term': 3 };
const norm = (v) => String(v ?? '').trim().toUpperCase();

function termRank(term) {
  return TERM_RANK[String(term || '').trim()] || 99;
}

function fullName(row) {
  return [row.first_name, row.middle_name, row.surname]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(' ');
}

function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(values) {
  return values.map(csvCell).join(',');
}

async function buildRows() {
  const classes = await query(
    `SELECT DISTINCT level, stream, year
     FROM student_parishes
     WHERE level = ANY($1::text[])
     ORDER BY level, stream, year`,
    [LEVELS]
  );

  const output = [];
  const summary = { total: 0, matches: 0, differs: 0, ambiguous: 0, unverifiable: 0 };

  for (const c of classes.rows) {
    const studentsRes = await query(
      `SELECT adm_no, first_name, middle_name, surname, term, stream
       FROM students
       WHERE level = $1 AND year = $2
       ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC`,
      [c.level, c.year]
    );

    const inClass = studentsRes.rows.filter((s) => norm(s.stream) === norm(c.stream));
    const allTermRoster = sortByName(inClass);
    const studentByAdmNo = new Map();
    for (const student of studentsRes.rows) {
      if (!studentByAdmNo.has(String(student.adm_no))) {
        studentByAdmNo.set(String(student.adm_no), student);
      }
    }

    const byTerm = new Map();
    for (const student of inClass) {
      const term = String(student.term || '').trim() || '(no term)';
      if (!byTerm.has(term)) byTerm.set(term, []);
      byTerm.get(term).push(student);
    }
    const termRosters = [...byTerm.entries()]
      .sort((a, b) => termRank(a[0]) - termRank(b[0]))
      .map(([term, list]) => ({ term, roster: sortByName(list) }));
    const termsLabel = termRosters.map((t) => t.term).join(' / ');

    const rowsRes = await query(
      `SELECT p.id, p.adm_no, p.parish_name
       FROM student_parishes p
       WHERE p.level = $1 AND p.stream = $2 AND p.year = $3
       ORDER BY p.id`,
      [c.level, c.stream, c.year]
    );

    for (const row of rowsRes.rows) {
      summary.total += 1;
      const current = String(row.adm_no);
      const currentStudent = studentByAdmNo.get(current) || {};

      // Invert the all-term mapping the backfill used to recover the original index.
      const index = allTermRoster.findIndex((s) => String(s.adm_no) === current);
      const candidates = [];
      for (const { term, roster } of termRosters) {
        if (index >= 0 && index < roster.length) {
          candidates.push({ term, student: roster[index] });
        }
      }

      const uniqueCandidates = new Map();
      for (const { student } of candidates) {
        uniqueCandidates.set(String(student.adm_no), student);
      }

      let status;
      let suggested = null;
      if (index < 0) {
        status = 'index-not-verifiable';
        summary.unverifiable += 1;
      } else if (uniqueCandidates.size === 0) {
        status = 'index-not-verifiable';
        summary.unverifiable += 1;
      } else if (uniqueCandidates.size > 1) {
        status = 'ambiguous';
        summary.ambiguous += 1;
      } else {
        suggested = [...uniqueCandidates.values()][0];
        if (String(suggested.adm_no) === current) {
          status = 'matches-current';
          summary.matches += 1;
        } else {
          status = 'differs-from-current';
          summary.differs += 1;
        }
      }

      output.push({
        adm_no: current,
        first_name: currentStudent.first_name,
        middle_name: currentStudent.middle_name,
        surname: currentStudent.surname,
        level: c.level,
        stream: c.stream,
        year: c.year,
        terms: termsLabel,
        current_parish: row.parish_name,
        candidate_by_term: candidates
          .map(({ term, student }) => `${term}: ${student.adm_no} (${fullName(student)})`)
          .join(' | '),
        suggested_adm_no: suggested ? suggested.adm_no : '',
        suggested_name: suggested ? fullName(suggested) : '',
        status,
        review_decision: '',
      });
    }
  }

  return { output, summary };
}

async function run() {
  const outArg = process.argv.find((arg) => arg.startsWith('--out='));
  const outPath = outArg ? outArg.slice('--out='.length) : DEFAULT_OUT;

  const { output, summary } = await buildRows();

  const headers = [
    'adm_no',
    'first_name',
    'middle_name',
    'surname',
    'level',
    'stream',
    'year',
    'terms',
    'current_parish',
    'candidate_by_term',
    'suggested_adm_no',
    'suggested_name',
    'status',
    'review_decision',
  ];

  const lines = [csvRow(headers)];
  for (const row of output) {
    lines.push(csvRow(headers.map((h) => row[h])));
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${lines.join('\r\n')}\r\n`, 'utf8');

  console.log(`Wrote ${output.length} FORM V/VI parish rows to ${outPath}`);
  console.log(
    `  matches-current: ${summary.matches}, differs-from-current: ${summary.differs}, ` +
    `ambiguous: ${summary.ambiguous}, unverifiable: ${summary.unverifiable}`
  );
  console.log('Review review_decision for each row before applying any change.');
}

run()
  .then(() => process.exit(process.exitCode || 0))
  .catch((e) => {
    console.error('Parish review export failed:', e.message);
    process.exit(1);
  });
